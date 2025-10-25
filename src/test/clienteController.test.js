// Importamos las funciones del controlador a probar
const clienteController = require('../controllers/clienteController');

// Importamos (y simularemos) las dependencias
const db = require('../db/index');
const {
  crearClienteSchema,
  actualizarClienteSchema,
  buscarClienteSchema
} = require('../validators/clienteValidator');
// --- SIMULACIÓN (MOCKING) DE DEPENDENCIAS ---
jest.mock('../db/index');
// Mockeamos todo el módulo validador
jest.mock('../validators/clienteValidator', () => ({
  crearClienteSchema: { validate: jest.fn() },
  actualizarClienteSchema: { validate: jest.fn() },
  buscarClienteSchema: { validate: jest.fn() }
}));


// --- FUNCIONES DE AYUDA PARA MOCKS ---
const mockRequest = (body = {}, params = {}, user = null) => ({
  body,
  params,
  user,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// --- INICIO DE LAS PRUEBAS ---
describe('Pruebas Unitarias para clienteController', () => {

  // Limpiar mocks después de cada prueba
  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- Pruebas para crearCliente ---
  describe('crearCliente', () => {
    let req;
    let res;
    const clienteData = { nombre: 'Cliente Nuevo', telefono: '9876543210', contacto: 'Gerente' };
    const mockCreatedClient = { id_cliente: 1, ...clienteData };

    beforeEach(() => {
      req = mockRequest(clienteData);
      res = mockResponse();
      // Simula validación Joi exitosa por defecto
      crearClienteSchema.validate.mockReturnValue({ error: null, value: clienteData });
      // Simula que no existen duplicados por defecto
      db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    });

    test('Debe fallar (400) si la validación de Joi falla', async () => {
      const validationError = { details: [{ message: 'Nombre inválido simulado.' }] };
      crearClienteSchema.validate.mockReturnValue({ error: validationError }); // Simula error Joi
      await clienteController.crearCliente(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: validationError.details[0].message });
      expect(db.query).not.toHaveBeenCalled(); // No debe consultar BD si Joi falla
    });

    test('Debe fallar (409) si ya existe un cliente con el mismo nombre', async () => {
      // Simula que la BD encuentra un duplicado por nombre
      db.query.mockResolvedValue({ rows: [{ nombre: clienteData.nombre, telefono: 'otroTelefono' }], rowCount: 1 });
      await clienteController.crearCliente(req, res);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT nombre, telefono FROM clientes'), [clienteData.nombre, clienteData.telefono]);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining(`Ya existe un cliente con el nombre "${clienteData.nombre}"`) });
    });

    test('Debe fallar (409) si ya existe un cliente con el mismo teléfono', async () => {
      // Simula que la BD encuentra un duplicado por teléfono
      db.query.mockResolvedValue({ rows: [{ nombre: 'Otro Nombre', telefono: clienteData.telefono }], rowCount: 1 });
      await clienteController.crearCliente(req, res);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT nombre, telefono FROM clientes'), [clienteData.nombre, clienteData.telefono]);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining(`Ya existe un cliente con el teléfono "${clienteData.telefono}"`) });
    });

    test('Debe crear el cliente (201) si los datos son válidos y no hay duplicados', async () => {
      // Simula que SELECT no encuentra duplicados (ya en beforeEach)
      // Simula que INSERT es exitoso
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Para la búsqueda de duplicados
      db.query.mockResolvedValueOnce({ rows: [mockCreatedClient], rowCount: 1 }); // Para el INSERT

      await clienteController.crearCliente(req, res);

      // Verifica la búsqueda de duplicados
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT nombre, telefono'), [clienteData.nombre, clienteData.telefono]);
      // Verifica la inserción
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO clientes'), [clienteData.nombre, clienteData.telefono, clienteData.contacto]);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockCreatedClient);
    });

    test('Debe manejar errores de base de datos durante la creación', async () => {
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Búsqueda OK
      // Simula error en INSERT
      db.query.mockRejectedValueOnce(new Error('Error de BD simulado'));

      await clienteController.crearCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor.' });
    });
  });

  // --- Pruebas para obtenerClientes ---
  describe('obtenerClientes', () => {
    let req;
    let res;

    beforeEach(() => {
      req = mockRequest();
      res = mockResponse();
    });

    test('Debe devolver la lista de clientes (200)', async () => {
      const mockClientes = [{ id_cliente: 1, nombre: 'Cliente A' }, { id_cliente: 2, nombre: 'Cliente B' }];
      db.query.mockResolvedValue({ rows: mockClientes, rowCount: mockClientes.length });

      await clienteController.obtenerClientes(req, res);

      expect(db.query).toHaveBeenCalledWith('SELECT * FROM clientes ORDER BY nombre ASC');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockClientes);
    });

     test('Debe devolver una lista vacía (200) si no hay clientes', async () => {
      db.query.mockResolvedValue({ rows: [], rowCount: 0 });
      await clienteController.obtenerClientes(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    test('Debe manejar errores de base de datos', async () => {
      db.query.mockRejectedValue(new Error('Error de conexión simulado'));
      await clienteController.obtenerClientes(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor.' });
    });
  });

  // --- Pruebas para obtenerClientePorId (búsqueda flexible) ---
  describe('obtenerClientePorId', () => {
      let req;
      let res;
      const mockClient = { id_cliente: 1, nombre: 'Cliente Buscado', telefono: '111222333' };

      beforeEach(() => {
          res = mockResponse();
          // Simula validación exitosa por defecto
          buscarClienteSchema.validate.mockImplementation((data) => ({ error: null, value: data }));
      });

      test('Debe fallar (400) si la validación de Joi falla', async () => {
          req = mockRequest({ id_cliente: -1 }); // ID inválido
          const validationError = { details: [{ message: 'ID inválido simulado.' }] };
          buscarClienteSchema.validate.mockReturnValue({ error: validationError }); // Simula error Joi
          await clienteController.obtenerClientePorId(req, res);
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({ message: validationError.details[0].message });
      });

      test('Debe buscar por ID si se proporciona id_cliente', async () => {
          req = mockRequest({ id_cliente: 1 });
          db.query.mockResolvedValue({ rows: [mockClient], rowCount: 1 });
          await clienteController.obtenerClientePorId(req, res);
          expect(db.query).toHaveBeenCalledWith('SELECT * FROM clientes WHERE id_cliente = $1 ORDER BY nombre ASC', [1]);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith([mockClient]); // Devuelve array
      });

      test('Debe buscar por nombre (ILIKE) si se proporciona nombre', async () => {
          req = mockRequest({ nombre: 'Buscado' });
          db.query.mockResolvedValue({ rows: [mockClient], rowCount: 1 });
          await clienteController.obtenerClientePorId(req, res);
          expect(db.query).toHaveBeenCalledWith('SELECT * FROM clientes WHERE nombre ILIKE $1 ORDER BY nombre ASC', ['%Buscado%']);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith([mockClient]); // Devuelve array
      });

      test('Debe buscar por ID o Nombre si se proporcionan ambos', async () => {
          req = mockRequest({ id_cliente: 1, nombre: 'Buscado' });
           db.query.mockResolvedValue({ rows: [mockClient], rowCount: 1 });
          await clienteController.obtenerClientePorId(req, res);
          expect(db.query).toHaveBeenCalledWith('SELECT * FROM clientes WHERE id_cliente = $1 OR nombre ILIKE $2 ORDER BY nombre ASC', [1, '%Buscado%']);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith([mockClient]);
      });

      test('Debe obtener todos los clientes si el body está vacío', async () => {
          req = mockRequest({});
          const allClients = [mockClient, { id_cliente: 2, nombre: 'Otro Cliente' }];
          db.query.mockResolvedValue({ rows: allClients, rowCount: 2 });
          await clienteController.obtenerClientePorId(req, res);
          expect(db.query).toHaveBeenCalledWith('SELECT * FROM clientes ORDER BY nombre ASC', []); // Sin WHERE
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith(allClients);
      });

       test('Debe devolver 404 si se busca por ID o nombre y no se encuentra', async () => {
          req = mockRequest({ nombre: 'Inexistente' });
          db.query.mockResolvedValue({ rows: [], rowCount: 0 }); // No encontrado
          await clienteController.obtenerClientePorId(req, res);
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.json).toHaveBeenCalledWith({ message: 'Cliente no encontrado.' });
      });

       test('Debe devolver [] si no se busca nada y la tabla está vacía', async () => {
          req = mockRequest({});
          db.query.mockResolvedValue({ rows: [], rowCount: 0 }); // Tabla vacía
          await clienteController.obtenerClientePorId(req, res);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith([]); // Devuelve array vacío, no 404
      });

      test('Debe manejar errores de base de datos', async () => {
          req = mockRequest({ id_cliente: 1 });
          db.query.mockRejectedValue(new Error('Error de búsqueda simulado'));
          await clienteController.obtenerClientePorId(req, res);
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor.' });
      });
  });

  // --- Pruebas para actualizarCliente ---
  describe('actualizarCliente', () => {
      let req;
      let res;
      const clientId = 1;
      const updateData = { nombre: 'Nombre Actualizado', telefono: '1112223330' };
      const currentClient = { id_cliente: clientId, nombre: 'Nombre Viejo', telefono: '000000000', contacto: 'Viejo' };
      const updatedClient = { id_cliente: clientId, ...updateData, contacto: 'Viejo' };

      beforeEach(() => {
          req = mockRequest({ id_cliente: clientId, ...updateData });
          res = mockResponse();
          // Simula Joi exitoso
          actualizarClienteSchema.validate.mockImplementation((data) => ({ error: null, value: data }));
           // Simula que no hay conflictos de duplicados por defecto
          db.query.mockResolvedValue({ rows: [], rowCount: 0 });
      });

       test('Debe fallar (400) si falta id_cliente en el body', async () => {
          req = mockRequest(updateData); // Sin id_cliente
          await clienteController.actualizarCliente(req, res);
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({ message: 'El campo id_cliente es requerido para actualizar.' });
      });

      test('Debe fallar (400) si la validación de Joi falla', async () => {
          req = mockRequest({ id_cliente: clientId, telefono: 'INVALIDO' });
          const validationError = { details: [{ message: 'Teléfono inválido simulado.' }] };
          actualizarClienteSchema.validate.mockReturnValue({ error: validationError });
          await clienteController.actualizarCliente(req, res);
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({ message: validationError.details[0].message });
      });

      test('Debe fallar (409) si el nuevo nombre o teléfono ya existen en otro cliente', async () => {
          // Simula que la búsqueda de duplicados SÍ encuentra otro cliente
          db.query.mockResolvedValueOnce({ rows: [{ id_cliente: 2 /* Otro ID */ }], rowCount: 1 });
          await clienteController.actualizarCliente(req, res);
          expect(db.query).toHaveBeenCalledWith(
              expect.stringContaining('SELECT * FROM clientes WHERE (nombre = $1 OR telefono = $2) AND id_cliente != $3'),
              [updateData.nombre, updateData.telefono, clientId]
          );
          expect(res.status).toHaveBeenCalledWith(409);
          expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('ya está en uso por otro cliente') });
      });

       test('Debe fallar (404) si el cliente a actualizar no existe', async () => {
          db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Búsqueda duplicados OK
          db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // SELECT actual NO ENCONTRADO
          await clienteController.actualizarCliente(req, res);
          expect(db.query).toHaveBeenCalledWith('SELECT * FROM clientes WHERE id_cliente = $1', [clientId]);
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.json).toHaveBeenCalledWith({ message: 'Cliente no encontrado.' });
      });


      test('Debe actualizar el cliente (200) si todo es válido', async () => {
          db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Duplicados OK
          db.query.mockResolvedValueOnce({ rows: [currentClient], rowCount: 1 }); // SELECT actual OK
          db.query.mockResolvedValueOnce({ rows: [updatedClient], rowCount: 1 }); // UPDATE OK

          await clienteController.actualizarCliente(req, res);

          expect(db.query).toHaveBeenCalledWith(
              'UPDATE clientes SET nombre = $1, telefono = $2, contacto = $3 WHERE id_cliente = $4 RETURNING *',
              [updateData.nombre, updateData.telefono, currentClient.contacto, clientId] // Usa valores combinados
          );
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith(updatedClient);
      });

      test('Debe manejar errores de base de datos durante la actualización', async () => {
          db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Duplicados OK
          db.query.mockResolvedValueOnce({ rows: [currentClient], rowCount: 1 }); // SELECT actual OK
          db.query.mockRejectedValueOnce(new Error('Error UPDATE simulado')); // Falla UPDATE

          await clienteController.actualizarCliente(req, res);
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor.' });
      });

  });

  // --- Pruebas para eliminarCliente ---
  describe('eliminarCliente', () => {
      let req;
      let res;
      const clientId = 1;
      const mockDeletedClient = { id_cliente: clientId, nombre: 'Cliente Borrado' };

       beforeEach(() => {
          req = mockRequest({ id_cliente: clientId });
          res = mockResponse();
      });

       test('Debe fallar (400) si falta id_cliente', async () => {
          req = mockRequest({}); // Sin ID
          await clienteController.eliminarCliente(req, res);
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({ message: 'El campo id_cliente es requerido.' });
          expect(db.query).not.toHaveBeenCalled();
      });

       test('Debe fallar (404) si el cliente a eliminar no existe', async () => {
          db.query.mockResolvedValue({ rows: [], rowCount: 0 }); // DELETE no encontró nada
          await clienteController.eliminarCliente(req, res);
          expect(db.query).toHaveBeenCalledWith('DELETE FROM clientes WHERE id_cliente = $1 RETURNING *', [clientId]);
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.json).toHaveBeenCalledWith({ message: 'Cliente no encontrado.' });
      });

      test('Debe eliminar el cliente (200) si existe', async () => {
          db.query.mockResolvedValue({ rows: [mockDeletedClient], rowCount: 1 }); // DELETE exitoso
          await clienteController.eliminarCliente(req, res);
          expect(db.query).toHaveBeenCalledWith('DELETE FROM clientes WHERE id_cliente = $1 RETURNING *', [clientId]);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith({ message: 'Cliente eliminado exitosamente.', cliente: mockDeletedClient });
      });

      test('Debe fallar (409) si hay error de llave foránea (cliente asociado a movimientos)', async () => {
          const fkError = new Error('FK violation');
          fkError.code = '23503'; // Código de error FK de PostgreSQL
          db.query.mockRejectedValue(fkError);
          await clienteController.eliminarCliente(req, res);
          expect(res.status).toHaveBeenCalledWith(409);
          expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('asociado a uno o más movimientos') });
      });

       test('Debe manejar otros errores de base de datos durante la eliminación', async () => {
          db.query.mockRejectedValue(new Error('Error DELETE genérico'));
          await clienteController.eliminarCliente(req, res);
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor.' });
      });
  });
});