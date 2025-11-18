// src/config/transporter.js
const { google } = require("googleapis");
const { base64Encode } = require("./utils"); // función para codificar mensajes

const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

// Función para enviar correo usando Gmail API
async function sendMail({ from, to, subject, html }) {
  try {
    const message = [
      `From: ${from || process.env.EMAIL_USER}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      html,
    ].join("\n");

    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log("Correo enviado:", res.data.id);
    return res.data;
  } catch (error) {
    console.error("Error enviando correo con Gmail API:", error);
    throw error;
  }
}

module.exports = { sendMail };
