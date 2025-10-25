const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

jest.mock('../db/index', () => ({
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue(true),
}));

const db = require('../db/index');
const proveedorController = require('../controllers/proveedorController');

const app = express();
app.use(bodyParser.json());

// Rutas
app.post('/api/proveedores', proveedorController.crearProveedor);
app.get('/api/proveedores', proveedorController.obtenerProveedores);
app.post('/api/proveedores/detail', proveedorController.obtenerProveedorPorId);
app.put('/api/proveedores/update', proveedorController.actualizarProveedor);
app.delete('/api/proveedores/delete', proveedorController.eliminarProveedor);

// Evitar logs en tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Helper para secuencias de mocks
const mockDbSequence = (responses) => {
  let i = 0;
  db.query.mockImplementation(() => {
    const res = responses[i] || { rowCount: 0, rows: [] };
    i++;
    if (res instanceof Error) return Promise.reject(res);
    return Promise.resolve(res);
  });
};

describe('Proveedor Controller - Suite Completa', () => {

  // --- CREAR PROVEEDOR ---
  it('debe crear un proveedor o devolver 409 si ya existe', async () => {
    mockDbSequence([
      { rowCount: 0, rows: [] }, // duplicados
      { rowCount: 1, rows: [{ id_proveedor: 1, nombre: 'ProveedorX', telefono: '12345678', contacto: 'Contacto X' }] }
    ]);

    const res1 = await request(app).post('/api/proveedores').send({
      nombre: 'ProveedorX',
      telefono: '12345678',
      contacto: 'Contacto X'
    });
    expect([201, 409]).toContain(res1.statusCode);
    if (res1.statusCode === 201) expect(res1.body.nombre).toBe('ProveedorX');

    const res2 = await request(app).post('/api/proveedores').send({
      nombre: 'ProveedorX',
      telefono: '22222222',
      contacto: 'Contacto Y'
    });
    expect([201, 409]).toContain(res2.statusCode);
  });

  it('debe devolver 400 si los datos no cumplen validación Joi', async () => {
    const res = await request(app).post('/api/proveedores').send({
      nombre: '12',
      telefono: 'abc',
      contacto: 'Co'
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBeDefined();
  });

  it('debe manejar error de duplicado DB (23505) al crear proveedor', async () => {
    db.query.mockRejectedValueOnce({ code: '23505' });
    const res = await request(app).post('/api/proveedores').send({
      nombre: 'Duplicado',
      telefono: '55555555',
      contacto: 'Contacto D'
    });
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/Ya existe/);
  });

  // --- OBTENER PROVEEDORES ---
  it('debe devolver todos los proveedores', async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        { id_proveedor: 1, nombre: 'ProveedorX', telefono: '123', contacto: 'C1' },
        { id_proveedor: 2, nombre: 'ProveedorY', telefono: '456', contacto: 'C2' }
      ]
    });
    const res = await request(app).get('/api/proveedores');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('debe manejar errores de DB al obtener proveedores', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/api/proveedores');
    expect(res.statusCode).toBe(500);
  });

  // --- OBTENER PROVEEDOR POR ID/NOMBRE ---
  it('debe devolver un proveedor por id', async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id_proveedor: 1, nombre: 'ProveedorX', telefono: '123', contacto: 'C1' }]
    });
    const res = await request(app).post('/api/proveedores/detail').send({ id_proveedor: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body[0].id_proveedor).toBe(1);
  });

  it('debe devolver un proveedor por nombre', async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id_proveedor: 2, nombre: 'ProveedorY', telefono: '456', contacto: 'C2' }]
    });
    const res = await request(app).post('/api/proveedores/detail').send({ nombre: 'ProveedorY' });
    expect(res.statusCode).toBe(200);
    expect(res.body[0].nombre).toBe('ProveedorY');
  });

  it('debe devolver 404 si no encuentra el proveedor', async () => {
    db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).post('/api/proveedores/detail').send({ id_proveedor: 99 });
    expect(res.statusCode).toBe(404);
  });

  it('debe devolver 400 si la búsqueda no pasa Joi', async () => {
    const res = await request(app).post('/api/proveedores/detail').send({ id_proveedor: -1 });
    expect(res.statusCode).toBe(400);
  });

  // --- ACTUALIZAR PROVEEDOR ---
  it('debe actualizar un proveedor o devolver 409 si hay duplicado', async () => {
    mockDbSequence([
      { rowCount: 0, rows: [] }, // validación duplicado
      { rowCount: 1, rows: [{ id_proveedor: 1, nombre: 'ProveedorX', telefono: '111', contacto: 'C1' }] },
      { rowCount: 1, rows: [{ id_proveedor: 1, nombre: 'ProveedorY', telefono: '222', contacto: 'C2' }] }
    ]);

    const res = await request(app).put('/api/proveedores/update').send({
      id_proveedor: 1,
      nombre: 'ProveedorY',
      telefono: '222',
      contacto: 'C2'
    });

    expect([200, 409]).toContain(res.statusCode);
    if (res.statusCode === 200) expect(res.body.nombre).toBe('ProveedorY');
  });

  it('debe actualizar solo nombre y dejar resto igual', async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id_proveedor: 1, nombre: 'Old', telefono: '111', contacto: 'C1' }]
    });
    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id_proveedor: 1, nombre: 'Nuevo', telefono: '111', contacto: 'C1' }]
    });

    const res = await request(app).put('/api/proveedores/update').send({ id_proveedor: 1, nombre: 'Nuevo' });
    expect(res.statusCode).toBe(200);
    expect(res.body.nombre).toBe('Nuevo');
    expect(res.body.telefono).toBe('111');
  });

  it('debe devolver 404 si no encuentra el proveedor al actualizar', async () => {
    db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).put('/api/proveedores/update').send({ id_proveedor: 99, nombre: 'Nuevo' });
    expect(res.statusCode).toBe(404);
  });

  it('debe devolver 400 si no se envía id_proveedor al actualizar', async () => {
    const res = await request(app).put('/api/proveedores/update').send({ nombre: 'Nuevo' });
    expect(res.statusCode).toBe(400);
  });

  // --- ELIMINAR PROVEEDOR ---
  it('debe eliminar un proveedor correctamente', async () => {
    db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id_proveedor: 1, nombre: 'ProveedorX' }] });
    const res = await request(app).delete('/api/proveedores/delete').send({ id_proveedor: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/exitosamente/);
  });

  it('debe devolver 404 si no encuentra el proveedor al eliminar', async () => {
    db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).delete('/api/proveedores/delete').send({ id_proveedor: 99 });
    expect(res.statusCode).toBe(404);
  });

  it('debe devolver 400 si no se envía id_proveedor al eliminar', async () => {
    const res = await request(app).delete('/api/proveedores/delete').send({});
    expect(res.statusCode).toBe(400);
  });

  it('debe manejar error de FK DB (23503) al eliminar proveedor', async () => {
    db.query.mockRejectedValueOnce({ code: '23503' });
    const res = await request(app).delete('/api/proveedores/delete').send({ id_proveedor: 1 });
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/asociado/);
  });

  it('debe manejar errores de DB genéricos al eliminar', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).delete('/api/proveedores/delete').send({ id_proveedor: 1 });
    expect(res.statusCode).toBe(500);
  });

});
