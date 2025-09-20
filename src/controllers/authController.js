const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('../db/index'); 
const authValidator = require('../validators/authValidators'); // Ruta del validador corregida

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

        res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('Error en resetPassword:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};
const speakeasy = require('speakeasy');

exports.login = async (req, res) => {
    // Validar con Joi
    const { error } = authValidator.loginSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password, token } = req.body; // token = código TOTP de la app 2FA

    try {
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // --- Verificación 2FA ---
        if (!token) {
            return res.status(400).json({ message: 'Ingresa el código de la app 2FA.' });
        }

        const isValid = speakeasy.totp.verify({
            secret: user.twofa_secret,   // secreto guardado en la DB
            encoding: 'base32',
            token: token
        });

        if (!isValid) {
            return res.status(401).json({ message: 'Código 2FA incorrecto' });
        }

        // --- Generar JWT ---
        const jwtToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ token: jwtToken, message: 'Inicio de sesión exitoso.' });

    } catch (error) {
        console.error('Error en login 2FA:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// --- Función de Verificación del Código 2FA ---
exports.verifyCode = async (req, res) => {
    // Validar con Joi
    const { error } = authValidator.verifyCodeSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const { userId, code } = req.body;

    try {
        const result = await db.query('SELECT * FROM usuarios WHERE id = $1 AND verification_code = $2 AND verification_code_expires > NOW()', [userId, code]);
        
        if (result.rowCount === 0) {
            return res.status(401).json({ message: 'Código de verificación inválido o expirado.' });
        }

        const user = result.rows[0];
        
        await db.query('UPDATE usuarios SET verification_code = NULL, verification_code_expires = NULL WHERE id = $1', [userId]);

        const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ token, message: 'Inicio de sesión exitoso.' });
    } catch (error) {
        console.error('Error en verifyCode:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};