const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const expressLayouts = require('express-ejs-layouts');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const cors = require('cors');

const usuariosRouter = require('./routes/usuarios');
const authRouter = require('./routes/auth');
const locatioRouter = require('./routes/location');
const alertasRouter = require('./routes/alertas')


const productsRouter = require('./routes/products');
const movimientosRoutes = require('./routes/movimientos');
// --- 1. AÑADE LA IMPORTACIÓN DE LA NUEVA RUTA AQUÍ ---
const proveedoresRouter = require('./routes/proveedores');
const clientesRouter = require('./routes/clientes'); // Añade esta línea


const app = express();
app.use(cors());
app.use(express.json());

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      messagea: 'El cuerpo de la petición no tiene un formato JSON válido.'
    });
  }
  next();
});

// Vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Ruta de testeo inicial
// app.use('/',(req,res)=>{
//     console.log('Llamada al EndPoint base');
//     res.send('El servidor esta funcionando correctamente');
// });

// Rutas
app.use('/api/v1/usuarios', usuariosRouter);
app.use('/api/v1',authRouter);
app.use('/api/v1',locatioRouter);

app.use('/api/v1/proveedores', proveedoresRouter);
app.use('/api/v1/clientes', clientesRouter);
app.use('/api/v1/alertas', alertasRouter); // 2. Usa



app.use('/api/v1/products',productsRouter);
app.use('/api/v1/movimientos', movimientosRoutes);
// Swagger
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger/swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Redirigir /
app.get('/', (req, res) => res.redirect('/usuarios'));

module.exports = app;