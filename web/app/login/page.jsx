'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';
import '../login.css';

export default function Login() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError('Completa todos los campos');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // In Supabase, we log in with email. We use a fake email based on username.
      const email = `${credentials.username.toLowerCase()}@biretail.com`;
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: credentials.password,
      });

      if (signInError) {
        throw new Error(signInError.message.includes('Invalid login credentials') ? 'Credenciales inválidas' : signInError.message);
      }

      router.push('/dashboard');
      router.refresh(); // to apply middleware checks
    } catch (err) {
      setError(err.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper animate-fade-in">
      <div className="login-split">
        <div className="login-image-side">
          <div className="login-image-bg"></div>
          <div className="login-image-overlay"></div>
        </div>
        
        <div className="login-form-side">
          <div className="login-card">
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
      </div>
    </div>
  );
}
