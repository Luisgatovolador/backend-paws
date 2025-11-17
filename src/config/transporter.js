// src/config/transporter.js

const { Resend } = require('resend');

// Crear instancia de Resend con tu API KEY
const resend = new Resend(process.env.RESEND_API_KEY);

// Adaptador compatible con transporter.sendMail()
const transporter = {
    async sendMail({ to, subject, html, from }) {
        try {
            const data = await resend.emails.send({
                from: from || process.env.EMAIL_FROM,
                to,
                subject,
                html
            });

            console.log("Correo enviado correctamente:", data);
            return data;
        } catch (error) {
            console.error("Error enviando correo:", error);
            throw error;
        }
    }
};

module.exports = transporter;
