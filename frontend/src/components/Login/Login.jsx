import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser } from '../../services/authService'
import { useAuth } from '../../context/AuthContext'
import './Login.css'

export default function Login() {
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError('Completa todos los campos')
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await loginUser(credentials)
      login(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card glass-card">
        <div className="login-header">
          <div className="login-logo-box">BI</div>
          <h1>Bienvenido</h1>
          <p>BI RETAIL — DATA SYSTEM</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <div className="input-container">
              <input
                id="username"
                name="username"
                type="text"
                value={credentials.username}
                onChange={handleChange}
                placeholder="Ingresa tu usuario"
                autoComplete="username"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="input-container">
              <input
                id="password"
                name="password"
                type="password"
                value={credentials.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                required
              />
            </div>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary btn-login"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" />
                <span>Verificando...</span>
              </>
            ) : (
              'Entrar al Sistema'
            )}
          </button>
        </form>

        <div className="login-footer">
          <span>Universidad Mariano Gálvez — ASI 2024</span>
        </div>
      </div>
    </div>
  )
}
