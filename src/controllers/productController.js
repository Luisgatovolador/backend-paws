'use strict';
// #region imports
const db = require('../db/index'); 
const { createProductSchema, updateProductSchema, deleteProductSchema } = require('../validators/productValidators');
// #endregion

/**
 * @desc Obtiene el listado COMPLETO de todos los productos.
 * @route GET /api/v1/products
 */
exports.getAllProducts = async (req, res) => {
    try {
        const query = `
            SELECT id_producto, codigo, nombre, descripcion, categoria, unidad, 
                   stock_minimo, stock_actual, created_at, updated_at 
            FROM products ORDER BY id_producto ASC;
        `;
        const result = await db.query(query); // Ya no se revisa req.query

        return res.status(200).json({
            success: true,
            count: result.rowCount,
            products: result.rows
        });

    } catch (error) {
        console.error('Error al obtener productos:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al obtener productos.',
            error: error.message 
        });
    }
};

/**
 * @desc Obtiene solo productos donde Stock_Actual < Stock_Mínimo.
 * @route GET /api/v1/products/stock-alert
 * @access Public (o 'lector')
 */
exports.getLowStockProducts = async (req, res) => {
    try {
        // Consulta SQL para filtrar productos que están bajo su stock mínimo
        const query = `
            SELECT id_producto, codigo, nombre, stock_minimo, stock_actual
            FROM products
            WHERE stock_actual < stock_minimo
            ORDER BY id_producto ASC;
        `;
        const result = await db.query(query);

        return res.status(200).json({
            success: true,
            count: result.rowCount,
            products: result.rows,
            message: `Alerta: ${result.rowCount} productos están bajo el stock mínimo y requieren reposición.`
        });

    } catch (error) {
        console.error('Error al obtener productos con alerta de stock:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al consultar la alerta de stock.',
            error: error.message 
        });
    }
};

/**
 * @desc Crea un nuevo producto. 
 * @route POST /api/v1/products/nuevo
 */
exports.createProduct = async (req, res) => {
    const { error, value } = createProductSchema.validate(req.body);

    if (error) {
        return res.status(400).json({ 
            success: false, 
            message: 'Datos de entrada inválidos.',
            details: error.details[0].message
        });
    }
    
    const stockActual = value.stock_actual !== undefined ? value.stock_actual : 0;
    
    const { codigo, nombre, descripcion, categoria, unidad, stock_minimo } = value;

    const query = `
        INSERT INTO products (codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
    `;
    const values = [
        codigo, 
        nombre, 
        descripcion || null, // Descripción es opcional/nullable
        categoria, 
        unidad, 
        stock_minimo, 
        stockActual
    ];

    try {
        const result = await db.query(query, values);
        
        return res.status(201).json({
            success: true,
            message: 'Producto creado exitosamente.',
            product: result.rows[0]
        });

    } catch (error) {
        if (error.code === '23505') { 
            return res.status(400).json({ 
                success: false, 
                message: 'No se permitió registrar el producto: el código ya existe.',
                details: error.detail
            });
        }
        console.error('Error al crear producto:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al crear producto.',
            error: error.message 
        });
    }
};

/**
 * @desc Actualiza la información de un producto (ID en el body).
 * @route PUT /api/v1/products/update
 */
exports.updateProduct = async (req, res) => {
    const { error, value } = updateProductSchema.validate(req.body);

    if (error) {
        return res.status(400).json({ 
            success: false, 
            message: 'Datos de entrada inválidos para la actualización.',
            details: error.details[0].message
        });
    }
    
    const { id_producto } = value;

    let queryParts = [];
    let values = [];
    let paramCount = 1;

    // Se itera sobre los campos válidos (value) para construir el UPDATE
    for (const key in value) {
        if (key !== 'id_producto') {
            queryParts.push(`${key} = $${paramCount++}`);
            values.push(value[key]);
        }
    }

    // Agregar marca de tiempo de actualización
    queryParts.push(`updated_at = NOW()`);
    // Último parámetro: ID del producto
    values.push(id_producto);

    const query = `
        UPDATE products SET ${queryParts.join(', ')}
        WHERE id_producto = $${paramCount}
        RETURNING *;
    `;

    try {
        const result = await db.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: `Producto con ID ${id_producto} no encontrado para actualizar.` 
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Producto actualizado exitosamente.',
            product: result.rows[0]
        });

    } catch (error) {

         if (error.code === '23505') { 
            return res.status(400).json({ 
                success: false, 
                message: 'El código de producto ya existe en otro registro.',
                details: error.detail
            });
        }
        console.error('Error al actualizar producto:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al actualizar producto.',
            error: error.message 
        });
    }
};

/**
 * @desc Elimina un producto (ID en el body).
 * @route DELETE /api/v1/products/delete
 */
exports.deleteProduct = async (req, res) => {
    const { error, value } = deleteProductSchema.validate(req.body);

    if (error) {
        return res.status(400).json({ 
            success: false, 
            message: 'Datos de entrada inválidos para la eliminación.',
            details: error.details[0].message
        });
    }

    const { id_producto } = value;
    const query = `DELETE FROM products WHERE id_producto = $1 RETURNING id_producto;`;
    
    try {
        const result = await db.query(query, [id_producto]);

        if (result.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: `Producto con ID ${id_producto} no encontrado para eliminar.` 
            });
        }
        
        return res.status(200).json({
            success: true,
            message: `Producto con ID ${id_producto} eliminado exitosamente.`
        });

    } catch (error) {
        // Manejar restricción de clave foránea (si el producto tiene movimientos)
        if (error.code === '23503') { 
            return res.status(400).json({ 
                success: false, 
                message: 'No se puede eliminar el producto, tiene movimientos de inventario asociados. Considere desactivarlo en su lugar.',
                error: error.message
            });
        }
        console.error('Error al eliminar producto:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al eliminar producto.',
            error: error.message 
        });
    }
};

/**
 * @desc Cambiar el estado activo de un producto (alta o baja) por ID o nombre.
 * @route PATCH /api/v1/products/status
 */
exports.changeProductStatus = async (req, res) => {
    const { id_producto, nombre, activo } = req.body;

    if (activo === undefined || !(activo === 0 || activo === 1)) {
        return res.status(400).json({
            success: false,
            message: 'Debes indicar el estado activo: 1 (alta) o 0 (baja).'
        });
    }

    if (!id_producto && !nombre) {
        return res.status(400).json({
            success: false,
            message: 'Debes enviar al menos id_producto o nombre para identificar el producto.'
        });
    }

    let query = 'UPDATE products SET activo = $1, updated_at = NOW() WHERE ';
    let values = [activo];
    let paramCount = 2;

    if (id_producto) {
        query += `id_producto = $${paramCount++}`;
        values.push(id_producto);
    } 
    if (nombre) {
        if (id_producto) query += ' OR ';
        query += `nombre = $${paramCount++}`;
        values.push(nombre);
    }

    query += ' RETURNING *;';

    try {
        const result = await db.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró ningún producto con los datos proporcionados.'
            });
        }

        return res.status(200).json({
            success: true,
            message: `Producto(s) actualizado(s) correctamente.`,
            products: result.rows
        });

    } catch (error) {
        console.error('Error al cambiar estado del producto:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor al actualizar el estado del producto.',
            error: error.message
        });
    }
};
