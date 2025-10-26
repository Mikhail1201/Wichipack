const express = require('express');
const router = express.Router();
const { pool } = require('./config');
const authenticateToken = require('./auth').authenticateToken;

// Obtener todas las tarifas
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM tarifas ORDER BY idtarifa DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener las tarifas' });
    }
});

// Crear nueva tarifa
router.post('/', authenticateToken, async (req, res) => {
    const { nombre, tipo, valor, fecha_inicio, fecha_fin, activa } = req.body;

    try {
        let query, params;
        if (fecha_fin) {
            query = 'INSERT INTO tarifas (nombre, tipo, valor, fecha_inicio, fecha_fin, activa) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
            params = [nombre, tipo, valor, fecha_inicio, fecha_fin, activa ?? true];
        } else {
            query = 'INSERT INTO tarifas (nombre, tipo, valor, fecha_inicio, activa) VALUES ($1, $2, $3, $4, $5) RETURNING *';
            params = [nombre, tipo, valor, fecha_inicio, activa ?? true];
        }

        const result = await pool.query(query, params);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear la tarifa' });
    }
});

// Actualizar estado de tarifa (activar/suspender)
router.put('/', authenticateToken, async (req, res) => {
    const { idtarifa, activa } = req.body;

    try {
        const result = await pool.query(
            'UPDATE tarifas SET activa = $1 WHERE idtarifa = $2 RETURNING *',
            [activa, idtarifa]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tarifa no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar la tarifa' });
    }
});

module.exports = router;
