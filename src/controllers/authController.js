const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('../db/index'); 
const authValidator = require('../validators/authValidators'); // Ruta del validador corregida
const locationController = require('./locationController')

// Configuración de Nodemailer usando las variables de entorno
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

// --- Función de Recuperación de Cuenta (Solicitud) ---
exports.forgotPassword = async (req, res) => {
    // Validar con Joi
    const { error } = authValidator.forgotPasswordSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }
    
    const { email } = req.body;
    try {
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'Si el correo existe, se ha enviado un enlace para restablecer la contraseña.' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const expires = new Date(Date.now() + 3600000);

        await db.query('UPDATE usuarios SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3', 
            [token, expires, user.id]);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Restablecimiento de Contraseña',
            html: `<p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar: <a href="http://localhost:3000/reset-password/${token}">Restablecer Contraseña</a></p>`,
        };

        await transporter.sendMail(mailOptions);

        const mailOptionsNotify = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Solicitud de restablecimiento de contraseña',
        html: `
       
        <p>Has solicitado restablecer tu contraseña. Si no fuiste tú, ignora este mensaje.</p>
        <p>Si realizaste la solicitud, revisa el enlace de recuperación enviado.</p>
        `,
        };
        await transporter.sendMail(mailOptionsNotify);

        // Asigna userId y actionName para el registro de ubicación.
        req.body.userId = user.id;
        req.body.actionName = 'forgot_password_request'; 
        
        // Llama a la función para guardar la ubicación.
        locationController.saveLocationByIp(req, {});

        res.status(200).json({ message: 'Enlace de restablecimiento de contraseña enviado a tu correo.' });
    } catch (error) {
        console.error('Error en forgotPassword:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// --- Función de Recuperación de Cuenta (Actualización) ---
exports.resetPassword = async (req, res) => {
    // Validar con Joi
    const { error } = authValidator.resetPasswordSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }
    
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
        const result = await db.query('SELECT * FROM usuarios WHERE reset_password_token = $1 AND reset_password_expires > NOW()', [token]);
        
        if (result.rowCount === 0) {
            return res.status(400).json({ message: 'El token es inválido o ha expirado.' });
        }
        
        const user = result.rows[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.query('UPDATE usuarios SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2', 
            [hashedPassword, user.id]);

        // Asigna userId y actionName para el registro de ubicación.
        req.body.userId = user.id;
        req.body.actionName = 'password_reset';
        
        // Llama a la función para guardar la ubicación.
        locationController.saveLocationByIp(req, {});
        const mailOptionsNotify = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Contraseña actualizada correctamente',
        html: `
            <p>Tu contraseña ha sido cambiada correctamente.</p>
            <p>Si no realizaste este cambio, por favor contacta al soporte de inmediato.</p>
        `,
        };
        await transporter.sendMail(mailOptionsNotify);

        res.status(200).json({ message: 'Contraseña actualizada correctamente.' });

    } catch (error) {
        console.error('Error en resetPassword:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};
//login 
const speakeasy = require('speakeasy');

// --- Función de Login (con 2FA híbrido) ---
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Código de verificación por correo (válido solo si hay internet)
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 600000); // 10 minutos

        await db.query(
            'UPDATE usuarios SET verification_code = $1, verification_code_expires = $2 WHERE id = $3',
            [verificationCode, expires, user.id]
        );

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Código de verificación de inicio de sesión',
            html: `<p>Tu código de verificación es: <strong>${verificationCode}</strong></p><p>Este código expirará en 10 minutos.</p>`,
        };

        try {
            await transporter.sendMail(mailOptions);
            res.status(200).json({
                message: 'Se ha enviado un código de verificación a tu correo.',
                needsVerification: true,
                userId: user.id,
                method: 'email'
            });
        } catch (mailError) {
            console.warn("Fallo envío de correo, usar TOTP:", mailError.code);
            res.status(200).json({
                message: 'No se pudo enviar el correo. Usa tu aplicación de autenticación (TOTP).',
                needsVerification: true,
                userId: user.id,
                method: 'totp'
            });
        }

        // Asigna userId y actionName para el registro de ubicación.
        req.body.userId = user.id;
        req.body.actionName = 'password_reset';
        
        // Llama a la función para guardar la ubicación.
        locationController.saveLocationByIp(req, {});

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


// --- Función de Verificación del Código 2FA ---
exports.verifyCode = async (req, res) => {
    const { error } = authValidator.verifyCodeSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { userId, code } = req.body;

    try {
        const result = await db.query('SELECT * FROM usuarios WHERE id = $1', [userId]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ message: 'Usuario no encontrado.' });

        const now = new Date();

        // Verificar código de correo
        const codeIsValid =
            user.verification_code === code && user.verification_code_expires > now;

        // Verificar TOTP
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

        // Generar JWT
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Limpiar el código de correo si se usó
        if (codeIsValid) {
            await db.query(
                'UPDATE usuarios SET verification_code = NULL, verification_code_expires = NULL WHERE id = $1',
                [userId]
            );
        }

        const method = codeIsValid ? 'email' : 'totp';
        res.status(200).json({
            token,
            method,
            message: `Inicio de sesión exitoso con 2FA (${method}).`
        });

    } catch (error) {
        console.error('Error en verifyCode:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};