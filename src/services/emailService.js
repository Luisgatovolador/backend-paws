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
    const query = `
        SELECT email 
        FROM usuarios 
        WHERE rol = 'Administrador' AND is_logged_in = TRUE
        ORDER BY last_login DESC
        LIMIT 1;
    `;
    try {
        const result = await db.query(query);
        return result.rowCount > 0 ? result.rows[0].email : null;
    } catch (error) {
        console.error("Error al buscar email del administrador:", error);
        return null;
    }
};

/**
 * @desc Envía una alerta crítica cuando un producto llega a stock cero o bajo.
 * @param {number} productId ID del producto
 * @param {string} productName Nombre del producto
 * @param {string} responsibleName Nombre del usuario que ejecutó la transacción
 */
const notificationEmptyStock = async (productId, productName, responsibleName) => {
    const adminEmail = await getAdminEmail();
    const recipient = adminEmail || "cesarcasillascespedes@gmail.com";

    // Escapar texto para evitar inyección HTML
    const escapeHtml = (unsafe) =>
        unsafe.replace(/[&<"'>]/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        }[m]));

    const safeProductName = escapeHtml(productName);
    const safeResponsible = escapeHtml(responsibleName);

    // === NUEVO HTML CON ESTILO PROFESIONAL ===
    const htmlBody = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>¡Alerta Crítica de Stock Cero!</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f0f2f5; font-family: 'Helvetica Neue', Arial, sans-serif; }
        table { border-collapse: collapse; }
        .container {
            max-width: 600px;
            background-color: #fff;
            border-radius: 8px;
            overflow: hidden;
            margin: 40px auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .header {
            background-color: #dc3545;
            color: #fff;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 { margin: 0; font-size: 26px; }
        .content {
            padding: 40px 30px;
            color: #343a40;
        }
        .content h2 {
            font-size: 22px;
            margin-bottom: 10px;
            color: #dc3545;
        }
        .content p {
            font-size: 16px;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        .product-table {
            width: 100%;
            border: 1px solid #e9ecef;
            margin-top: 20px;
            border-radius: 6px;
            overflow: hidden;
        }
        .product-table th, .product-table td {
            padding: 12px 10px;
            border-bottom: 1px solid #e9ecef;
            text-align: center;
            font-size: 15px;
        }
        .product-table th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .low-stock { color: #dc3545; font-weight: bold; }
        .footer {
            background-color: #f8f9fa;
            padding: 25px 30px;
            text-align: center;
            color: #6c757d;
            font-size: 13px;
            border-top: 1px solid #e9ecef;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://cdn-icons-png.flaticon.com/512/564/564619.png" alt="Alerta" width="50" height="50" style="margin-bottom: 10px;">
            <h1>¡ALERTA CRÍTICA DE STOCK CERO!</h1>
        </div>
        <div class="content">
            <h2>Producto sin stock disponible</h2>
            <p>El siguiente producto ha alcanzado un nivel de stock <strong>cero</strong> o por debajo del mínimo establecido:</p>

            <table class="product-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>ID</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>${safeProductName}</strong></td>
                        <td>${productId}</td>
                        <td class="low-stock">STOCK AGOTADO</td>
                    </tr>
                </tbody>
            </table>

            <p style="margin-top: 25px;">
                <strong>Responsable de la transacción:</strong> ${safeResponsible}<br>
                Se requiere acción inmediata para reabastecer el inventario.
            </p>
        </div>
        <div class="footer">
            <p>Este es un mensaje automático generado por el Sistema de Gestión de Inventario de <strong>[Nombre de tu Empresa]</strong>.</p>
            <p>No respondas a este correo electrónico.</p>
        </div>
    </div>
</body>
</html>`;

    try {
        console.log(`[EMAIL] Preparando alerta de stock cero para ${productName} (ID: ${productId})`);
        const info = await transporter.sendMail({
            from: '"Sistema de Inventario" <empresaemail@gmail.com>',
            to: recipient,
            subject: `🚨 STOCK AGOTADO: ${productName}`,
            html: htmlBody
        });
        console.log(`[EMAIL] Alerta enviada a ${recipient}. MessageId: ${info.messageId}`);
        return { success: true, message: "Correo de alerta enviado correctamente." };
    } catch (error) {
        console.error("Error al enviar correo de alerta:", error);
        return { success: false, message: "Error al enviar correo de alerta.", error: error.message };
    }
};

module.exports = {
    notificationEmptyStock
};