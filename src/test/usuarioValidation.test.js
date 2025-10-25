// Importamos los esquemas a probar
const {
  crearUsuarioSchema,
  actualizarUsuarioSchema,
  eliminarUsuarioSchema,
  obtenerUsuarioSchema
} = require('../validators/usuarioValidation'); // Asegúrate que la ruta sea correcta

describe('Pruebas Unitarias para Validadores de Usuarios', () => {

  // --- Pruebas para crearUsuarioSchema ---
  describe('crearUsuarioSchema', () => {
    let usuarioValido;

    beforeEach(() => {
      usuarioValido = {
        nombre: 'Usuario Prueba',
        email: 'prueba@gmail.com', // Asume que @gmail.com es válido
        // --- CORRECCIÓN: Contraseña que cumple complejidad (ej: símbolo) ---
        password: 'Password123!',
        // --- CORRECCIÓN: Rol válido según tu esquema (ej: Empleado) ---
        rol: 'Empleado' // Ajusta si tus roles válidos son otros
      };
    });

    test('Debe pasar con todos los campos requeridos válidos', () => {
      // Ahora usuarioValido tiene contraseña y rol válidos
      const { error } = crearUsuarioSchema.validate(usuarioValido);
      expect(error).toBeUndefined();
    });

    test('Debe fallar si falta nombre', () => {
      const { nombre, ...dataInvalida } = usuarioValido;
      const { error } = crearUsuarioSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El nombre es obligatorio.'); // Ajustado
    });

    test('Debe fallar si nombre está vacío', () => {
      const dataInvalida = { ...usuarioValido, nombre: '' };
      const { error } = crearUsuarioSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El nombre no puede estar vacío');
    });

    test('Debe fallar si falta email', () => {
      const { email, ...dataInvalida } = usuarioValido;
      const { error } = crearUsuarioSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El correo electrónico es obligatorio.'); // Ajustado
    });

    test('Debe fallar si email tiene formato inválido', () => {
      const dataInvalida = { ...usuarioValido, email: 'correo-invalido' };
      const { error } = crearUsuarioSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // --- CORRECCIÓN: Mensaje real de tu regla de email ---
      // Si tienes una regla específica de @gmail.com, ese mensaje aparecerá
      // Si no, será el mensaje genérico de Joi para formato de email
      // Ajusta según el mensaje exacto que te dio el log:
      expect(error.details[0].message).toContain('El correo electrónico debe ser una cuenta válida de @gmail.com.'); // O el mensaje genérico si aplica
    });

    test('Debe fallar si falta password', () => {
      const { password, ...dataInvalida } = usuarioValido;
      const { error } = crearUsuarioSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('La contraseña es obligatoria.'); // Ajustado
    });

    // --- NUEVA PRUEBA: Contraseña no cumple complejidad ---
    test('Debe fallar si la contraseña no cumple la complejidad', () => {
        const dataInvalida = { ...usuarioValido, password: 'password' }; // Sin mayúscula, número, símbolo
        const { error } = crearUsuarioSchema.validate(dataInvalida);
        expect(error).toBeDefined();
        // --- CORRECCIÓN: Espera el mensaje real de complejidad ---
        expect(error.details[0].message).toContain('La contraseña debe tener al menos 8 caracteres, incluir mayúscula, minúscula, número y símbolo.');
    });


    test('Debe fallar si falta rol', () => {
      const { rol, ...dataInvalida } = usuarioValido;
      const { error } = crearUsuarioSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El rol es obligatorio.'); // Ajustado
    });

    test('Debe fallar si el rol no es uno de los permitidos', () => {
      const dataInvalida = { ...usuarioValido, rol: 'invitado' };
      const { error } = crearUsuarioSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // --- CORRECCIÓN: Mensaje real de tu validador de roles ---
      expect(error.details[0].message).toContain('El rol debe ser: Empleado o Administrador.'); // Ajusta según tu mensaje exacto
    });
  });


  // --- Pruebas para actualizarUsuarioSchema ---
  describe('actualizarUsuarioSchema', () => {
    test('Debe pasar con id, nombre, email y rol válidos', () => {
        // --- CORRECCIÓN: Usa un rol válido ---
        const dataValida = { id: 1, nombre: 'Nombre Actualizado', email: 'update@gmail.com', rol: 'Administrador' }; // Ajusta si tus roles son otros
        const { error } = actualizarUsuarioSchema.validate(dataValida);
        expect(error).toBeUndefined();
    });

    // Asumiendo que tu esquema SÍ requiere todos los campos en la actualización
    test('Debe fallar si solo se envía el id', () => {
      const dataInvalida = { id: 1 };
      const { error } = actualizarUsuarioSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // --- CORRECCIÓN: Joi reporta el primer campo requerido faltante ---
      expect(error.details[0].message).toContain('El nombre es obligatorio.'); // O el que Joi reporte primero
    });

    test('Debe fallar si falta el id', () => {
      const dataInvalida = { nombre: 'Sin ID', email: 'sinid@gmail.com', rol: 'Empleado' };
      const { error } = actualizarUsuarioSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El id es obligatorio.'); // Ajustado
    });

    test('Debe fallar si el email de actualización es inválido', () => {
      const dataInvalida = { id: 1, nombre: "Nombre Valido", email: 'bad-email', rol: "Empleado" };
      const { error } = actualizarUsuarioSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // --- CORRECCIÓN: Mensaje real de Joi para formato de email ---
      expect(error.details[0].message).toContain('El email debe tener un formato válido.');
    });

     test('Debe fallar si el rol de actualización no es válido', () => {
      const dataInvalida = { id: 1, nombre: "Nombre Valido", email: 'valido@gmail.com', rol: 'superadmin' };
      const { error } = actualizarUsuarioSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // --- CORRECCIÓN: Mensaje real de tu validador de roles ---
      expect(error.details[0].message).toContain('El rol debe ser: Empleado o Administrador.');
    });
  });

  // --- Pruebas para eliminarUsuarioSchema ---
  describe('eliminarUsuarioSchema', () => {
    test('Debe pasar con un id válido', () => {
      const dataValida = { id: 1 };
      const { error } = eliminarUsuarioSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    test('Debe fallar si falta el id', () => {
      const dataInvalida = {};
      const { error } = eliminarUsuarioSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El ID de usuario es obligatorio.'); // Ajustado
    });

    test('Debe fallar si el id no es un número', () => {
      const dataInvalida = { id: 'uno' };
      const { error } = eliminarUsuarioSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('debe ser un número');
    });

    test('Debe fallar si el id es cero', () => {
      const dataInvalida = { id: 0 };
      const { error } = eliminarUsuarioSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El ID debe ser mayor que 0.'); // Ajustado
    });
  });

   // --- Pruebas para obtenerUsuarioSchema ---
  describe('obtenerUsuarioSchema', () => {
    test('Debe pasar si se envía un id válido', () => {
      const dataValida = { id: 1 };
      const { error } = obtenerUsuarioSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

     test('Debe pasar si no se envía id (para obtener todos)', () => {
      const dataValida = {};
      const { error } = obtenerUsuarioSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    test('Debe fallar si el id no es un número', () => {
      const dataInvalida = { id: 'dos' };
      const { error } = obtenerUsuarioSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('debe ser un número');
    });

     test('Debe fallar si el id es negativo', () => {
      const dataInvalida = { id: -5 };
      const { error } = obtenerUsuarioSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El ID debe ser mayor que 0.'); // Ajustado
    });
  });

});