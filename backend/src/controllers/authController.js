import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/db.js'

/**
 * POST /api/auth/login
 * Valida credenciales contra la tabla `usuarios` en MySQL
 */
export async function login(req, res) {
  const { username, password } = req.body

  // Validación básica de entrada
  if (!username || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos' })
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, username, password_hash, role, activo FROM usuarios WHERE username = ? LIMIT 1',
      [username.trim()]
    )

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const user = rows[0]

    if (!user.activo) {
      return res.status(403).json({ message: 'Usuario desactivado. Contacta al administrador.' })
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    )

    return res.status(200).json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
    })
  } catch (err) {
    console.error('[authController.login]', err)
    return res.status(500).json({ message: 'Error interno del servidor' })
  }
}
