const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db/index'); 
const authValidator = require('../validators/authValidators');
const locationController = require('./locationController');
const transporter = require('../config/transporter'); // ← IMPORTACIÓN CORRECTA
const speakeasy = require('speakeasy');


// =============================
//   FORGOT PASSWORD (SOLICITUD)
// =============================
exports.forgotPassword = async (req, res) => {
    const { error } = authValidator.forgotPasswordSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const { email } = req.body;

    try {
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({
                message: 'Si el correo existe, se ha enviado un enlace para restablecer la contraseña.'
            });
        }

        // Crear token de recuperación
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: '20h'
        });

        const expires = new Date(Date.now() + 3600000*20);

        await db.query(
            'UPDATE usuarios SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
            [token, expires, user.id]
        );

        // Email principal con enlace
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Restablecimiento de Contraseña',
            html: `
                <p>Haz solicitado restablecer tu contraseña.</p>
                <p>Enlace: <a href="${process.env.URL}/reset-password/${token}">
                Restablecer Contraseña</a></p>
            `
        });

        // Email de notificación
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: 'Solicitud de restablecimiento',
            html: `
                <p>Si no solicitaste esto, ignora este mensaje.</p>
            `
        });

        // Registro de ubicación
        req.body.userId = user.id;
        req.body.actionName = 'forgot_password_request';
        locationController.saveLocationByIp(req, {});

        res.status(200).json({
            message: 'Enlace de restablecimiento enviado a tu correo.'
        });

    } catch (error) {
        console.error('Error en forgotPassword:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


// =============================
//   RESET PASSWORD
// =============================
exports.resetPassword = async (req, res) => {
    
    const { error } = authValidator.resetPasswordSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
        const result = await db.query(
            'SELECT * FROM usuarios WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
            [token]
        );

        if (result.rowCount === 0) {
            return res.status(400).json({ message: 'El token es inválido o ha expirado.' });
        }

        const user = result.rows[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.query(
            'UPDATE usuarios SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
            [hashedPassword, user.id]
        );

        // Registro de ubicación
        req.body.userId = user.id;
        req.body.actionName = 'password_reset';
        locationController.saveLocationByIp(req, {});

        // Email confirmación
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: 'Contraseña actualizada',
            html: `
                <p>Tu contraseña ha sido actualizada correctamente.</p>
            `
        });

        res.status(200).json({ message: 'Contraseña actualizada correctamente.' });

    } catch (error) {
        console.error('Error en resetPassword:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


// =============================
//   LOGIN con 2FA EMAIL/TOTP
// =============================
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Código email 2FA
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 600000);

        await db.query(
            'UPDATE usuarios SET verification_code = $1, verification_code_expires = $2 WHERE id = $3',
            [verificationCode, expires, user.id]
        );

        // Intentar enviar correo
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_FROM,
                to: user.email,
                subject: 'Código de verificación',
                html: `
                    <p>Tu código es:</p>
                    <h2>${verificationCode}</h2>
                    <p>Expira en 10 minutos.</p>
                `
            });

            res.status(200).json({
                message: 'Código enviado a tu correo.',
                needsVerification: true,
                userId: user.id,
                method: 'email'
            });

        } catch (mailError) {
            console.warn("No se envió correo, usar TOTP:", mailError.code);

            res.status(200).json({
                message: 'No se pudo enviar correo. Usa tu app 2FA (TOTP).',
                needsVerification: true,
                userId: user.id,
                method: 'totp'
            });
        }

        // Registro de ubicación
        req.body.userId = user.id;
        req.body.actionName = 'login';
        locationController.saveLocationByIp(req, {});

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


// =============================
//   VERIFICAR CÓDIGO 2FA
// =============================
exports.verifyCode = async (req, res) => {
    const { error } = authValidator.verifyCodeSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { userId, code } = req.body;

    try {
        const result = await db.query('SELECT * FROM usuarios WHERE id = $1', [userId]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ message: 'Usuario no encontrado.' });

        const now = new Date();

        // Verificación por correo
        const codeIsValid =
            user.verification_code === code &&
            user.verification_code_expires > now;

        // Verificación TOTP
        const totpIsValid = user.twofa_secret
            ? speakeasy.totp.verify({
                  secret: user.twofa_secret,
                  encoding: 'base32',
                  token: code,
                  window: 1
              })
            : false;

        if (!codeIsValid && !totpIsValid) {
            return res.status(401).json({ message: 'Código inválido o expirado.' });
        }

        await db.query('UPDATE usuarios SET is_logged_in = TRUE WHERE id = $1', [
            userId
        ]);

        // Generar JWT
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });

        // Borrar el código si se usó el de correo
        if (codeIsValid) {
            await db.query(
                'UPDATE usuarios SET verification_code = NULL, verification_code_expires = NULL WHERE id = $1',
                [userId]
            );
        }

        res.status(200).json({
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol
            },
            method: codeIsValid ? 'email' : 'totp',
            message: 'Inicio de sesión exitoso con 2FA.'
        });

    } catch (error) {
        console.error('Error en verifyCode:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


// =============================
//   LOGOUT
// =============================
exports.logout = async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(400).json({
            message: "No se pudo identificar al usuario desde el token."
        });
    }

    try {
        await db.query('UPDATE usuarios SET is_logged_in = FALSE WHERE id = $1', [
            userId
        ]);

        res.status(200).json({ message: 'Sesión cerrada exitosamente.' });

    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};
