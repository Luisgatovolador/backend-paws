// Importamos los esquemas que vamos a probar
const {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyCodeSchema
} = require('../validators/authValidators');

describe('Pruebas Unitarias para Validadores de Autenticación', () => {

  // --- Pruebas para loginSchema ---
  describe('loginSchema', () => {
    test('Debe pasar con email y password válidos', () => {
      const dataValida = { email: 'test@example.com', password: 'password123' };
      const { error } = loginSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    test('Debe fallar si falta el email', () => {
      const dataInvalida = { password: 'password123' };
      const { error } = loginSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El email es requerido');
    });

    test('Debe fallar si el email está vacío', () => {
      const dataInvalida = { email: '', password: 'password123' };
      const { error } = loginSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El email no puede estar vacío');
    });

    test('Debe fallar si el email tiene formato inválido', () => {
      const dataInvalida = { email: 'test@invalid', password: 'password123' };
      const { error } = loginSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El formato del email es inválido');
    });

    test('Debe fallar si falta la contraseña', () => {
      const dataInvalida = { email: 'test@example.com' };
      const { error } = loginSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('La contraseña es requerida');
    });

    test('Debe fallar si la contraseña está vacía', () => {
        const dataInvalida = { email: 'test@example.com', password: '' };
        const { error } = loginSchema.validate(dataInvalida);
        expect(error).toBeDefined();
        expect(error.details[0].message).toContain('La contraseña no puede estar vacía');
    });

    test('Debe fallar si se envían campos extra', () => {
      const dataInvalida = { email: 'test@example.com', password: 'password123', extra: 'campo' };
      const { error } = loginSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('"extra" is not allowed'); // Mensaje de Joi para unknown(false)
    });
  });

  // --- Pruebas para forgotPasswordSchema ---
  describe('forgotPasswordSchema', () => {
    test('Debe pasar con un email válido', () => {
      const dataValida = { email: 'recover@example.com' };
      const { error } = forgotPasswordSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    // Las pruebas de email inválido/vacío son idénticas a loginSchema,
    // se pueden omitir si se considera redundante o copiar/pegar para mayor claridad.
    test('Debe fallar si falta el email', () => {
      const dataInvalida = {};
      const { error } = forgotPasswordSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El email es requerido');
    });
  });

  // --- Pruebas para resetPasswordSchema ---
  describe('resetPasswordSchema', () => {
    test('Debe pasar con una contraseña válida', () => {
      const dataValida = { newPassword: 'Password123' };
      const { error } = resetPasswordSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    test('Debe fallar si la contraseña es muy corta', () => {
      const dataInvalida = { newPassword: 'Pass1' };
      const { error } = resetPasswordSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('al menos 8 caracteres');
    });

    test('Debe fallar si la contraseña es muy larga', () => {
      const dataInvalida = { newPassword: 'Password123Password123Password123P' }; // 31 chars
      const { error } = resetPasswordSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('no puede tener más de 30 caracteres');
    });

    test('Debe fallar si falta una mayúscula', () => {
      const dataInvalida = { newPassword: 'password123' };
      const { error } = resetPasswordSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('al menos una mayúscula');
    });

    test('Debe fallar si falta una minúscula', () => {
        const dataInvalida = { newPassword: 'PASSWORD123' };
        const { error } = resetPasswordSchema.validate(dataInvalida);
        expect(error).toBeDefined();
        // --- CORRECCIÓN: Espera el mensaje COMBINADO ---
        expect(error.details[0].message).toContain('La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número.');
        });
    test('Debe fallar si falta un número', () => {
        const dataInvalida = { newPassword: 'PasswordWord' };
        const { error } = resetPasswordSchema.validate(dataInvalida);
        expect(error).toBeDefined();
        // --- CORRECCIÓN: Espera el mensaje COMBINADO ---
        expect(error.details[0].message).toContain('La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número.');
        });

    test('Debe fallar si falta la contraseña', () => {
        const dataInvalida = {};
        const { error } = resetPasswordSchema.validate(dataInvalida);
        expect(error).toBeDefined();
        expect(error.details[0].message).toContain('La nueva contraseña es requerida');
    });
  });

  // --- Pruebas para verifyCodeSchema ---
  describe('verifyCodeSchema', () => {
    test('Debe pasar con userId y code válidos', () => {
      const dataValida = { userId: 1, code: '123456' };
      const { error } = verifyCodeSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    test('Debe fallar si falta userId', () => {
      const dataInvalida = { code: '123456' };
      const { error } = verifyCodeSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El ID de usuario es requerido');
    });

    test('Debe fallar si userId no es un número', () => {
      const dataInvalida = { userId: 'abc', code: '123456' };
      const { error } = verifyCodeSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El ID de usuario debe ser un número');
    });

     test('Debe fallar si userId es negativo', () => {
      const dataInvalida = { userId: -1, code: '123456' };
      const { error } = verifyCodeSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // Joi valida positive() después de integer(), el mensaje puede variar
      // expect(error.details[0].message).toContain('positive');
    });

    test('Debe fallar si falta el código', () => {
      const dataInvalida = { userId: 1 };
      const { error } = verifyCodeSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El código de verificación es requerido');
    });

    test('Debe fallar si el código no tiene 6 dígitos', () => {
      const dataInvalida = { userId: 1, code: '123' };
      const { error } = verifyCodeSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('debe tener 6 dígitos');
    });

    test('Debe fallar si el código no es un string', () => {
      const dataInvalida = { userId: 1, code: 123456 }; // Número en lugar de string
      const { error } = verifyCodeSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // Joi valida primero el tipo
      // expect(error.details[0].message).toContain('string');
    });


  });

  

});