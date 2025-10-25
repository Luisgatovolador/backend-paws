// Importamos el esquema que vamos a probar
const { crearClienteSchema } = require('../validators/clienteValidator');

// 'describe' agrupa un conjunto de pruebas relacionadas
describe('Pruebas Unitarias para el Validador de Clientes', () => {

    // --- PRUEBAS PARA EL CAMPO 'NOMBRE' ---

    test('Debe pasar con un nombre válido', () => {
        // Ejecutar: Preparamos datos que DEBEN pasar
        const clienteValido = { nombre: 'Cliente de Prueba', telefono: '1234567890' };
        
        // Verificar: Usamos Joi para validar
        const { error } = crearClienteSchema.validate(clienteValido);
        
        // Afirmación: Esperamos que NO haya error
        expect(error).toBeUndefined();
    });

    test('Debe fallar si el nombre tiene números (Caso Extremo)', () => {
        const clienteInvalido = { nombre: 'Cliente 123', telefono: '1234567890' };
        const { error } = crearClienteSchema.validate(clienteInvalido);
        
        // Afirmación: Esperamos que SÍ haya un error
        expect(error).toBeDefined();
        // Verificamos el mensaje de error específico de la historia de usuario
        expect(error.details[0].message).toContain('solo puede contener letras y espacios');
    });

    test('Debe fallar si el nombre está vacío (Caso Extremo)', () => {
        const clienteInvalido = { nombre: '', telefono: '1234567890' };
        const { error } = crearClienteSchema.validate(clienteInvalido);
        expect(error).toBeDefined();
        expect(error.details[0].message).toContain('El nombre es obligatorio');
    });

    // --- PRUEBAS PARA EL CAMPO 'TELÉFONO' ---

    test('Debe fallar si el teléfono tiene letras (Caso Extremo)', () => {
        const clienteInvalido = { nombre: 'Cliente Valido', telefono: '12345ABCDE' };
        const { error } = crearClienteSchema.validate(clienteInvalido);
        expect(error).toBeDefined();
        expect(error.details[0].message).toContain('solo puede contener números');
    });

    test('Debe fallar si el teléfono es muy corto (Límite)', () => {
        const clienteInvalido = { nombre: 'Cliente Valido', telefono: '123' };
        const { error } = crearClienteSchema.validate(clienteInvalido);
        expect(error).toBeDefined();
        expect(error.details[0].message).toContain('al menos 8 dígitos');
    });

    test('Debe fallar si el teléfono es muy largo (Límite)', () => {
        const clienteInvalido = { nombre: 'Cliente Valido', telefono: '1234567890123456789' };
        const { error } = crearClienteSchema.validate(clienteInvalido);
        expect(error).toBeDefined();
        expect(error.details[0].message).toContain('no puede exceder los 15 dígitos');
    });

    test('Debe pasar con un contacto opcional', () => {
        const clienteValido = { 
            nombre: 'Cliente Con Contacto', 
            telefono: '1234567890',
            contacto: 'Juan Encargado'
        };
        const { error } = crearClienteSchema.validate(clienteValido);
        // Afirmación: Esperamos que NO haya error
        expect(error).toBeUndefined();
    });
});