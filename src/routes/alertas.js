const express = require('express');
const router = express.Router();
const alertaController = require('../controllers/alertaController');
// Aquí deberías añadir tu middleware de autenticación (ej. solo para admins)

// POST /api/v1/alertas/probar-envio
router.post('/probar-envio', alertaController.probarAlertaStock);

module.exports = router;