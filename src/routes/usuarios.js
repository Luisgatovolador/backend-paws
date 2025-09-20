const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/usuarioController');

// rutas correctas
router.get('/', UsuarioController.obtenerUsuarios);
router.post('/nuevo', UsuarioController.crearUsuario);
router.delete('/:id', UsuarioController.eliminarUsuario);

module.exports = router;
