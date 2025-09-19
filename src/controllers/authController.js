const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('../db/index'); // Asegúrate de que esta sea la ruta correcta a tu conexión de BD

// Configuración de Nodemailer usando las variables de entorno
//modificar TLS para prod
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASS,
    },
    tls:{
        rejectUnauthorized: false
    }
});

// --- Función de Recuperación de Cuenta (Solicitud) ---
exports.forgotPassword = async (req, res) => {
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
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
        const result = await db.query('SELECT * FROM usuarios WHERE reset_password_token = $1 AND reset_password_expires > NOW()', [token]);
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ message: 'El token es inválido o ha expirado.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.query('UPDATE usuarios SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2', 
            [hashedPassword, user.id]);

        res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('Error en resetPassword:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// --- Función de Login (con 2FA) ---
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 600000); // 10 minutos
        
        await db.query('UPDATE usuarios SET verification_code = $1, verification_code_expires = $2 WHERE id = $3', 
            [verificationCode, expires, user.id]);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Código de verificación de inicio de sesión',
            html: `<p>Tu código de verificación es: <strong>${verificationCode}</strong></p><p>Este código expirará en 10 minutos.</p>`,
        };
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Se ha enviado un código de verificación a tu correo.', needsVerification: true, userId: user.id });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// --- Función de Verificación del Código 2FA ---
exports.verifyCode = async (req, res) => {
    const { userId, code } = req.body;

    try {
        const result = await db.query('SELECT * FROM usuarios WHERE id = $1 AND verification_code = $2 AND verification_code_expires > NOW()', [userId, code]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Código de verificación inválido o expirado.' });
        }

        await db.query('UPDATE usuarios SET verification_code = NULL, verification_code_expires = NULL WHERE id = $1', [userId]);

        const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ token, message: 'Inicio de sesión exitoso.' });
    } catch (error) {
        console.error('Error en verifyCode:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};