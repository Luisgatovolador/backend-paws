const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuarioController');

// Listar usuarios
router.get('/', controller.lista);

// Crear usuario
router.post('/nuevo', controller.crear);

// Actualizar usuario por ID
router.put('/:id', controller.actualizar);

// Eliminar usuario por ID
router.delete('/:id', controller.eliminar);

module.exports = router;
