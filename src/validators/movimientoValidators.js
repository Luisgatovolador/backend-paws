'use strict'
const Joi = require('joi');

// Expresión regular para solo letras y espacios (para Responsable)
const nameRegex = /^[a-zA-Z\sÁÉÍÓÚáéíóúüÜñÑ]+$/;

// Lista de tipos permitidos
const allowedTypes = ['Entrada', 'Salida'];

// Esquema para el registro de un nuevo movimiento (POST /api/v1/movimientos/registrar)
const createMovimientoSchema = Joi.object({
    id_producto: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'any.required': 'El ID del producto es obligatorio.',
            'number.base': 'El ID del producto debe ser un número.',
            'number.positive': 'El ID del producto debe ser positivo.'
        }),

    tipo: Joi.string()
        .valid(...allowedTypes) // Solo "Entrada" o "Salida"
        .required()
        .messages({
            'any.required': 'El tipo de movimiento es obligatorio.',
            'any.only': 'El tipo debe ser "Entrada" o "Salida".',
            'string.base': 'El tipo debe ser una cadena de texto.'
        }),

    cantidad: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'any.required': 'La cantidad es obligatoria.',
            'number.base': 'La cantidad debe ser un número entero.',
            'number.integer': 'La cantidad debe ser un número entero.',
            'number.positive': 'La cantidad debe ser un número positivo mayor a cero.'
        }),

    referencia: Joi.string()
        .max(50)
        .allow('') // Permitir cadena vacía
        .optional()
        .messages({
            'string.base': 'La referencia debe ser una cadena de texto.',
            'string.max': 'La referencia no debe exceder 50 caracteres.'
        }),

    responsable: Joi.string()
        .max(80)
        .pattern(nameRegex)
        .required()
        .messages({
            'any.required': 'El nombre del responsable es obligatorio.',
            'string.base': 'El responsable debe ser una cadena de texto.',
            'string.max': 'El responsable no debe exceder 80 caracteres.',
            'string.pattern.base': 'El nombre del responsable solo puede contener letras y espacios.'
        }),

    id_proveedor: Joi.number().integer().positive().allow(null).optional(),
    id_cliente: Joi.number().integer().positive().allow(null).optional(),
    // id_usuario es clave para saber quién ejecutó la operación
    id_usuario: Joi.number().integer().positive().required() 
});

// Esquema para obtener movimientos de un producto (GET /api/v1/movimientos/:id_producto)
const getMovimientosByProductSchema = Joi.object({
    id_producto: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'any.required': 'El ID del producto es obligatorio.',
            'number.base': 'El ID del producto debe ser un número.',
            'number.positive': 'El ID del producto debe ser positivo.'
        })
});

module.exports = {
    createMovimientoSchema,
    getMovimientosByProductSchema
};