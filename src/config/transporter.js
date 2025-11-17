// src/config/transporter.js

const { Resend } = require('resend');

// Crear cliente Resend
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Transporter compatible con Nodemailer
 * Tiene el método sendMail({ from, to, subject, html })
 * igual que Nodemailer, así NO cambias nada en tus controladores.
 */
const transporter = {
    async sendMail({ from, to, subject, html }) {
        try {
            const data = await resend.emails.send({
                from: from || process.env.EMAIL_FROM,  // si no mandas from, usa el default
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
