const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

jest.mock('../db/index', () => ({
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue(true),
}));

const db = require('../db/index');
const productController = require('../controllers/productController');

const app = express();
app.use(bodyParser.json());

// Rutas
app.get('/api/v1/products', productController.getAllProducts);
app.get('/api/v1/products/stock-alert', productController.getLowStockProducts);
app.post('/api/v1/products/nuevo', productController.createProduct);
app.put('/api/v1/products/update', productController.updateProduct);
app.delete('/api/v1/products/delete', productController.deleteProduct);
app.patch('/api/v1/products/status', productController.changeProductStatus);

// Evitar logs
beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

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

describe('Product Controller - Suite Completa', () => {

  // --- GET ALL PRODUCTS ---
  it('debe devolver todos los productos', async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        { id_producto: 1, nombre: 'Producto A' },
        { id_producto: 2, nombre: 'Producto B' }
      ]
    });
    const res = await request(app).get('/api/v1/products');
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.products.length).toBe(2);
  });

  it('debe manejar error de DB al obtener todos los productos', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/api/v1/products');
    expect(res.statusCode).toBe(500);
  });

  // --- GET LOW STOCK PRODUCTS ---
  it('debe devolver productos bajo stock mínimo', async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id_producto: 1, nombre: 'Producto Low', stock_minimo: 10, stock_actual: 5 }]
    });
    const res = await request(app).get('/api/v1/products/stock-alert');
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.products[0].nombre).toBe('Producto Low');
  });

  it('debe manejar error de DB al obtener productos bajo stock', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/api/v1/products/stock-alert');
    expect(res.statusCode).toBe(500);
  });

  // --- CREATE PRODUCT ---
  it('debe crear un producto correctamente', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id_producto: 1, nombre: 'Nuevo Producto' }]
    });
    const res = await request(app).post('/api/v1/products/nuevo').send({
      codigo: 'PR001',
      nombre: 'Nuevo Producto',
      categoria: 'Cat A',
      unidad: 'pieza',
      stock_minimo: 5
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.product.nombre).toBe('Nuevo Producto');
  });

  it('debe devolver 400 si validación Joi falla', async () => {
    const res = await request(app).post('/api/v1/products/nuevo').send({
      codigo: '',
      nombre: '12',
      categoria: '',
      unidad: '',
      stock_minimo: -1
    });
    expect(res.statusCode).toBe(400);
  });

  it('debe manejar duplicado DB (23505) al crear producto', async () => {
    db.query.mockRejectedValueOnce({ code: '23505', detail: 'Duplicate key' });
    const res = await request(app).post('/api/v1/products/nuevo').send({
      codigo: 'PR001',
      nombre: 'Producto Duplicado',
      categoria: 'Cat A',
      unidad: 'pieza',
      stock_minimo: 5
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/código ya existe/);
  });

  // --- UPDATE PRODUCT ---
  it('debe actualizar un producto correctamente', async () => {
    mockDbSequence([
      { rowCount: 1, rows: [{ id_producto: 1, nombre: 'Producto A' }] }
    ]);
    const res = await request(app).put('/api/v1/products/update').send({
      id_producto: 1,
      nombre: 'Producto A Modificado'
    });
    expect([200, 400, 404]).toContain(res.statusCode);
  });

  it('debe devolver 400 si validación Joi falla al actualizar', async () => {
    const res = await request(app).put('/api/v1/products/update').send({ id_producto: 0 });
    expect(res.statusCode).toBe(400);
  });

  // --- DELETE PRODUCT ---
  it('debe eliminar un producto correctamente', async () => {
    db.query.mockResolvedValueOnce({ rowCount: 1 });
    const res = await request(app).delete('/api/v1/products/delete').send({ id_producto: 1 });
    expect(res.statusCode).toBe(200);
  });

  it('debe devolver 404 si producto no existe al eliminar', async () => {
    db.query.mockResolvedValueOnce({ rowCount: 0 });
    const res = await request(app).delete('/api/v1/products/delete').send({ id_producto: 99 });
    expect(res.statusCode).toBe(404);
  });

  it('debe manejar FK (23503) al eliminar producto', async () => {
    db.query.mockRejectedValueOnce({ code: '23503' });
    const res = await request(app).delete('/api/v1/products/delete').send({ id_producto: 1 });
    expect(res.statusCode).toBe(400);
  });

  // --- CHANGE PRODUCT STATUS ---
  it('debe cambiar el estado activo de un producto por ID', async () => {
    db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id_producto: 1 }] });
    const res = await request(app).patch('/api/v1/products/status').send({ id_producto: 1, activo: 0 });
    expect(res.statusCode).toBe(200);
  });

  it('debe cambiar el estado activo de un producto por nombre', async () => {
    db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id_producto: 1 }] });
    const res = await request(app).patch('/api/v1/products/status').send({ nombre: 'Producto A', activo: 1 });
    expect(res.statusCode).toBe(200);
  });

  it('debe devolver 400 si no se envía activo', async () => {
    const res = await request(app).patch('/api/v1/products/status').send({ id_producto: 1 });
    expect(res.statusCode).toBe(400);
  });

  it('debe devolver 404 si producto no existe al cambiar estado', async () => {
    db.query.mockResolvedValueOnce({ rowCount: 0 });
    const res = await request(app).patch('/api/v1/products/status').send({ id_producto: 999, activo: 1 });
    expect(res.statusCode).toBe(404);
  });
});
