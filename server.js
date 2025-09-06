'use strict'
const express = require('express');
const swaggerUI = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Configuracion del OPEN API
const app = express();
const port = 3000;

//Se cargan los documentos de configuracion de Swagger
const swaggerDocument = YAML.load(path.join(__dirname,'swager.yaml'));

// Configuracion de los EndPoints
app.use('/',(req,res)=>{
    console.log('Llamada al EndPoint base');
    res.send('El servidor esta funcionando correctamente');
});

//Se levanta el servidor en el puerto 3000 a la escucha
app.listen(port, ()=>{
    console.log('El servidor se ha levantado y está en escucha');
    console.log();
})
