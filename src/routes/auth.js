const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas para la recuperación de contraseña
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Rutas para el login y la verificación 2FA
router.post('/login', authController.login);
router.post('/verify-2fa', authController.verifyCode);

module.exports = router;