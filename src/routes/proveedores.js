const express = require('express');
const router = express.Router();
const proveedorController = require('../controllers/proveedorController');
// const authMiddleware = require('../middleware/authMiddleware');

// GET /api/v1/proveedores -> Obtener todos
router.get('/', proveedorController.obtenerProveedores);

// POST /api/v1/proveedores -> Crear uno nuevo
router.post('/', proveedorController.crearProveedor);

// POST /api/v1/proveedores/detail -> Obtener uno por ID
router.post('/detail', proveedorController.obtenerProveedorPorId);

// PUT /api/v1/proveedores/update -> Actualizar uno por ID
router.put('/update', proveedorController.actualizarProveedor);

// DELETE /api/v1/proveedores/delete -> Eliminar uno por ID
router.delete('/delete', proveedorController.eliminarProveedor);




module.exports = router;