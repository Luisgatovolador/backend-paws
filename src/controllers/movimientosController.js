'use strict';
const db = require('../db/index'); 
const { createMovimientoSchema, getMovimientosByProductSchema } = require('../validators/movimientoValidators');

/**
 * @desc Registra una Entrada o Salida de inventario y actualiza el Stock_Actual del producto.
 * @route POST /api/v1/movimientos/registrar
 * @access Private (admin, editor)
 */
exports.registerMovement = async (req, res) => {
    const { error, value } = createMovimientoSchema.validate(req.body);

    if (error) {
        return res.status(400).json({ 
            success: false, 
            message: 'Datos de entrada inválidos para el movimiento.',
            details: error.details[0].message
        });
    }

    const { id_producto, tipo, cantidad, referencia, responsable } = value;
    
    const client = await db.connect(); 

    try {
        await client.query('BEGIN'); 

        const productQuery = 'SELECT stock_actual FROM products WHERE id_producto = $1 FOR UPDATE';
        const productResult = await client.query(productQuery, [id_producto]);

        if (productResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
        }

        const currentStock = productResult.rows[0].stock_actual;
        let stockUpdateQuery;

        if (tipo === 'Entrada') {
            stockUpdateQuery = 'UPDATE products SET stock_actual = stock_actual + $1 WHERE id_producto = $2 RETURNING stock_actual';
        } else if (tipo === 'Salida') {
            if (currentStock < cantidad) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    success: false, 
                    message: `Salida denegada. Stock actual (${currentStock}) es insuficiente para la cantidad solicitada (${cantidad}).`
                });
            }
            stockUpdateQuery = 'UPDATE products SET stock_actual = stock_actual - $1 WHERE id_producto = $2 RETURNING stock_actual';
        }
        
        const updateResult = await client.query(stockUpdateQuery, [cantidad, id_producto]);
        
        const movementQuery = `
            INSERT INTO movimientos (tipo, id_producto, cantidad, referencia, responsable, fecha)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING *;
        `;
        const movementValues = [tipo, id_producto, cantidad, referencia || null, responsable];
        const movementResult = await client.query(movementQuery, movementValues);

        await client.query('COMMIT'); 

        return res.status(201).json({
            success: true,
            message: `Movimiento de ${tipo} registrado. Nuevo stock: ${updateResult.rows[0].stock_actual}`,
            movimiento: movementResult.rows[0]
        });

    } catch (error) {
        if (client) { 
            await client.query('ROLLBACK'); 
        }
        
        console.error('Error al registrar movimiento transaccional:', error);
        
        if (error.code === '23503') { 
            return res.status(400).json({ 
                success: false, 
                message: 'Error de integridad: El ID de producto proporcionado no existe.',
                error: error.detail
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al procesar el movimiento.',
            error: error.message 
        });
    } finally {
        if (client) { 
            client.release(); 
        }
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
