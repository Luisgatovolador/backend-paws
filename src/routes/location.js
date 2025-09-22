const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// Ruta para guardar la ubicación a través de la IP
router.get('/get-by-id', locationController.getLocationsByUserId);

module.exports = router;