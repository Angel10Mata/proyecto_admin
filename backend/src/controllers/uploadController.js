import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import pool from '../config/db.js'

/**
 * POST /api/upload/csv
 * Recibe el archivo CSV, lo guarda temporalmente y dispara el script Python
 */
export async function uploadCSV(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'No se recibió ningún archivo' })
  }

  const { id: userId, username } = req.user
  const filename = req.file.originalname
  const filePath = req.file.path
  let auditId = null

  try {
    // 1. Registrar inicio de carga en auditoría
    const [auditResult] = await pool.execute(
      `INSERT INTO auditoria_cargas (usuario_id, username, filename, fecha_inicio, estado)
       VALUES (?, ?, ?, NOW(), 'procesando')`,
      [userId, username, filename]
    )
    auditId = auditResult.insertId

    // 2. Disparar script Python (no bloqueante para la respuesta HTTP)
    const pythonScript = process.env.PYTHON_SCRIPT_PATH || path.resolve('scripts/etl_carga.py')
    const pythonExec   = process.env.PYTHON_EXEC || 'python3'

    const child = spawn(pythonExec, [pythonScript, '--file', filePath, '--audit-id', String(auditId)], {
      env: { ...process.env },
    })

    let stdoutData = ''
    let stderrData = ''

    child.stdout.on('data', (d) => { stdoutData += d.toString() })
    child.stderr.on('data', (d) => { stderrData += d.toString() })

    child.on('close', async (code) => {
      // Limpiar archivo temporal
      try { fs.unlinkSync(filePath) } catch {}

      let registros = 0
      try {
        const match = stdoutData.match(/REGISTROS_INSERTADOS:(\d+)/)
        if (match) registros = parseInt(match[1])
      } catch {}

      const estado = code === 0 ? 'exitoso' : 'error'
      const errorMsg = code !== 0 ? stderrData.substring(0, 500) : null

      // Actualizar auditoría con resultado
      await pool.execute(
        `UPDATE auditoria_cargas
         SET estado = ?, registros = ?, fecha_fin = NOW(), error_msg = ?
         WHERE id = ?`,
        [estado, registros, errorMsg, auditId]
      ).catch(console.error)
    })

    // Respuesta inmediata al frontend (el proceso corre en background)
    return res.status(202).json({
      message: `Archivo recibido. Procesando en background (auditoria #${auditId})`,
      auditId,
    })
  } catch (err) {
    // Actualizar auditoría como error si algo salió mal antes del spawn
    if (auditId) {
      await pool.execute(
        `UPDATE auditoria_cargas SET estado = 'error', fecha_fin = NOW(), error_msg = ? WHERE id = ?`,
        [err.message?.substring(0, 500), auditId]
      ).catch(() => {})
    }
    try { fs.unlinkSync(filePath) } catch {}
    console.error('[uploadController.uploadCSV]', err)
    return res.status(500).json({ message: 'Error al procesar la carga' })
  }
}

/**
 * GET /api/upload/history
 * Retorna el historial de cargas desde la tabla auditoria_cargas
 */
export async function getHistory(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, filename, username AS usuario, fecha_inicio AS fecha,
              registros, estado
       FROM auditoria_cargas
       ORDER BY fecha_inicio DESC
       LIMIT 50`
    )
    return res.status(200).json(rows)
  } catch (err) {
    console.error('[uploadController.getHistory]', err)
    return res.status(500).json({ message: 'Error al obtener historial' })
  }
}
