const db = require('../db/index');
const transporter = require('../config/nodemailer'); // Asegúrate que la ruta sea correcta

// --- FUNCIÓN 1: GENERAR FILAS ---
// (Esta función es interna, no necesita exportarse)
function generarFilasHtml(products) {
    return products.map(product => {
        const deficit = product.stock_actual - product.stock_minimo;
        return `
            <tr>
                <td class="product-name" style="padding: 14px 12px; border-bottom: 1px solid #e9ecef; text-align: left; font-weight: 600;">
                    <span>${product.nombre}</span>
                    <span class="sku" style="font-size: 12px; color: #6c757d; display: block; margin-top: 3px;">SKU: ${product.codigo}</span>
                </td>
                <td style="padding: 14px 12px; border-bottom: 1px solid #e9ecef; text-align: center; font-size: 15px; color: #495057;">${product.stock_minimo}</td>
                <td class="low-stock" style="padding: 14px 12px; border-bottom: 1px solid #e9ecef; text-align: center; font-size: 15px; color: #dc3545; font-weight: bold;">${product.stock_actual}</td>
                <td class="deficit" style="padding: 14px 12px; border-bottom: 1px solid #e9ecef; text-align: center; font-size: 15px; color: #dc3545; font-weight: bold;">${deficit}</td>
            </tr>
        `;
    }).join('');
}

