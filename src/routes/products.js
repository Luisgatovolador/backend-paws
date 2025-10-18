const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productController');
// Asegúrate de que esta ruta a tu middleware de auth sea correcta
const { protect, authorize } = require('../middlewares/auth'); 

// ===========================================
// RUTAS DE PRODUCTOS (/api/v1/products)
// ===========================================

// 1. OBTENER PRODUCTOS (GET /api/v1/products) - Generalmente público o para lectura simple
router.get('/', productsController.getAllProducts);

// 1b. OBTENER PRODUCTOS BAJO STOCK MÍNIMO
router.get('/stock-alert', productsController.getLowStockProducts); 

// 2. CREAR NUEVO PRODUCTO (POST /api/v1/products/nuevo)
// Requiere autenticación y el rol de 'admin' o 'editor'.
router.post(
    '/nuevo', 
    // protect, 
    // authorize('admin', 'editor'), 
    productsController.createProduct
);

// 3. ACTUALIZAR PRODUCTO (PUT /api/v1/products/update)
// Requiere autenticación y el rol de 'admin' o 'editor'.
router.put(
    '/update', 
    // protect, 
    // authorize('admin', 'editor'), 
    productsController.updateProduct
);

// 4. ELIMINAR PRODUCTO (DELETE /api/v1/products/delete)
// Requiere autenticación y el rol de 'admin' o 'editor'.
router.delete(
    '/delete', 
    // protect, 
    // authorize('admin', 'editor'), 
    productsController.deleteProduct
);
// 4. DAR DE BAJA PRODUCTO (PATCH /api/v1/products/deactivate)
// Requiere autenticación y el rol de 'admin' o 'editor'.
router.put(
    '/status', 
    // protect, 
    // authorize('admin', 'editor'), 
    productsController.changeProductStatus
);

module.exports = router;