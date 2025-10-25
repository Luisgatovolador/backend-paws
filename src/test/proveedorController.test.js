// src/test/proveedorController.test.js
const proveedorController = require('../controllers/proveedorController');
const db = require('../db/index');

jest.mock('../db/index'); // Mock de la base de datos

describe('Proveedor Controller', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('crearProveedor', () => {
    it('debería crear un proveedor exitosamente', async () => {
      const req = {
        body: { nombre: 'Proveedor1', telefono: '12345678', contacto: 'Contacto1' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      // No hay duplicados, inserción exitosa
      db.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [req.body] });

      await proveedorController.crearProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(req.body);
    });

    it('debería devolver error si nombre duplicado', async () => {
      const req = { body: { nombre: 'Proveedor1', telefono: '87654321', contacto: 'Contacto' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ nombre: 'Proveedor1', telefono: '11111111' }] });

      await proveedorController.crearProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error: Ya existe un proveedor con el nombre "Proveedor1".' });
    });

    it('debería devolver error si teléfono duplicado', async () => {
      const req = { body: { nombre: 'Proveedor2', telefono: '12345678', contacto: 'Contacto' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ nombre: 'Otro', telefono: '12345678' }] });

      await proveedorController.crearProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error: Ya existe un proveedor con el teléfono "12345678".' });
    });

    it('debería devolver error 400 si datos inválidos', async () => {
      const req = { body: { nombre: '', telefono: 'abc', contacto: 'Contacto' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await proveedorController.crearProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveProperty('message');
    });
  });

  describe('obtenerProveedores', () => {
    it('debería devolver lista de proveedores', async () => {
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      db.query.mockResolvedValueOnce({ rows: [{ nombre: 'Proveedor1' }] });

      await proveedorController.obtenerProveedores({}, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ nombre: 'Proveedor1' }]);
    });

    it('debería manejar error de BD', async () => {
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      db.query.mockRejectedValueOnce(new Error('DB Error'));

      await proveedorController.obtenerProveedores({}, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveProperty('message');
    });
  });

  describe('actualizarProveedor', () => {
    it('debería actualizar proveedor exitosamente', async () => {
      const req = { body: { id_proveedor: 1, nombre: 'Nuevo' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      db.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // No hay duplicados
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_proveedor: 1, nombre: 'Viejo', telefono: '111', contacto: 'X' }] }) // Obtener actual
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_proveedor: 1, nombre: 'Nuevo', telefono: '111', contacto: 'X' }] }); // Update

      await proveedorController.actualizarProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ id_proveedor: 1, nombre: 'Nuevo', telefono: '111', contacto: 'X' });
    });

    it('debería devolver error 400 si falta id_proveedor', async () => {
      const req = { body: { nombre: 'Nuevo' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await proveedorController.actualizarProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveProperty('message');
    });
  });

  describe('eliminarProveedor', () => {
    it('debería eliminar proveedor exitosamente', async () => {
      const req = { body: { id_proveedor: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id_proveedor: 1 }] });

      await proveedorController.eliminarProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Proveedor eliminado exitosamente.',
        proveedor: { id_proveedor: 1 }
      });
    });

    it('debería devolver 404 si proveedor no existe', async () => {
      const req = { body: { id_proveedor: 999 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await proveedorController.eliminarProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveProperty('message', 'Proveedor no encontrado.');
    });

    it('debería devolver 400 si falta id_proveedor', async () => {
      const req = { body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await proveedorController.eliminarProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveProperty('message', 'El campo id_proveedor es requerido.');
    });
  });

});
