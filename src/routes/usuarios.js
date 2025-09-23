const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/usuarioController');

// rutas correctas
router.get('/', UsuarioController.obtenerUsuarios);
router.post('/nuevo', UsuarioController.crearUsuario);
// PUT actualizar usuario
router.put('/update', UsuarioController.actualizarUsuario); // <-- aquí se registra la ruta PUT

router.delete('/:id', UsuarioController.eliminarUsuario);

module.exports = router;
