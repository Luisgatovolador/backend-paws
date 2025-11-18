// src/config/transporter.js
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

// OAuth2 client con tus credenciales de Gmail
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,       // Client ID de Google Cloud
  process.env.GMAIL_CLIENT_SECRET,   // Client Secret
  "https://developers.google.com/oauthplayground" // Redirect URI
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN, // Refresh token obtenido
});

// Crear transporter Gmail
async function createTransporter() {
  const accessToken = await oAuth2Client.getAccessToken();

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.EMAIL_USER,        // correo que envía
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken: accessToken.token,
    },
  });
}

// Función de envío de correo usando Gmail OAuth2
module.exports = {
  async sendMail({ from, to, subject, html }) {
    try {
      const transporter = await createTransporter();

      const info = await transporter.sendMail({
        from: from || process.env.EMAIL_USER,
        to,
        subject,
        html,
      });

      console.log("Correo enviado:", info.messageId);
      return info;
    } catch (error) {
      console.error("Error enviando correo:", error);
      throw error;
    }
  },
};
