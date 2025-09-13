const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const expressLayouts = require('express-ejs-layouts');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const usuariosRouter = require('./routes/usuarios');

const app = express();

// Vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Rutas
app.use('/usuarios', usuariosRouter);

// Swagger
const swaggerDocument = YAML.load(path.join(__dirname, 'swager.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Redirigir /
app.get('/', (req, res) => res.redirect('/usuarios'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor escuchando en http://localhost:${port}`));
