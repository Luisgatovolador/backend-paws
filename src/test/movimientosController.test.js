const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

jest.mock('../db/index', () => ({
  connect: jest.fn(),
  query: jest.fn()
}));

jest.mock('../services/emailService', () => ({
  notificationEmptyStock: jest.fn().mockResolvedValue(true)
}));

const db = require('../db/index');
const movimientoController = require('../controllers/movimientosController');
const { notificationEmptyStock } = require('../services/emailService');

const app = express();
app.use(bodyParser.json());

// Rutas
app.post('/api/v1/movimientos/registrar', movimientoController.registerMovement);
app.post('/api/v1/movimientos/historial', movimientoController.getMovimientosByProduct);
app.get('/api/v1/products/stock-alert', movimientoController.getStockAlerts);

// Evitar logs en tests
beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

describe('Movimiento Controller - Suite Completa', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = { query: jest.fn(), release: jest.fn() };
    db.connect.mockResolvedValue(mockClient);
  });

  // --- REGISTER MOVEMENT ---
  it('debe registrar una Entrada correctamente', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ nombre: 'ProductoA', stock_actual: 10, stock_minimo: 5 }] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ id_movimiento: 1 }] }) // INSERT movimiento
      .mockResolvedValueOnce({}); // COMMIT

    const res = await request(app).post('/api/v1/movimientos/registrar').send({
      tipo: 'Entrada',
      cantidad: 5,
      id_producto: 1,
      id_proveedor: 2,
      responsable: 'Juan Perez',
      id_usuario: 1
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.movimiento.id_movimiento).toBe(1);
  });

  it('debe devolver 400 si falta id_proveedor en Entrada', async () => {
    const res = await request(app).post('/api/v1/movimientos/registrar').send({
      tipo: 'Entrada',
      cantidad: 5,
      id_producto: 1,
      responsable: 'Juan Perez',
      id_usuario: 1
    });
    expect(res.statusCode).toBe(400);
  });

  it('debe registrar una Salida y enviar alerta si stock < minStock', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ nombre: 'ProductoA', stock_actual: 5, stock_minimo: 10 }] })
      .mockResolvedValueOnce({ rows: [{ id_movimiento: 2 }] }) // INSERT movimiento
      .mockResolvedValueOnce({}); // COMMIT

    const res = await request(app).post('/api/v1/movimientos/registrar').send({
      tipo: 'Salida',
      cantidad: 3,
      id_producto: 1,
      id_cliente: 5,
      responsable: 'Ana Lopez',
      id_usuario: 1
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.alert_sent).toBe(true);
    expect(notificationEmptyStock).toHaveBeenCalled();
  });

  it('debe devolver 400 si Salida supera stock', async () => {
    mockClient.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ stock_actual: 2, stock_minimo: 1, nombre: 'ProductoB' }] });
    const res = await request(app).post('/api/v1/movimientos/registrar').send({
      tipo: 'Salida',
      cantidad: 5,
      id_producto: 1,
      id_cliente: 5,
      responsable: 'Ana Lopez',
      id_usuario: 1
    });
    expect(res.statusCode).toBe(400);
  });

  it('debe devolver 404 si producto no existe', async () => {
    mockClient.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).post('/api/v1/movimientos/registrar').send({
      tipo: 'Entrada',
      cantidad: 5,
      id_producto: 999,
      id_proveedor: 2,
      responsable: 'Juan Perez',
      id_usuario: 1
    });
    expect(res.statusCode).toBe(404);
  });

  // --- GET MOVIMIENTOS BY PRODUCT ---
  it('debe devolver historial de movimientos', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_producto: 1 }] }) // existe producto
      .mockResolvedValueOnce({ rowCount: 2, rows: [{ id_movimiento: 1 }, { id_movimiento: 2 }] });

    const res = await request(app).post('/api/v1/movimientos/historial').send({ id_producto: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.movimientos.length).toBe(2);
  });

  it('debe devolver 404 si producto no existe al consultar historial', async () => {
    mockClient.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).post('/api/v1/movimientos/historial').send({ id_producto: 999 });
    expect(res.statusCode).toBe(404);
  });

  it('debe devolver 400 si id_producto inválido', async () => {
    const res = await request(app).post('/api/v1/movimientos/historial').send({ id_producto: -1 });
    expect(res.statusCode).toBe(400);
  });

  // --- GET STOCK ALERTS ---
  it('debe devolver lista de alertas de stock', async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 2,
      rows: [{ id_alerta: 1 }, { id_alerta: 2 }]
    });
    const res = await request(app).get('/api/v1/products/stock-alert');
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(2);
  });

  it('debe manejar error de DB al obtener alertas', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/api/v1/products/stock-alert');
    expect(res.statusCode).toBe(500);
  });
});
