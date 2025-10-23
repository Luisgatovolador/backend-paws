'use strict';
const db = require('../db/index'); 
const { createMovimientoSchema, getMovimientosByProductSchema } = require('../validators/movimientoValidators');
const { notificationEmptyStock } = require('../services/emailService'); // Importación necesaria

/**
 * @desc Registra una Entrada o Salida de inventario y actualiza el Stock_Actual del producto.
 * @route POST /api/v1/movimientos/registrar
 * @access Private (admin, editor)
 */
exports.registerMovement = async (req, res, next) => {
    const { error, value } = createMovimientoSchema.validate(req.body);

    if (error) {
        return res.status(400).json({ 
            success: false, 
            message: 'Datos de entrada inválidos.',
            details: error.details[0].message
        });
    }

    // Renombramos IDs para evitar errores de inicialización/scope.
    const { tipo, cantidad, referencia, responsable, 
            id_producto: productoId, id_proveedor: proveedorId, id_cliente: clienteId, id_usuario: usuarioId } = value;

    // A. VALIDACIÓN ESTRICTA DE TRAZABILIDAD Y RESPONSABLES
    
    // 1. Validar id_usuario (Obligatorio para cualquier movimiento)
    if (!usuarioId || usuarioId <= 0) {
        return res.status(440).json({ success: false, message: 'El campo id_usuario es obligatorio y debe ser un ID válido del responsable de la operación.' });
    }

    // 2. Validar id_proveedor (Obligatorio si es Entrada)
    if (tipo === 'Entrada') {
        if (!proveedorId || proveedorId <= 0) {
            return res.status(400).json({ success: false, message: 'Para un movimiento de tipo "Entrada", el campo id_proveedor es obligatorio y debe ser un ID válido.' });
        }
        // Aseguramos que id_cliente sea NULL para Entrada
        if (clienteId && clienteId > 0) {
             return res.status(400).json({ success: false, message: 'Para un movimiento de tipo "Entrada", el campo id_cliente debe ser nulo o no estar presente.' });
        }
    }
    
    // 3. Validar id_cliente (Obligatorio si es Salida)
    if (tipo === 'Salida') {
        if (!clienteId || clienteId <= 0) {
            return res.status(400).json({ success: false, message: 'Para un movimiento de tipo "Salida", el campo id_cliente es obligatorio y debe ser un ID válido.' });
        }
        // Aseguramos que id_proveedor sea NULL para Salida
        if (proveedorId && proveedorId > 0) {
             return res.status(400).json({ success: false, message: 'Para un movimiento de tipo "Salida", el campo id_proveedor debe ser nulo o no estar presente.' });
        }
    }
    
    // CORRECCIÓN CLAVE: Usamos db.connect() para obtener un cliente del Pool para la transacción.
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Obtener datos del producto y bloquear la fila (FOR UPDATE)
        const productQuery = `
            SELECT nombre, stock_actual, stock_minimo
            FROM products
            WHERE id_producto = $1
            FOR UPDATE;
        `;
        const productResult = await client.query(productQuery, [productoId]);

        if (productResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: `Producto con ID ${productoId} no encontrado.` });
        }

        const { nombre: productName, stock_actual: currentStock, stock_minimo: minStock } = productResult.rows[0];
        let newStock;

        if (tipo === 'Entrada') {
            newStock = currentStock + cantidad;

        } else if (tipo === 'Salida') {
            // Validar stock antes de restar 
            if (currentStock < cantidad) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: `Stock insuficiente. Stock actual: ${currentStock}, Cantidad a retirar: ${cantidad}.` });
            }
            newStock = currentStock - cantidad; // Calculamos el newStock solo para el feedback y la alerta
        }

        // 2. Insertar el movimiento
        // NOTA: El trigger de PostgreSQL se encargará de actualizar la tabla 'products'
        const movimientoQuery = `
            INSERT INTO movimientos (fecha, tipo, id_producto, cantidad, referencia, responsable, id_proveedor, id_cliente, id_usuario)
            VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        
        const idProveedorFinal = tipo === 'Entrada' ? proveedorId : null;
        const idClienteFinal = tipo === 'Salida' ? clienteId : null;
        
        const movimientoValues = [
            tipo,
            productoId, 
            cantidad,
            referencia || null, 
            responsable,
            idProveedorFinal, 
            idClienteFinal,   
            usuarioId         
        ];

        const movimientoResult = await client.query(movimientoQuery, movimientoValues);
        
        // 3. Integración del Email de Alerta (Revisar stock después de la Salida)
        // Usamos newStock (calculado localmente) para el chequeo de la alerta
        if (tipo === 'Salida' && newStock < minStock) {
            console.log(`[ALERT] El stock de ${productName} (${newStock}) es inferior al mínimo (${minStock}). Enviando alerta...`);
            notificationEmptyStock(productoId, productName, responsable) 
                .catch(err => console.error("Fallo al enviar el email de alerta:", err.message));
        }

        // 4. Commit de la transacción
        // El COMMIT finaliza la transacción e inmediatamente después el trigger ejecuta la actualización final.
        await client.query('COMMIT');
        
        return res.status(201).json({
            success: true,
            message: `Movimiento de ${tipo} registrado exitosamente. Nuevo stock (estimado): ${newStock}`,
            movimiento: movimientoResult.rows[0],
            alert_sent: tipo === 'Salida' && newStock < minStock 
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error durante la transacción de movimiento:', error.message);
        if (error.code === '23503') { // Clave foránea violada
             return res.status(400).json({ success: false, message: 'Fallo de trazabilidad: El ID del cliente o proveedor no existe.' });
        }
        return res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al registrar el movimiento.',
            error: error.message 
        });
    } finally {
        // MUY IMPORTANTE: Liberar el cliente al pool
        client.release();
    }
};
/**
 * @desc Obtiene el historial de movimientos de un producto.
 * @route POST /api/v1/movimientos/historial
 * @access Private (admin, editor)
 */
exports.getMovimientosByProduct = async (req, res) => {
    const { error, value } = getMovimientosByProductSchema.validate(req.body); 

    if (error) {
        return res.status(400).json({ 
            success: false, 
            message: 'ID de producto inválido en el cuerpo JSON.',
            details: error.details[0].message
        });
    }
    
    const { id_producto } = value; 
    let client; // Declaramos el cliente para asegurar el release

    try {
        client = await db.connect(); // Obtener el cliente de la pool

        // PASO 1: Verificar si el producto existe antes de buscar el historial.
        const checkQuery = 'SELECT 1 FROM products WHERE id_producto = $1';
        const checkResult = await client.query(checkQuery, [id_producto]);

        if (checkResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'El ID de producto proporcionado no existe.'
            });
        }

        // PASO 2: Obtener el historial si el producto existe.
        const query = `
            SELECT id_movimiento, fecha, tipo, cantidad, referencia, responsable
            FROM movimientos
            WHERE id_producto = $1
            ORDER BY fecha DESC;
        `;
        const result = await client.query(query, [id_producto]);

        return res.status(200).json({
            success: true,
            movimientos: result.rows,
            total: result.rowCount
        });

    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al consultar movimientos.',
            error: error.message 
        });
    } finally {
        if (client) {
            client.release(); // Liberar el cliente al pool
        }
    }
};

/**
 * @desc Obtiene la lista de alertas de stock registradas en la bitácora.
 * @route GET /api/v1/products/stock-alert
 * @access Private (admin, editor)
 */
exports.getStockAlerts = async (req, res) => {
    try {
        const query = `
            SELECT 
                sa.id_alerta, 
                sa.fecha_alerta, 
                p.id_producto,
                p.nombre AS product_name,
                p.codigo
            FROM stock_alerts sa
            JOIN products p ON sa.id_producto = p.id_producto
            ORDER BY sa.fecha_alerta DESC;
        `;
        const result = await db.query(query);

        return res.status(200).json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });

    } catch (error) {
        console.error('Error al obtener alertas de stock:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor al obtener las alertas.' });
    }
};