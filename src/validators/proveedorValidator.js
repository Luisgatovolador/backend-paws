
'use strict';
const Joi = require('joi');

// Validación para el nombre: solo letras y espacios, max 100
const nombreValidation = Joi.string()
  .max(100)
  .pattern(new RegExp('^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$'))
  .required()
  .messages({
    'string.base': 'El nombre debe ser texto.',
    'string.empty': 'El nombre es obligatorio.',
    'string.max': 'El nombre no puede exceder los 100 caracteres.',
    'string.pattern.base': 'El nombre solo puede contener letras y espacios.',
    'any.required': 'El nombre es obligatorio.',
  });

// Validación para el teléfono: solo números, entre 8 y 15 dígitos
const telefonoValidation = Joi.string()
  .min(8)
  .max(15)
  .pattern(new RegExp('^[0-9]+$'))
  .required()
  .messages({
    'string.empty': 'El teléfono es obligatorio.',
    'string.min': 'El teléfono debe tener al menos 8 dígitos.',
    'string.max': 'El teléfono no puede exceder los 15 dígitos.',
    'string.pattern.base': 'El teléfono solo puede contener números.',
    'any.required': 'El teléfono es obligatorio.',
  });

// Validación para el contacto: opcional, max 100
const contactoValidation = Joi.string().max(100).allow(null, '').messages({
  'string.max': 'El contacto no puede exceder los 100 caracteres.',
});

// Esquema para CREAR un proveedor
const crearProveedorSchema = Joi.object({
  nombre: nombreValidation,
  telefono: telefonoValidation,
  contacto: contactoValidation,
});

// Esquema para ACTUALIZAR (los campos son opcionales)
const actualizarProveedorSchema = Joi.object({
  nombre: nombreValidation.optional(),
  telefono: telefonoValidation.optional(),
  contacto: contactoValidation.optional(),
}).min(1) // Requiere al menos un campo para actualizar
  .messages({
    'object.min': 'Debes proporcionar al menos un campo para actualizar.'
  });

const buscarProveedorSchema = Joi.object({
  id_proveedor: Joi.number().integer().min(1).optional(),
  nombre: Joi.string().max(100).optional(),
})
  .or('id_proveedor', 'nombre') // Requiere que al menos uno de los dos exista
  .messages({
    'object.missing':
      'Debes proporcionar un "id_proveedor" o un "nombre" para buscar.',
  });

module.exports = {
  crearProveedorSchema,
  actualizarProveedorSchema,
  buscarProveedorSchema,
};