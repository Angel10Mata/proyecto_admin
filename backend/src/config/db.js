import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import bcrypt from 'bcryptjs'

let db = null

export async function testConnection() {
  if (!db) {
    db = await open({
      filename: path.resolve('database.sqlite'),
      driver: sqlite3.Database
    })
  }

  // Crear tablas si no existen
  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'operador',
      activo        INTEGER NOT NULL DEFAULT 1,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auditoria_cargas (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id   INTEGER NOT NULL,
      username     TEXT NOT NULL,
      filename     TEXT NOT NULL,
      fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_fin    DATETIME NULL,
      registros    INTEGER NULL,
      estado       TEXT CHECK(estado IN ('procesando','exitoso','error')) DEFAULT 'procesando',
      error_msg    TEXT NULL
    );
  `)

  // Crear usuario admin por defecto si no existe
  const adminExists = await db.get('SELECT id FROM usuarios WHERE username = ?', ['admin'])
  if (!adminExists) {
    const hash = await bcrypt.hash('admin123', 10)
    await db.run(
      'INSERT INTO usuarios (username, password_hash, role) VALUES (?, ?, ?)',
      ['admin', hash, 'administrador']
    )
    console.log('👤 Usuario admin creado (admin / admin123)')
  }

  console.log('✅ Conexión a SQLite exitosa (archivo database.sqlite)')
}

const pool = {
  execute: async (sql, params = []) => {
    if (!db) await testConnection()
    
    // Convertir NOW() a CURRENT_TIMESTAMP si es necesario (básico)
    let processedSql = sql.replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP')
    
    const isSelect = processedSql.trim().toUpperCase().startsWith('SELECT')
    
    if (isSelect) {
      const rows = await db.all(processedSql, params)
      return [rows]
    } else {
      const result = await db.run(processedSql, params)
      return [{
        insertId: result.lastID,
        affectedRows: result.changes
      }]
    }
  }
}

export default pool
