const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

async function createTransporter() {
  const accessToken = await oAuth2Client.getAccessToken();

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.EMAIL_USER,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken: accessToken.token,
    },
  });
}

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
