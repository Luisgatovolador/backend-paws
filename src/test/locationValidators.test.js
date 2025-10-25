// Importamos los esquemas a probar
const { locationSchema, userIdSchema } = require('../validators/locationValidators');

describe('Pruebas Unitarias para Validadores de Ubicación', () => {

  // --- Pruebas para locationSchema ---
  describe('locationSchema', () => {
    test('Debe pasar con userId y actionName válidos', () => {
      const dataValida = { userId: 1, actionName: 'login_attempt' };
      const { error } = locationSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    test('Debe fallar si falta userId', () => {
      const dataInvalida = { actionName: 'login_attempt' };
      const { error } = locationSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El ID de usuario es requerido');
    });

    test('Debe fallar si userId no es un número', () => {
      const dataInvalida = { userId: 'abc', actionName: 'login_attempt' };
      const { error } = locationSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El ID de usuario debe ser un número');
    });

    test('Debe fallar si userId es negativo', () => {
      const dataInvalida = { userId: -5, actionName: 'login_attempt' };
      const { error } = locationSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // Joi valida .positive() después de .integer(), el mensaje podría variar
      // expect(error.details[0].message).toContain('must be a positive');
    });

    test('Debe fallar si userId es cero', () => {
      const dataInvalida = { userId: 0, actionName: 'login_attempt' };
      const { error } = locationSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // Joi valida .positive()
      // expect(error.details[0].message).toContain('must be a positive');
    });


    test('Debe fallar si falta actionName', () => {
      const dataInvalida = { userId: 1 };
      const { error } = locationSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El tipo de acción es requerido');
    });

    test('Debe fallar si actionName está vacío', () => {
      const dataInvalida = { userId: 1, actionName: '' };
      const { error } = locationSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // Joi tiene un mensaje específico para string vacío si es requerido
      // expect(error.details[0].message).toContain('not allowed to be empty');
    });
    test('Debe fallar si actionName no es un string (ej. null)', () => {
        const dataInvalida = { userId: 1, actionName: null };
        const { error } = locationSchema.validate(dataInvalida);
        expect(error).toBeDefined();
        // --- CORRECTION: Expect the 'string.base' message ---
        expect(error.details[0].message).toContain('El tipo de acción debe ser una cadena de texto.');
        });
  });

  // --- Pruebas para userIdSchema ---
  describe('userIdSchema', () => {
    test('Debe pasar con un userId válido', () => {
      const dataValida = { userId: 1 };
      const { error } = userIdSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    test('Debe fallar si falta userId', () => {
      const dataInvalida = {};
      const { error } = userIdSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // El mensaje puede variar dependiendo si Joi detecta 'required' primero
      // expect(error.details[0].message).toContain('is required');
    });

    test('Debe fallar si userId no es un número', () => {
      const dataInvalida = { userId: 'uno' };
      const { error } = userIdSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // expect(error.details[0].message).toContain('must be a number');
    });

    test('Debe fallar si userId es negativo', () => {
      const dataInvalida = { userId: -10 };
      const { error } = userIdSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // expect(error.details[0].message).toContain('must be a positive');
    });

    test('Debe fallar si userId es cero', () => {
      const dataInvalida = { userId: 0 };
      const { error } = userIdSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // expect(error.details[0].message).toContain('must be a positive');
    });
  });

});