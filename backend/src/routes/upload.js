import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { verifyToken } from '../middleware/authMiddleware.js'
import { uploadCSV, getHistory } from '../controllers/uploadController.js'

const router = Router()

// Directorio temporal para archivos subidos
const uploadDir = path.resolve('uploads_temp')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const timestamp = Date.now()
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${timestamp}_${safe}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB máximo
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten archivos CSV'))
    }
  },
})

// POST /api/upload/csv  — requiere autenticación
router.post('/csv', verifyToken, upload.single('file'), uploadCSV)

// GET  /api/upload/history — requiere autenticación
router.get('/history', verifyToken, getHistory)

export default router