// --- FUNCIÓN 2: LÓGICA PRINCIPAL DE REVISIÓN ---
// (Definida como constante)
const revisarYEnviarAlertasDeStock = async () => {
    try {
        const { rows: lowStockProducts } = await db.query(
            'SELECT * FROM products WHERE stock_actual < stock_minimo'
        );

        if (lowStockProducts.length === 0) {
            console.log('Revisión de stock: Todo en orden.');
            return { success: true, message: 'No hay productos con bajo stock.' };
        }

        const filasDeProductos = generarFilasHtml(lowStockProducts);
        const htmlBody = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>¡Alerta Crítica de Stock Bajo!</title>
    <style>
        /* Reset CSS para asegurar consistencia en clientes de email */
        body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        p { margin: 0; padding: 0; }
        /* Estilos generales del correo */
        .container {
            width: 100%;
            max-width: 600px;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            -webkit-box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .header {
            background-color: #dc3545; /* Rojo de alerta */
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
            line-height: 1.2;
        }
        .header img {
            display: block;
            margin: 0 auto 15px auto;
            width: 50px;
            height: 50px;
        }
        .content {
            padding: 40px 30px;
            color: #343a40; /* Texto oscuro para buena legibilidad */
            line-height: 1.6;
        }
        .content h2 {
            font-size: 24px;
            margin: 0 0 20px 0;
            color: #343a40;
            font-weight: bold;
        }
        .content p {
            font-size: 16px;
            margin-bottom: 25px;
        }
        .product-table {
            width: 100%;
            border: 1px solid #e9ecef;
            border-collapse: collapse;
            margin-top: 20px;
            border-radius: 6px;
            overflow: hidden; /* Para que los border-radius funcionen en la tabla */
        }
        .product-table th, .product-table td {
            padding: 14px 12px;
            border-bottom: 1px solid #e9ecef;
            text-align: left;
            font-size: 15px;
            color: #495057;
        }
        .product-table th {
            background-color: #f8f9fa; /* Fondo más claro para encabezados */
            font-weight: bold;
            text-align: center;
        }
        .product-table td {
            text-align: center;
        }
        .product-table tbody tr:last-child td {
            border-bottom: none; /* Eliminar borde inferior de la última fila */
        }
        .product-table .product-name {
            text-align: left;
            font-weight: 600;
        }
        .product-table .sku {
            font-size: 12px;
            color: #6c757d;
            display: block;
            margin-top: 3px;
        }
        .product-table .low-stock {
            color: #dc3545; /* Rojo para stock bajo */
            font-weight: bold;
        }
        .product-table .deficit {
            color: #dc3545; /* Rojo para déficit */
            font-weight: bold;
        }
        .cta-button-container {
            text-align: center;
            padding: 30px 0;
        }
        .cta-button {
            display: inline-block;
            background-color: #007bff; /* Azul primario */
            color: #ffffff;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
            -webkit-transition: background-color 0.3s ease;
            -o-transition: background-color 0.3s ease;
            transition: background-color 0.3s ease;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 25px 30px;
            text-align: center;
            color: #6c757d;
            font-size: 13px;
            line-height: 1.5;
            border-bottom-left-radius: 8px;
            border-bottom-right-radius: 8px;
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f2f5; font-family: 'Helvetica Neue', Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f2f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table class="container" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                    
                    <tr>
                        <td class="header">
                            <img src="https://i.imgur.com/your-alert-icon.png" alt="Alerta" style="display: block; margin: 0 auto 15px auto; width: 50px; height: 50px;">
                            <h1>¡ALERTA CRÍTICA DE BAJO STOCK!</h1>
                        </td>
                    </tr>

                    <tr>
                        <td class="content">
                            <h2>Estimado(a) Responsable de Inventario,</h2>
                            <p>
                                Este es un aviso urgente: los siguientes productos han alcanzado niveles por debajo de su stock mínimo. Para mantener la continuidad operativa y evitar interrupciones en las ventas, es crucial que se gestione una orden de compra a la brevedad posible.
                            </p>

                            <p style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #dc3545;">Productos con stock crítico:</p>
                            
                            <table class="product-table" border="0" cellpadding="0" cellspacing="0">
                                <thead>
                                    <tr>
                                        <th style="width: 40%;">Producto (SKU)</th>
                                        <th style="width: 20%;">Mínimo</th>
                                        <th style="width: 20%;">Actual</th>
                                        <th style="width: 20%;">Déficit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td class="product-name">
                                            <span>Auriculares Inalámbricos X200</span>
                                            <span class="sku">SKU: AURI-X200</span>
                                        </td>
                                        <td>10</td>
                                        <td class="low-stock">7</td>
                                        <td class="deficit">-3</td>
                                    </tr>
                                    <tr>
                                        <td class="product-name">
                                            <span>Impresora Multifunción Pro</span>
                                            <span class="sku">SKU: IMP-PRO-001</span>
                                        </td>
                                        <td>5</td>
                                        <td class="low-stock">4</td>
                                        <td class="deficit">-1</td>
                                    </tr>
                                    <tr>
                                        <td class="product-name">
                                            <span>Ratón Ergonómico Gaming</span>
                                            <span class="sku">SKU: RAT-ERG-GM</span>
                                        </td>
                                        <td>15</td>
                                        <td class="low-stock">12</td>
                                        <td class="deficit">-3</td>
                                    </tr>
                                    </tbody>
                            </table>
                        </td>
                    </tr>

                   

                    <tr>
                        <td class="footer">
                            <p>Este es un mensaje automático generado por el Sistema de Gestión de Inventario de <strong>[Nombre de tu Empresa]</strong>.</p>
                            <p style="margin-top: 8px;">Por favor, no respondas a este correo electrónico.</p>
                            <p style="margin-top: 5px;">&copy; 2025 [Nombre de tu Empresa]. Todos los derechos reservados.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

        const mailOptions = {
            from: '"Sistema de Inventario" <rodriguez.luis.rollo@gmail.com>',
            to: 'cesarcasillascespedes@gmail.com', // ¡RECUERDA CAMBIAR ESTO!
            subject: '🔴 PRUEBA: Alerta Crítica de Bajo Stock',
            html: htmlBody
        };

        await transporter.sendMail(mailOptions);
        console.log('Correo de alerta de stock enviado exitosamente.');
        return { success: true, message: `Correo de alerta enviado para ${lowStockProducts.length} productos.` };

    } catch (error) {
        console.error('Error al enviar la alerta de stock:', error);
        return { success: false, message: 'Error al enviar el correo.', error: error.message };
    }
}

// --- FUNCIÓN 3: CONTROLADOR PARA LA API ---
// (Definida como constante)
const probarAlertaStock = async (req, res) => {
    console.log('Solicitud de prueba de alerta recibida...');
    
    const resultado = await revisarYEnviarAlertasDeStock();

    if (resultado.success) {
        res.status(200).json(resultado);
    } else {
        res.status(500).json(resultado);
    }
};

// --- EXPORTACIÓN CORRECTA ---
// Exporta las dos funciones que necesitas usar en otros archivos
module.exports = {
    revisarYEnviarAlertasDeStock,
    probarAlertaStock
};