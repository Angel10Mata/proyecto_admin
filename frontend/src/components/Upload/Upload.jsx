import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadCSV, getUploadHistory } from '../../services/uploadService'
import { useAuth } from '../../context/AuthContext'
import './Upload.css'

const STATUS_LABELS = {
  exitoso: { label: 'Exitoso', cls: 'success' },
  error: { label: 'Error', cls: 'danger' },
  procesando: { label: 'Procesando', cls: 'warning' },
}

export default function Upload() {
  const { user, logout, getToken } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)   // { success, message, registros }
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    setLoadingHistory(true)
    try {
      const data = await getUploadHistory(getToken())
      setHistory(data)
    } catch {
      // historial no crítico
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (selected) validateAndSet(selected)
  }

  const validateAndSet = (selected) => {
    if (!selected.name.endsWith('.csv')) {
      setResult({ success: false, message: 'Solo se permiten archivos .csv' })
      return
    }
    setFile(selected)
    setResult(null)
    setProgress(0)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) validateAndSet(dropped)
  }

  const handleSubmit = async () => {
    if (!file) return
    setUploading(true)
    setProgress(0)
    setResult(null)
    try {
      const data = await uploadCSV(file, getToken(), setProgress)
      setResult({ success: true, message: data.message, registros: data.registros })
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      fetchHistory()
    } catch (err) {
      setResult({ success: false, message: err.message })
    } finally {
      setUploading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const totalRows = history.reduce((acc, curr) => acc + (curr.registros || 0), 0)
  const successCount = history.filter(h => h.estado === 'exitoso').length
  const errorCount = history.filter(h => h.estado === 'error').length

  const getInitials = (name) => {
    return name ? name.substring(0, 2).toUpperCase() : '??'
  }

  return (
    <div className="dashboard-wrapper">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-logo-box">BI</div>
          <span className="brand-name">RETAIL</span>
        </div>
        <div className="topbar-right">
          <div className="user-profile">
            <span className="user-name-label">admin</span>
            <span className="user-role-label">ADMINISTRADOR</span>
          </div>
          <button className="btn-header-logout" onClick={handleLogout}>Cerrar Sesión</button>
        </div>
      </header>

      <main className="dashboard-main animate-fade-in">
        <section className="stats-container">
          <div className="stat-item glass-card">
            <div className="stat-icon-wrapper blue">
              <span className="icon">📂</span>
            </div>
            <div className="stat-content">
              <p className="stat-label">TOTAL REGISTROS</p>
              <h2 className="stat-number">{totalRows.toLocaleString()}</h2>
            </div>
          </div>
          <div className="stat-item glass-card">
            <div className="stat-icon-wrapper green">
              <span className="icon">✅</span>
            </div>
            <div className="stat-content">
              <p className="stat-label">CARGAS EXITOSAS</p>
              <h2 className="stat-number">{successCount}</h2>
            </div>
          </div>
          <div className="stat-item glass-card">
            <div className="stat-icon-wrapper red">
              <span className="icon">⚠</span>
            </div>
            <div className="stat-content">
              <p className="stat-label">CARGAS CON ERROR</p>
              <h2 className="stat-number">{errorCount}</h2>
            </div>
          </div>
        </section>

        <section className="main-grid">
          <div className="upload-section glass-card">
            <div className="section-header">
              <h3>CARGA DE DATOS</h3>
              <p>Selecciona un archivo CSV para el proceso ETL</p>
            </div>

            <div
              className={`dropzone-v2 ${dragOver ? 'drag-active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              
              <div className="dropzone-content">
                <span className="upload-cloud-icon">📤</span>
                <p>Arrastra tu archivo CSV aquí</p>
                <span className="browse-text">o haz clic para explorar</span>
              </div>

              {file && (
                <div className="selected-file-overlay">
                  <span className="file-name-v2">{file.name}</span>
                </div>
              )}
            </div>

            <button
              className="btn-action-primary"
              onClick={handleSubmit}
              disabled={!file || uploading}
            >
              {uploading ? 'Procesando...' : 'Iniciar Procesamiento'}
            </button>

            <div className="upload-metadata">
              <div className="meta-row">
                <span>Formato</span>
                <span className="meta-val">.csv</span>
              </div>
              <div className="meta-row">
                <span>Tamaño máx.</span>
                <span className="meta-val">50 MB</span>
              </div>
              <div className="meta-row">
                <span>Límite registros</span>
                <span className="meta-val">100,000</span>
              </div>
            </div>
          </div>

          <div className="history-section glass-card">
            <div className="section-header">
              <h3>HISTORIAL RECIENTE</h3>
              <p>Últimos movimientos registrados</p>
            </div>

            <div className="history-table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>ARCHIVO</th>
                    <th>USUARIO</th>
                    <th>FECHA</th>
                    <th>REGISTROS</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="empty-row">Sin registros</td>
                    </tr>
                  ) : (
                    history.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div className="file-cell">
                            <span className="csv-icon">📄</span>
                            <span className="file-name-text">{row.filename}</span>
                          </div>
                        </td>
                        <td>
                          <div className="user-cell">
                            <div className="avatar">{getInitials(row.usuario)}</div>
                            <span className="username-text">{row.usuario}</span>
                          </div>
                        </td>
                        <td>
                          <div className="date-cell">
                            <span className="date-main">{new Date(row.fecha).toLocaleDateString()}</span>
                            <span className="date-sub">{new Date(row.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="records-cell">
                          {row.estado === 'procesando' ? (
                            <span className="processing-text">procesando...</span>
                          ) : (
                            row.registros?.toLocaleString() || '—'
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
