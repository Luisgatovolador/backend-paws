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

describe('Proveedor Controller', () => {

  // --- CREAR PROVEEDOR ---
  it('debe crear un proveedor correctamente', async () => {
    // 1. Validación duplicados
    db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    // 2. Insert
    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id_proveedor: 1, nombre: 'Proveedor 1', telefono: '12345678', contacto: 'Contacto 1' }]
    });

    const res = await request(app).post('/api/proveedores').send({
      nombre: 'Proveedor 1',
      telefono: '12345678',
      contacto: 'Contacto 1'
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.nombre).toBe('Proveedor 1');
  });

  it('debe devolver 409 si el nombre ya existe', async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ nombre: 'Proveedor 1', telefono: '12345678' }]
    });

    const res = await request(app).post('/api/proveedores').send({
      nombre: 'Proveedor 1',
      telefono: '22222222'
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/nombre/);
  });

  it('debe devolver 409 si el teléfono ya existe', async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ nombre: 'Otro', telefono: '12345678' }]
    });

    const res = await request(app).post('/api/proveedores').send({
      nombre: 'Proveedor Nuevo',
      telefono: '12345678'
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/teléfono/);
  });

  it('debe devolver 400 si los datos no cumplen validación Joi', async () => {
    const res = await request(app).post('/api/proveedores').send({
      nombre: '1234',
      telefono: 'abc',
      contacto: 'Contacto'
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/El nombre/);
  });

  // --- OBTENER PROVEEDORES ---
  it('debe devolver todos los proveedores', async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id_proveedor: 1, nombre: 'Proveedor 1', telefono: '12345678', contacto: 'Contacto 1' }]
    });

    const res = await request(app).get('/api/proveedores');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
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
      rows: [{ id_proveedor: 1, nombre: 'Proveedor 1', telefono: '12345678', contacto: 'Contacto 1' }]
    });

    const res = await request(app).post('/api/proveedores/detail').send({ id_proveedor: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body[0].id_proveedor).toBe(1);
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
  it('debe actualizar un proveedor correctamente', async () => {
    // 1. Verificar duplicados
    db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    // 2. Obtener proveedor actual
    db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id_proveedor: 1, nombre: 'Proveedor 1', telefono: '11111111', contacto: 'Contacto1' }] });
    // 3. Actualización
    db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id_proveedor: 1, nombre: 'Nuevo', telefono: '22222222', contacto: 'Nuevo' }] });

    const res = await request(app).put('/api/proveedores/update').send({
      id_proveedor: 1,
      nombre: 'Nuevo',
      telefono: '22222222',
      contacto: 'Nuevo'
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.nombre).toBe('Nuevo');
  });

  it('debe devolver 409 si hay duplicado al actualizar', async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id_proveedor: 2, nombre: 'Duplicado', telefono: '33333333' }]
    });

    const res = await request(app).put('/api/proveedores/update').send({
      id_proveedor: 1,
      nombre: 'Duplicado',
      telefono: '33333333'
    });

    expect(res.statusCode).toBe(409);
  });

  it('debe devolver 404 si no encuentra el proveedor al actualizar', async () => {
    db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] }); // duplicado
    db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] }); // obtener actual

    const res = await request(app).put('/api/proveedores/update').send({
      id_proveedor: 99,
      nombre: 'Nuevo'
    });

    expect(res.statusCode).toBe(404);
  });

  it('debe devolver 400 si no se envía id_proveedor al actualizar', async () => {
    const res = await request(app).put('/api/proveedores/update').send({
      nombre: 'Nuevo'
    });
    expect(res.statusCode).toBe(400);
  });

  // --- ELIMINAR PROVEEDOR ---
  it('debe eliminar un proveedor correctamente', async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id_proveedor: 1, nombre: 'Proveedor 1' }]
    });

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

  it('debe manejar errores de DB al eliminar', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app).delete('/api/proveedores/delete').send({ id_proveedor: 1 });
    expect(res.statusCode).toBe(500);
  });

});
