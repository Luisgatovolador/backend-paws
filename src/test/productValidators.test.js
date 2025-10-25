// Importamos los esquemas a probar
const {
  createProductSchema,
  updateProductSchema,
  deleteProductSchema
} = require('../validators/productValidators'); // Asegúrate que la ruta sea correcta

describe('Pruebas Unitarias para Validadores de Productos', () => {

  // --- Pruebas para createProductSchema ---
  describe('createProductSchema', () => {
    let productDataValido;

    // Datos válidos básicos
    beforeEach(() => {
      productDataValido = {
        codigo: 'PROD123',
        nombre: 'Producto de Prueba',
        categoria: 'General',
        unidad: 'Pieza',
        stock_minimo: 5,
        // stock_actual es opcional
      };
    });

    test('Debe pasar con todos los campos requeridos válidos', () => {
      const { error } = createProductSchema.validate(productDataValido);
      expect(error).toBeUndefined();
    });

    test('Debe pasar con campos opcionales (descripcion, stock_actual) válidos', () => {
      const data = {
        ...productDataValido,
        descripcion: 'Descripción opcional',
        stock_actual: 10
      };
      const { error } = createProductSchema.validate(data);
      expect(error).toBeUndefined();
    });

     test('Debe pasar con descripcion vacía', () => {
      const data = { ...productDataValido, descripcion: '' };
      const { error } = createProductSchema.validate(data);
      expect(error).toBeUndefined();
    });

    // --- Pruebas para codigo ---
    test('Debe fallar si falta codigo', () => {
      const { codigo, ...dataInvalida } = productDataValido;
      const { error } = createProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El código es obligatorio');
    });

    test('Debe fallar si codigo no es alfanumérico', () => {
      const dataInvalida = { ...productDataValido, codigo: 'PROD-123!' };
      const { error } = createProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('código debe ser alfanumérico');
    });

     test('Debe fallar si codigo excede 20 caracteres', () => {
      const dataInvalida = { ...productDataValido, codigo: 'a'.repeat(21) };
      const { error } = createProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('código no debe exceder 20 caracteres');
    });


    // --- Pruebas para nombre ---
    test('Debe fallar si falta nombre', () => {
      const { nombre, ...dataInvalida } = productDataValido;
      const { error } = createProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El nombre es obligatorio');
    });

    test('Debe fallar si nombre tiene caracteres no permitidos', () => {
      const dataInvalida = { ...productDataValido, nombre: 'Producto $123' };
      const { error } = createProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('nombre solo puede contener letras y espacios');
    });

    // --- Pruebas para categoria ---
    test('Debe fallar si falta categoria', () => {
      const { categoria, ...dataInvalida } = productDataValido;
      const { error } = createProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('La categoría es obligatoria');
    });

    // --- Pruebas para unidad ---
    test('Debe fallar si falta unidad', () => {
      const { unidad, ...dataInvalida } = productDataValido;
      const { error } = createProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('La unidad es obligatoria');
    });

    // --- Pruebas para stock_minimo ---
    test('Debe fallar si falta stock_minimo', () => {
      const { stock_minimo, ...dataInvalida } = productDataValido;
      const { error } = createProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('stock mínimo es obligatorio');
    });

    test('Debe fallar si stock_minimo es negativo', () => {
      const dataInvalida = { ...productDataValido, stock_minimo: -1 };
      const { error } = createProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('stock mínimo no puede ser negativo');
    });

    // --- Pruebas para stock_actual (opcional) ---
    test('Debe fallar si stock_actual es negativo', () => {
        const dataInvalida = { ...productDataValido, stock_actual: -5 };
        const { error } = createProductSchema.validate(dataInvalida);
        expect(error).toBeDefined();
        expect(error.details[0].message).toContain('stock actual no puede ser negativo');
    });

     test('Debe fallar si stock_actual no es entero', () => {
        const dataInvalida = { ...productDataValido, stock_actual: 10.5 };
        const { error } = createProductSchema.validate(dataInvalida);
        expect(error).toBeDefined();
        expect(error.details[0].message).toContain('stock actual debe ser un número entero');
    });
  });

  // --- Pruebas para updateProductSchema ---
  describe('updateProductSchema', () => {
    test('Debe pasar con id_producto y al menos otro campo válido', () => {
      const dataValida = { id_producto: 1, nombre: 'Nombre Actualizado' };
      const { error } = updateProductSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

     test('Debe pasar actualizando múltiples campos válidos', () => {
      const dataValida = {
        id_producto: 1,
        codigo: 'NEWCODE',
        descripcion: 'Desc actualizada',
        stock_minimo: 10
      };
      const { error } = updateProductSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    test('Debe fallar si solo se envía id_producto', () => {
      const dataInvalida = { id_producto: 1 };
      const { error } = updateProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Debe proporcionar el ID del producto y al menos un campo para actualizar');
    });

    test('Debe fallar si falta id_producto', () => {
      const dataInvalida = { nombre: 'Nombre Nuevo' };
      const { error } = updateProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // Joi requiere id_producto explícitamente
      // expect(error.details[0].message).toContain('is required');
    });

    test('Debe fallar si se intenta actualizar stock_actual', () => {
      const dataInvalida = { id_producto: 1, stock_actual: 100 };
      const { error } = updateProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('El Stock_Actual se gestiona a través de Movimientos');
    });

    // Se podrían añadir pruebas para formatos inválidos en los campos opcionales
    // (ej. código con símbolos, stock_minimo negativo), serían similares a createProductSchema
  });

  // --- Pruebas para deleteProductSchema ---
  describe('deleteProductSchema', () => {
    test('Debe pasar con un id_producto válido', () => {
      const dataValida = { id_producto: 1 };
      const { error } = deleteProductSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    test('Debe fallar si falta id_producto', () => {
      const dataInvalida = {};
      const { error } = deleteProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // expect(error.details[0].message).toContain('is required');
    });

    test('Debe fallar si id_producto no es un número', () => {
      const dataInvalida = { id_producto: 'uno' };
      const { error } = deleteProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // expect(error.details[0].message).toContain('must be a number');
    });

     test('Debe fallar si id_producto es cero', () => {
      const dataInvalida = { id_producto: 0 };
      const { error } = deleteProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      // expect(error.details[0].message).toContain('must be positive');
    });
  });
});