const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

// GET /api/v1/clientes -> Obtener todos los clientes
router.get('/', clienteController.obtenerClientes);

// POST /api/v1/clientes -> Crear un nuevo cliente
router.post('/', clienteController.crearCliente);

// POST /api/v1/clientes/detail -> Obtener un cliente por su ID
router.post('/detail', clienteController.obtenerClientePorId);

// PUT /api/v1/clientes/update -> Actualizar un cliente por su ID
router.put('/update', clienteController.actualizarCliente);

// DELETE /api/v1/clientes/delete -> Eliminar un cliente por su ID
router.delete('/delete', clienteController.eliminarCliente);

module.exports = router;