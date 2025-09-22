'use strict';
const Joi = require('joi');


const crearUsuarioSchema = Joi.object({
  nombre: Joi.string()
    .pattern(/^(?!\s*$)(?![Nn][Uu][Ll][Ll]$)(?!string$)(?!String$)(?!STRING$)[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/)
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'El nombre no puede estar vacío.',
      'string.pattern.base': 'El nombre solo puede contener letras y espacios, y no puede ser "null" ni "string".',
      'string.min': 'El nombre debe tener al menos 2 caracteres.',
      'string.max': 'El nombre no puede superar los 100 caracteres.',
      'any.required': 'El nombre es obligatorio.'
    }),
  email: Joi.string()
    .pattern(/^[a-zA-Z0-9._%+-]+@gmail\.com$/)
    .required()
    .messages({
      'string.empty': 'El correo electrónico no puede estar vacío.',
      'string.pattern.base': 'El correo electrónico debe ser una cuenta válida de @gmail.com.',
      'any.required': 'El correo electrónico es obligatorio.'
    }),
  password: Joi.string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,255}$/)
    .required()
    .messages({
      'string.empty': 'La contraseña no puede estar vacía.',
      'string.pattern.base': 'La contraseña debe tener al menos 8 caracteres, incluir mayúscula, minúscula, número y símbolo.',
      'any.required': 'La contraseña es obligatoria.'
    }),
  rol: Joi.string()
    .valid('admin', 'editor', 'lector')
    .required()
    .messages({
      'any.only': 'El rol debe ser uno de: admin, editor o lector.',
      'any.required': 'El rol es obligatorio.'
    })
}).unknown(false);

// ✅ Esquema para eliminación de usuario
const eliminarUsuarioSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'El ID de usuario es obligatorio.',
      'number.base': 'El ID debe ser un número.',
      'number.integer': 'El ID debe ser un número entero.',
      'number.positive': 'El ID debe ser mayor que 0.'
    })
}).unknown(false);

module.exports = {
  crearUsuarioSchema,
  eliminarUsuarioSchema
};
