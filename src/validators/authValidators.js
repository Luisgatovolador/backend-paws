'use strict';
const Joi = require('joi');

// Esquema para la validación de la solicitud de login
const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'any.required': 'El email es requerido.',
      // --- CORRECCIÓN AQUÍ ---
      'string.empty': 'El email no puede estar vacío.', // Añadido acento
      'string.email': 'El formato del email es inválido.'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'La contraseña es requerida.',
      // --- CORRECCIÓN AQUÍ ---
      'string.empty': 'La contraseña no puede estar vacía.' // Añadido acento
    })
}).unknown(false);

// Esquema para la validación de la solicitud de recuperación de contraseña
const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'any.required': 'El email es requerido.',
      // --- CORRECCIÓN AQUÍ ---
      'string.empty': 'El email no puede estar vacío.', // Añadido acento
      'string.email': 'El formato del email es inválido.'
    })
}).unknown(false);

// Esquema para la validación del restablecimiento de contraseña
const resetPasswordSchema = Joi.object({
  newPassword: Joi.string()
    .min(8)
    .max(30)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'any.required': 'La nueva contraseña es requerida.',
      // --- CORRECCIÓN AQUÍ ---
      'string.empty': 'La nueva contraseña no puede estar vacía.', // Añadido acento
      'string.min': 'La nueva contraseña debe tener al menos 8 caracteres.',
      'string.max': 'La nueva contraseña no puede tener más de 30 caracteres.',
      // --- CORRECCIÓN AQUÍ (Mensaje correcto para el regex) ---
      'string.pattern.base': 'La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número.'
    })
}).unknown(false);

// Esquema para la validación del código 2FA
const verifyCodeSchema = Joi.object({
  userId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'El ID de usuario es requerido.',
      // --- CORRECCIÓN AQUÍ ---
      'number.base': 'El ID de usuario debe ser un número.', // Añadido acento
      'any.invalid': 'El ID de usuario es inválido.' // Añadido acento
    }),
  code: Joi.string()
    .length(6)
    .required()
    .messages({
      // --- CORRECCIÓN AQUÍ ---
      'any.required': 'El código de verificación es requerido.', // Añadido acento
      'string.empty': 'El código de verificación no puede estar vacío.', // Añadido acento y tilde
      'string.length': 'El código de verificación debe tener 6 dígitos.' // Añadido tilde y acento
    })
}).unknown(false);

module.exports = {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyCodeSchema
};