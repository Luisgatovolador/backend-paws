'use strict'
const app = require('./src/app')
const port = process.env.PORT || 3000;

//Se levanta el servidor en el puerto 3000 a la escucha
app.listen(port, ()=>{
    console.log(`Servidor escuchando en http://localhost:${port}`);
    console.log(`Documentación de la API disponible en http://localhost:${port}/api-docs`);
});
