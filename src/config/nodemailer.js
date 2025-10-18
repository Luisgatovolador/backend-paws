const nodemailer = require('nodemailer');

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

// Exportamos el 'transporter' para que otros archivos puedan usarlo
module.exports = transporter;