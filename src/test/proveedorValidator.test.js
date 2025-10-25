// Importamos los esquemas a probar
const {
  crearProveedorSchema,
  actualizarProveedorSchema,
  buscarProveedorSchema
} = require('../validators/proveedorValidator'); // Asegúrate que la ruta sea correcta

describe('Pruebas Unitarias para Validadores de Proveedores', () => {

  // --- Pruebas para crearProveedorSchema ---
  describe('crearProveedorSchema', () => {
    let proveedorValido;

    // Datos válidos básicos
    beforeEach(() => {
      proveedorValido = {
        nombre: 'Proveedor de Ejemplo',
        telefono: '4181234567'
      };
    });

    test('Debe pasar con nombre y teléfono válidos', () => {
      const { error } = crearProveedorSchema.validate(proveedorValido);
      expect(error).toBeUndefined();
    });

    test('Debe pasar con contacto opcional válido', () => {
      const data = { ...proveedorValido, contacto: 'Juan Pérez Ventas' };
      const { error } = crearProveedorSchema.validate(data);
      expect(error).toBeUndefined();
    });

    test('Debe pasar con contacto opcional nulo', () => {
      const data = { ...proveedorValido, contacto: null };
      const { error } = crearProveedorSchema.validate(data);
      expect(error).toBeUndefined();
    });

     test('Debe pasar con contacto opcional vacío', () => {
      const data = { ...proveedorValido, contacto: '' };
      const { error } = crearProveedorSchema.validate(data);
      expect(error).toBeUndefined();
    });

    // --- Pruebas para nombre ---
    test('Debe fallar si falta nombre', () => {
      const { nombre, ...dataInvalida } = proveedorValido;
      const { error } = crearProveedorSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El nombre es obligatorio');
    });

    test('Debe fallar si nombre tiene números', () => {
      const dataInvalida = { ...proveedorValido, nombre: 'Proveedor 123' };
      const { error } = crearProveedorSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('nombre solo puede contener letras y espacios');
    });

     test('Debe fallar si nombre excede 100 caracteres', () => {
      const dataInvalida = { ...proveedorValido, nombre: 'a'.repeat(101) };
      const { error } = crearProveedorSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('nombre no puede exceder los 100 caracteres');
    });

    // --- Pruebas para telefono ---
     test('Debe fallar si falta telefono', () => {
      const { telefono, ...dataInvalida } = proveedorValido;
      const { error } = crearProveedorSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El teléfono es obligatorio');
    });

    test('Debe fallar si telefono tiene letras', () => {
      const dataInvalida = { ...proveedorValido, telefono: '418ABCDEFG' };
      const { error } = crearProveedorSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('teléfono solo puede contener números');
    });

     test('Debe fallar si telefono es muy corto', () => {
      const dataInvalida = { ...proveedorValido, telefono: '1234567' }; // 7 dígitos
      const { error } = crearProveedorSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('teléfono debe tener al menos 8 dígitos');
    });

     test('Debe fallar si telefono es muy largo', () => {
      const dataInvalida = { ...proveedorValido, telefono: '1234567890123456' }; // 16 dígitos
      const { error } = crearProveedorSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('teléfono no puede exceder los 15 dígitos');
    });

    // --- Pruebas para contacto ---
    test('Debe fallar si contacto excede 100 caracteres', () => {
      const dataInvalida = { ...proveedorValido, contacto: 'a'.repeat(101) };
      const { error } = crearProveedorSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('contacto no puede exceder los 100 caracteres');
    });
  });

  // --- Pruebas para actualizarProveedorSchema ---
  describe('actualizarProveedorSchema', () => {
    test('Debe pasar si se envía al menos un campo válido (nombre)', () => {
      const dataValida = { nombre: 'Nombre Actualizado' };
      const { error } = actualizarProveedorSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    test('Debe pasar si se envía al menos un campo válido (telefono)', () => {
      const dataValida = { telefono: '9876543210' };
      const { error } = actualizarProveedorSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    test('Debe pasar si se envía al menos un campo válido (contacto)', () => {
      const dataValida = { contacto: 'Nuevo Contacto' };
      const { error } = actualizarProveedorSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

     test('Debe pasar si se envían múltiples campos válidos', () => {
      const dataValida = { nombre: 'Nombre OK', telefono: '1122334455' };
      const { error } = actualizarProveedorSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    test('Debe fallar si no se envía ningún campo para actualizar', () => {
      const dataInvalida = {};
      const { error } = actualizarProveedorSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Debes proporcionar al menos un campo para actualizar');
    });

    // Pruebas de formato inválido (similares a crearProveedorSchema)
    test('Debe fallar si nombre tiene números al actualizar', () => {
      const dataInvalida = { nombre: 'Proveedor 999' };
      const { error } = actualizarProveedorSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('nombre solo puede contener letras y espacios');
    });

     test('Debe fallar si telefono tiene letras al actualizar', () => {
      const dataInvalida = { telefono: 'Telefono Mal' };
      const { error } = actualizarProveedorSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('teléfono solo puede contener números');
    });
  });

   // --- Pruebas para buscarProveedorSchema ---
  describe('buscarProveedorSchema', () => {
    test('Debe pasar si se envía solo id_proveedor válido', () => {
      const dataValida = { id_proveedor: 1 };
      const { error } = buscarProveedorSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    test('Debe pasar si se envía solo nombre válido', () => {
      const dataValida = { nombre: 'Proveedor Buscado' };
      const { error } = buscarProveedorSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    test('Debe pasar si se envían id_proveedor y nombre válidos', () => {
      const dataValida = { id_proveedor: 1, nombre: 'Proveedor Buscado' };
      const { error } = buscarProveedorSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    test('Debe pasar si se envía un objeto vacío (para obtener todos)', () => {
      const dataValida = {};
      const { error } = buscarProveedorSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    // Pruebas de formato inválido
    test('Debe fallar si id_proveedor no es un entero', () => {
      const dataInvalida = { id_proveedor: 1.5 };
      const { error } = buscarProveedorSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // Joi error for integer
    });

     test('Debe fallar si id_proveedor es cero', () => {
      const dataInvalida = { id_proveedor: 0 };
      const { error } = buscarProveedorSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // Joi error for min(1)
    });

     test('Debe fallar si nombre excede 100 caracteres', () => {
      const dataInvalida = { nombre: 'a'.repeat(101) };
      const { error } = buscarProveedorSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // Joi error for max(100)
    });
  });
});