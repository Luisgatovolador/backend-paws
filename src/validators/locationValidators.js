'use strict'
const Joi = require('joi');

const locationSchema = Joi.object({
  userId: Joi.number()
    .required()
    .messages({
      'any.required': 'El ID de usuario es requerido.',
      'number.base': 'El ID de usuario debe ser un número.'
    }),
  actionName: Joi.string()
    .required()
    .messages({
      'any.required': 'El tipo de acción es requerido.',
      'string.base': 'El tipo de acción debe ser una cadena de texto.'
    })
});

const userIdSchema = Joi.object({
  userId: Joi.number().integer().positive().required()
});

module.exports = {
  locationSchema,
  userIdSchema
};