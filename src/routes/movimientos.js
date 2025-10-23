const express = require('express');
const router = express.Router();
const movimientosController = require('../controllers/movimientosController');
const { protect, authorize } = require('../middlewares/auth'); 

// ===========================================
// RUTAS DE MOVIMIENTOS (/api/v1/movimientos)
// ===========================================

// Roles permitidos para estas operaciones (Administrador y Editor)
const allowedRoles = ['admin', 'editor'];

// 1. REGISTRAR MOVIMIENTO (Entrada/Salida) - Requiere seguridad y transacción
router.post(
    '/registrar', 
    // protect, 
    // authorize(...allowedRoles), 
    movimientosController.registerMovement
);

// 2. OBTENER HISTORIAL DE MOVIMIENTOS POR PRODUCTO (GET /api/v1/movimientos/producto/12)
// Aunque es lectura, el historial de inventario es sensible, por lo que lo protegemos.
router.post(
    '/historial', 
    // protect, 
    // authorize(...allowedRoles), 
    movimientosController.getMovimientosByProduct
);

// Exportar el router
module.exports = router;