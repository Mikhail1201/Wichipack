const express = require('express');
const router = express.Router();
const { pool } = require('./config');
const authenticateToken = require('./auth').authenticateToken;

// Obtener todas las incidencias
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT i.*, 
                   p.modelo as patineta_modelo,
                   p.numero_serie as patineta_serie,
                   e.nombre as estado_nombre,
                   u.nombre as usuario_nombre
            FROM incidencias i
            LEFT JOIN patinetas p ON i.idpatineta = p.idpatineta
            LEFT JOIN estados e ON i.idestado = e.idestados
            LEFT JOIN usuarios u ON i.idusuario = u.idusuario
            ORDER BY i.fecha_reporte DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener las incidencias' });
    }
});

// Obtener historial de una patineta específica
router.get('/historial/:idpatineta', authenticateToken, async (req, res) => {
    try {
        const { idpatineta } = req.params;
        const result = await pool.query(`
            SELECT h.*, 
                   e.nombre as estado_nombre,
                   u.nombre as usuario_nombre
            FROM historial_estados h
            LEFT JOIN estados e ON h.idestado = e.idestados
            LEFT JOIN usuarios u ON h.idusuario = u.idusuario
            WHERE h.idpatineta = $1
            ORDER BY h.fecha_cambio DESC
        `, [idpatineta]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener el historial' });
    }
});

// Crear nueva incidencia
router.post('/', authenticateToken, async (req, res) => {
    const {
        descripcion,
        idestado,
        idpatineta,
        idusuario,
        tipo,
        prioridad,
        costo_reparacion
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO incidencias 
             (descripcion, idestado, idpatineta, idusuario, tipo, prioridad, costo_reparacion)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [descripcion, idestado, idpatineta, idusuario, tipo, prioridad, costo_reparacion]
        );

        // Registrar en el historial
        await pool.query(
            `INSERT INTO historial_estados 
             (idpatineta, idestado, observaciones, idusuario)
             VALUES ($1, $2, $3, $4)`,
            [idpatineta, idestado, descripcion, idusuario]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear la incidencia' });
    }
});

// Actualizar incidencia
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const {
        descripcion,
        fecha_resolucion,
        idestado,
        tipo,
        prioridad,
        costo_reparacion,
        idusuario,
        observaciones
    } = req.body;

    try {
        // Iniciar transacción
        await pool.query('BEGIN');

        // Actualizar incidencia
        const result = await pool.query(
            `UPDATE incidencias 
             SET descripcion = $1,
                 fecha_resolucion = $2,
                 idestado = $3,
                 tipo = $4,
                 prioridad = $5,
                 costo_reparacion = $6
             WHERE idincidencia = $7
             RETURNING *`,
            [descripcion, fecha_resolucion, idestado, tipo, prioridad, costo_reparacion, id]
        );

        // Si hay cambio de estado, registrar en historial
        if (idestado) {
            await pool.query(
                `INSERT INTO historial_estados 
                 (idpatineta, idestado, observaciones, idusuario)
                 SELECT idpatineta, $1, $2, $3
                 FROM incidencias
                 WHERE idincidencia = $4`,
                [idestado, observaciones, idusuario, id]
            );
        }

        // Confirmar transacción
        await pool.query('COMMIT');

        res.json(result.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar la incidencia' });
    }
});

module.exports = router;
