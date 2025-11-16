// Adaptador para mantener la compatibilidad con "transporter.sendMail"
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const transporter = {
    /**
     * imita transporter.sendMail de Nodemailer
     * para que tu código actual NO falle
     */
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
