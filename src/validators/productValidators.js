'use strict'
const Joi = require('joi');

// Expresión regular para solo letras, espacios, y caracteres acentuados (para Nombre)
const nameRegex = /^[a-zA-Z\sÁÉÍÓÚáéíóúüÜñÑ]+$/;

// 1. Esquema para la CREACIÓN de un nuevo producto (POST /api/v1/products/nuevo)
const createProductSchema = Joi.object({
    codigo: Joi.string()
        .alphanum()
        .max(20)
        .required()
        .messages({
            'any.required': 'El código es obligatorio.',
            'string.base': 'El código debe ser una cadena de texto.',
            'string.alphanum': 'El código debe ser alfanumérico.',
            'string.max': 'El código no debe exceder 20 caracteres.'
        }),
    nombre: Joi.string()
        .max(100)
        .pattern(nameRegex)
        .required()
        .messages({
            'any.required': 'El nombre es obligatorio.',
            'string.base': 'El nombre debe ser una cadena de texto.',
            'string.max': 'El nombre no debe exceder 100 caracteres.',
            'string.pattern.base': 'El nombre solo puede contener letras y espacios.'
        }),
    descripcion: Joi.string()
        .max(255)
        .allow('') // Se permite opcionalmente vacío (si se envía)
        .optional()
        .messages({
            'string.base': 'La descripción debe ser una cadena de texto.',
            'string.max': 'La descripción no debe exceder 255 caracteres.'
        }),
    categoria: Joi.string()
        .max(50)
        .required()
        .messages({
            'any.required': 'La categoría es obligatoria.',
            'string.base': 'La categoría debe ser una cadena de texto.',
            'string.max': 'La categoría no debe exceder 50 caracteres.'
        }),
    unidad: Joi.string()
        .max(50)
        .required()
        .messages({
            'any.required': 'La unidad es obligatoria (ej: pieza, litro).',
            'string.base': 'La unidad debe ser una cadena de texto.',
            'string.max': 'La unidad no debe exceder 50 caracteres.'
        }),
    stock_minimo: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'any.required': 'El stock mínimo es obligatorio.',
            'number.base': 'El stock mínimo debe ser un número entero.',
            'number.integer': 'El stock mínimo debe ser un número entero.',
            'number.min': 'El stock mínimo no puede ser negativo.'
        }),
    // Opcional en la creación: Si no se envía, se asume 0 en el controller/BD
    stock_actual: Joi.number() 
        .integer()
        .min(0)
        .optional() 
        .messages({
            'number.base': 'El stock actual debe ser un número entero.',
            'number.integer': 'El stock actual debe ser un número entero.',
            'number.min': 'El stock actual no puede ser negativo.'
        })
});

// 2. Esquema para la ACTUALIZACIÓN de un producto (PUT /api/v1/products/update)
// Se deben usar .optional() y .or() para permitir actualizaciones parciales.
const updateProductSchema = Joi.object({
    id_producto: Joi.number().integer().positive().required(),
    // Hacemos el resto de campos opcionales para permitir actualizaciones parciales, 
    // pero manteniendo las validaciones de formato
    codigo: Joi.string().alphanum().max(20).optional(),
    nombre: Joi.string().max(100).pattern(nameRegex).optional(),
    descripcion: Joi.string().max(255).allow('').optional(),
    categoria: Joi.string().max(50).optional(),
    unidad: Joi.string().max(50).optional(),
    stock_minimo: Joi.number().integer().min(0).optional(),
    // Stock actual no debe actualizarse aquí, debe ser vía Movimientos.
    stock_actual: Joi.forbidden().messages({'any.unknown': 'El Stock_Actual se gestiona a través de Movimientos de Inventario.'}) 
})
.min(2) // Requiere ID_Producto y al menos 1 otro campo
.messages({
    'object.min': 'Debe proporcionar el ID del producto y al menos un campo para actualizar.'
});

// 3. Esquema para la ELIMINACIÓN de un producto (DELETE /api/v1/products/delete)
const deleteProductSchema = Joi.object({
    id_producto: Joi.number().integer().positive().required()
});

module.exports = {
    createProductSchema,
    updateProductSchema,
    deleteProductSchema
};