const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuarioController');


router.get('/', controller.lista);
router.get('/nuevo', controller.formNuevo);
router.post('/nuevo', controller.crear);


module.exports = router;