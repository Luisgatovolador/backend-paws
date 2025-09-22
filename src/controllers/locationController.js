'use strict';

const db = require('../db/index');
const axios = require('axios');
const { locationSchema } = require('../validators/locationValidators');

const getClientIp = (req) => {
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Si la IP es localhost o su representación IPv6, devolvemos 'localhost'
    if (ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress === '::ffff:127.0.0.1') {
        return 'localhost';
    }
    return ipAddress.split(',')[0].trim();
};

exports.saveLocationByIp = async (req, res) => {
    try {
        const { error } = locationSchema.validate({ userId: req.body.userId, actionName: req.body.actionName });
        if (error) {
            console.error('Error de validación en saveLocationByIp:', error.details[0].message);
            return;
        }

        const { userId, actionName } = req.body;
        const clientIp = getClientIp(req);

        let lat, lon;
        try {
            // Usa la IP real del cliente si no es localhost
            if (clientIp !== 'localhost') {
                const response = await axios.get(`http://ip-api.com/json/${clientIp}?fields=lat,lon`);
                lat = response.data.lat;
                lon = response.data.lon;
            } else {
                // Si la IP es localhost, usa una IP de prueba
                console.warn('Advertencia: IP local detectada. Usando una IP de prueba.');
                const testIp = '104.28.210.155';
                const testResponse = await axios.get(`http://ip-api.com/json/${testIp}?fields=lat,lon`);
                lat = testResponse.data.lat;
                lon = testResponse.data.lon;
            }
        } catch (apiError) {
            // En caso de que la API de geolocalización falle por cualquier otra razón
            console.error(`Error de la API de geolocalización: ${apiError.message}. Usando una IP de prueba.`);
            const testIp = '104.28.210.155';
            const testResponse = await axios.get(`http://ip-api.com/json/${testIp}?fields=lat,lon`);
            lat = testResponse.data.lat;
            lon = testResponse.data.lon;
        }

        if (!lat || !lon) {
            console.error('Error: No se pudo obtener la ubicación.');
            return;
        }

        const actionResult = await db.query('SELECT id FROM actions_catalog WHERE name = $1', [actionName]);
        if (actionResult.rowCount === 0) {
            console.error(`Error: Tipo de acción inválido: ${actionName}`);
            return;
        }
        const actionId = actionResult.rows[0].id;

        await db.query(
            'INSERT INTO user_locations (user_id, latitude, longitude, action_id) VALUES ($1, $2, $3, $4)',
            [userId, lat, lon, actionId]
        );
        console.log(`Ubicación y acción guardadas para el usuario ${userId}: ${actionName}`);
    } catch (error) {
        console.error('Error al guardar ubicación por IP:', error);
    }
};

exports.getLocationsByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await db.query(
            'SELECT latitude, longitude, timestamp, action_id FROM user_locations WHERE user_id = $1 ORDER BY timestamp DESC',
            [userId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener ubicaciones:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};