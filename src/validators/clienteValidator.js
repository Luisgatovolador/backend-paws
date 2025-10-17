'use strict';
const Joi = require('joi');

// Validación para el nombre: obligatorio, solo letras y espacios, máximo 100
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

// Validación para el teléfono: obligatorio, solo números, entre 8 y 15 dígitos
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

// Validación para el contacto: opcional, máximo 100
const contactoValidation = Joi.string().max(100).allow(null, '').messages({
  'string.max': 'El contacto no puede exceder los 100 caracteres.',
});

// Esquema para CREAR un cliente
const crearClienteSchema = Joi.object({
  nombre: nombreValidation,
  telefono: telefonoValidation,
  contacto: contactoValidation,
});

// Esquema para ACTUALIZAR (los campos son opcionales)
const actualizarClienteSchema = Joi.object({
  nombre: nombreValidation.optional(),
  telefono: telefonoValidation.optional(),
  contacto: contactoValidation.optional(),
}).min(1) // Requiere que al menos un campo sea enviado para actualizar
  .messages({
    'object.min': 'Debes proporcionar al menos un campo para actualizar.'
  });


  // Esquema para BUSCAR (ID o Nombre son opcionales, pero se requiere uno)
const buscarClienteSchema = Joi.object({
  id_cliente: Joi.number().integer().min(1).optional(),
  nombre: Joi.string().max(100).optional(),
})
  .or('id_cliente', 'nombre') // Requiere que al menos uno de los dos exista
  .messages({
    'object.missing':
      'Debes proporcionar un "id_cliente" o un "nombre" para buscar.',
  });


module.exports = {
  crearClienteSchema,
  actualizarClienteSchema,
  buscarClienteSchema, // --- Y EXPÓRTALO ---
};