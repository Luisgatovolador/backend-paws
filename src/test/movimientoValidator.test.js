// Importamos los esquemas a probar
const {
  createMovimientoSchema,
  getMovimientosByProductSchema
} = require('../validators/movimientoValidators'); // Asegúrate que el nombre del archivo sea correcto

describe('Pruebas Unitarias para Validadores de Movimientos', () => {

  // --- Pruebas para createMovimientoSchema ---
  describe('createMovimientoSchema', () => {
    let movimientoValido;

    // Datos válidos básicos para usar en varias pruebas
    beforeEach(() => {
      movimientoValido = {
        id_producto: 1,
        tipo: 'Entrada',
        cantidad: 10,
        responsable: 'Admin Stock'
      };
    });

    test('Debe pasar con todos los campos requeridos y válidos', () => {
      const { error } = createMovimientoSchema.validate(movimientoValido);
      expect(error).toBeUndefined();
    });

    test('Debe pasar con referencia opcional', () => {
      const data = { ...movimientoValido, referencia: 'Factura #123' };
      const { error } = createMovimientoSchema.validate(data);
      expect(error).toBeUndefined();
    });

     test('Debe pasar con referencia opcional vacía', () => {
      const data = { ...movimientoValido, referencia: '' };
      const { error } = createMovimientoSchema.validate(data);
      expect(error).toBeUndefined();
    });

    // --- Pruebas para id_producto ---
    test('Debe fallar si falta id_producto', () => {
      const { id_producto, ...dataInvalida } = movimientoValido;
      const { error } = createMovimientoSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('ID del producto es obligatorio');
    });

    test('Debe fallar si id_producto no es un número', () => {
      const dataInvalida = { ...movimientoValido, id_producto: 'abc' };
      const { error } = createMovimientoSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('ID del producto debe ser un número');
    });

    test('Debe fallar si id_producto es cero', () => {
      const dataInvalida = { ...movimientoValido, id_producto: 0 };
      const { error } = createMovimientoSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('ID del producto debe ser positivo');
    });

    // --- Pruebas para tipo ---
    test('Debe fallar si falta tipo', () => {
      const { tipo, ...dataInvalida } = movimientoValido;
      const { error } = createMovimientoSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('tipo de movimiento es obligatorio');
    });

    test('Debe fallar si tipo no es "Entrada" ni "Salida"', () => {
      const dataInvalida = { ...movimientoValido, tipo: 'Transferencia' };
      const { error } = createMovimientoSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('tipo debe ser "Entrada" o "Salida"');
    });

    // --- Pruebas para cantidad ---
    test('Debe fallar si falta cantidad', () => {
      const { cantidad, ...dataInvalida } = movimientoValido;
      const { error } = createMovimientoSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('La cantidad es obligatoria');
    });

    test('Debe fallar si cantidad es cero', () => {
      const dataInvalida = { ...movimientoValido, cantidad: 0 };
      const { error } = createMovimientoSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('cantidad debe ser un número positivo');
    });

     test('Debe fallar si cantidad no es un entero', () => {
      const dataInvalida = { ...movimientoValido, cantidad: 5.5 };
      const { error } = createMovimientoSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('cantidad debe ser un número entero');
    });

    // --- Pruebas para referencia ---
    test('Debe fallar si referencia excede los 50 caracteres', () => {
      const dataInvalida = { ...movimientoValido, referencia: 'a'.repeat(51) };
      const { error } = createMovimientoSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('referencia no debe exceder 50 caracteres');
    });

    // --- Pruebas para responsable ---
    test('Debe fallar si falta responsable', () => {
      const { responsable, ...dataInvalida } = movimientoValido;
      const { error } = createMovimientoSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('nombre del responsable es obligatorio');
    });

    test('Debe fallar si responsable tiene números', () => {
      const dataInvalida = { ...movimientoValido, responsable: 'Admin 123' };
      const { error } = createMovimientoSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('responsable solo puede contener letras y espacios');
    });

    test('Debe fallar si responsable excede los 80 caracteres', () => {
      const dataInvalida = { ...movimientoValido, responsable: 'a'.repeat(81) };
      const { error } = createMovimientoSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('responsable no debe exceder 80 caracteres');
    });
  });

  // --- Pruebas para getMovimientosByProductSchema ---
  describe('getMovimientosByProductSchema', () => {
    test('Debe pasar con un id_producto válido', () => {
      const dataValida = { id_producto: 1 };
      const { error } = getMovimientosByProductSchema.validate(dataValida);
      expect(error).toBeUndefined();
    });

    test('Debe fallar si falta id_producto', () => {
      const dataInvalida = {};
      const { error } = getMovimientosByProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('ID del producto es obligatorio');
    });

    test('Debe fallar si id_producto no es un número', () => {
      const dataInvalida = { id_producto: 'xyz' };
      const { error } = getMovimientosByProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('ID del producto debe ser un número');
    });

    test('Debe fallar si id_producto es negativo', () => {
      const dataInvalida = { id_producto: -1 };
      const { error } = getMovimientosByProductSchema.validate(dataInvalida);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('ID del producto debe ser positivo');
    });
  });

});