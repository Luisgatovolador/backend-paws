'use strict';
const Joi = require('joi');

// Esquema para la validación de la solicitud de login
const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'any.required': 'El email es requerido.',
      'string.empty': 'El email no puede estar vacío.',
      'string.email': 'El formato del email es inválido.'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'La contraseña es requerida.',
      'string.empty': 'La contraseña no puede estar vacía.'
    })
}).unknown(false); // No permite atributos adicionales.

// Esquema para la validación de la solicitud de recuperación de contraseña
const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'any.required': 'El email es requerido.',
      'string.empty': 'El email no puede estar vacío.',
      'string.email': 'El formato del email es inválido.'
    })
}).unknown(false); // No permite atributos adicionales.

// Esquema para la validación del restablecimiento de contraseña
const resetPasswordSchema = Joi.object({
  newPassword: Joi.string()
    .min(8)
    .max(30)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/) // Requiere 1 mayúscula, 1 minúscula y 1 dígito
    .required()
    .messages({
      'any.required': 'La nueva contraseña es requerida.',
      'string.empty': 'La nueva contraseña no puede estar vacía.',
      'string.min': 'La nueva contraseña debe tener al menos 8 caracteres.',
      'string.max': 'La nueva contraseña no puede tener más de 30 caracteres.',
      'string.pattern.base': 'La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número.'
    })
}).unknown(false); // No permite atributos adicionales.

// Esquema para la validación del código 2FA
const verifyCodeSchema = Joi.object({
  userId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'El ID de usuario es requerido.',
      'number.base': 'El ID de usuario debe ser un número.',
      'any.invalid': 'El ID de usuario es inválido.'
    }),
  code: Joi.string()
    .length(6)
    .required()
    .messages({
      'any.required': 'El código de verificación es requerido.',
      'string.empty': 'El código de verificación no puede estar vacío.',
      'string.length': 'El código de verificación debe tener 6 dígitos.'
    })
}).unknown(false); // No permite atributos adicionales.

module.exports = {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyCodeSchema
};