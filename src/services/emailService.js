'use strict';
// #region Imports
const { transporter } = require('./initTransport');
const db = require('../db/index');
// #endregion

/**
 * @desc Busca el email del administrador logueado para enviar la alerta.
 * @returns {string | null} Email del administrador o null si no se encuentra.
 */
const getAdminEmail = async () => {
    // Busca el primer usuario con rol 'Administrador' que esté actualmente logueado.
    const query = `
        SELECT email 
        FROM usuarios 
        WHERE rol = 'Administrador' AND is_logged_in = TRUE
        LIMIT 1;
    `;
    try {
        const result = await db.query(query);
        if (result.rowCount > 0) {
            return result.rows[0].email;
        }
        return null;
    } catch (error) {
        console.error("Error al buscar email del administrador:", error);
        return null;
    }
};


/**
 * @desc Envía una alerta crítica cuando el stock de un producto es cero o bajo.
 * @param {number} productId ID del producto en stock crítico.
 * @param {string} productName Nombre del producto.
 * @param {string} responsibleName Nombre del usuario que ejecutó la transacción.
 */
const notificationEmptyStock = async (productId, productName, responsibleName) => {
    // 1. Obtener el email del administrador logueado
    const adminEmail = await getAdminEmail();
    
    // Si no hay un administrador logueado, se envía a un correo genérico o se cancela.
    const recipient = adminEmail || "cesarcasillascespedes@gmail.com";
    
    // Si se encontró el email del administrador, se usa ese. Si no, se usa el genérico.
    const mailOptions = {
        from: '"Alerta de Inventario 🚨" <empresaemail@gmail.com>', // Dirección del remitente
        to: recipient, // Destinatario: Email del Admin logueado o genérico
        subject: `ALERTA CRÍTICA: Stock CERO para ${productName}`, // Línea de asunto
        html: `
            <h1>¡Quiebre de Stock!</h1>
            <p>El producto <strong>${productName}</strong> (ID: ${productId}) ha alcanzado el stock cero (o stock mínimo si se ajusta).</p>
            <p><strong>Responsable de la Transacción:</strong> ${responsibleName}</p>
            <p>Se requiere acción inmediata para reabastecer el inventario.</p>
            <hr>
            <small>Este es un mensaje automático del sistema de gestión de inventario. Enviado a: ${recipient}</small>
        ` // Cuerpo en HTML
    };

    try {
        console.log(`[EMAIL] Preparando envío de alerta para ${productName}. Destino: ${recipient}`);
        
        // Esta línea usa el transporter configurado en initTransport.js
        const info = await transporter.sendMail(mailOptions);
        
        console.log(`[EMAIL] Alerta enviada correctamente a ${recipient}. MessageId: ${info.messageId}`);
        // console.log("URL de prueba (si usas Ethereal): %s", nodemailer.getTestMessageUrl(info)); 

        return { success: true, message: "Alerta de stock enviada." };
    } catch (error) {
        console.error("Error al enviar el correo de alerta:", error);
        return { success: false, message: "Fallo en el envío de la alerta." };
    }
};

module.exports = {
    notificationEmptyStock
};