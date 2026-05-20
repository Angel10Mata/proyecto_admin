'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../dashboard.css';

const STATUS_LABELS = {
  exitoso: { label: 'Exitoso', cls: 'success' },
  error: { label: 'Error', cls: 'danger' },
  procesando: { label: 'Procesando', cls: 'warning' },
};

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef(null);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState('carga'); // 'carga' | 'analitica'
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      
      const { data: profileData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();
        
      setProfile(profileData);
      fetchHistory();
    }
    loadUser();
  }, [router, supabase]);

  useEffect(() => {
    // Ya no se hace fetch automático al cambiar a la pestaña 'analitica'
  }, [activeTab]);

  async function verAnalisis(auditId) {
    setActiveTab('analitica');
    setLoadingAnalytics(true);
    setHasSearched(true);
    try {
      let query = supabase.from('ventas').select('nombre_sucursal, monto_total');
      if (auditId) {
        query = query.eq('auditoria_id', auditId);
      }
      
      const { data, error } = await query;
        
      if (error) {
         console.error("Error fetching analytics:", error);
         setLoadingAnalytics(false);
         return;
      }
        
      if (data) {
         // Aggregate data by sucursal
         const aggregated = data.reduce((acc, curr) => {
           const sucursalName = curr.nombre_sucursal || 'Desconocida';
           acc[sucursalName] = (acc[sucursalName] || 0) + Number(curr.monto_total || 0);
           return acc;
         }, {});
         
         const formatted = Object.keys(aggregated).map(key => ({
            name: key,
            Ingresos: aggregated[key]
         }));
         setAnalyticsData(formatted);
      }
    } catch (err) {
      console.error("Catch error fetching analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  }

  async function fetchHistory() {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('auditoria_cargas')
        .select('*')
        .order('fecha_inicio', { ascending: false })
        .limit(50);
        
      if (!error && data) {
        setHistory(data);
      }
    } catch {
      // historial no crítico
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    let interval;
    if (history.some(h => h.estado === 'procesando')) {
      interval = setInterval(() => {
        fetchHistory();
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [history]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) validateAndSet(selected);
  };

  const validateAndSet = (selected) => {
    const isCsv = selected.name.endsWith('.csv');
    const isExcel = selected.name.endsWith('.xlsx') || selected.name.endsWith('.xls');
    
    if (!isCsv && !isExcel) {
      setResult({ success: false, message: 'Solo se permiten archivos .csv, .xlsx o .xls' });
      return;
    }
    setFile(selected);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSet(dropped);
  };

  const handleSubmit = async () => {
    if (!file || !user) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar archivo');
      }
      
      setResult({ success: true, message: data.message });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      fetchHistory();
    } catch (err) {
      setResult({ success: false, message: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const totalRows = history.reduce((acc, curr) => acc + (curr.registros || 0), 0);
  const successCount = history.filter(h => h.estado === 'exitoso').length;
  const errorCount = history.filter(h => h.estado === 'error').length;

  const getInitials = (name) => {
    return name ? name.substring(0, 2).toUpperCase() : '??';
  };

  if (!user || !profile) return null; // loading state essentially

  return (
    <div className="dashboard-wrapper">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-logo-box">BI</div>
          <span className="brand-name">RETAIL</span>
        </div>
        <div className="topbar-right">
          <div className="user-profile">
            <span className="user-name-label">{profile.username}</span>
            <span className="user-role-label">{profile.role.toUpperCase()}</span>
          </div>
          <button className="btn-header-logout" onClick={handleLogout}>Cerrar Sesión</button>
        </div>
      </header>

      <main className="dashboard-main animate-fade-in">
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'carga' ? 'active' : ''}`}
            onClick={() => setActiveTab('carga')}
          >
            Carga de Datos
          </button>
          <button 
            className={`tab-btn ${activeTab === 'analitica' ? 'active' : ''}`}
            onClick={() => setActiveTab('analitica')}
          >
            Analítica BI
          </button>
        </div>
        {activeTab === 'carga' && (
          <>
            <section className="kpi-grid">
              <div className="kpi-card glass-card total">
                <div className="kpi-icon">📁</div>
                <div className="kpi-info">
                  <h3>TOTAL REGISTROS</h3>
                  <div className="kpi-value">{totalRows.toLocaleString()}</div>
                </div>
              </div>
              
              <div className="kpi-card glass-card success">
                <div className="kpi-icon">✅</div>
                <div className="kpi-info">
                  <h3>CARGAS EXITOSAS</h3>
                  <div className="kpi-value">{successCount.toLocaleString()}</div>
                </div>
              </div>

              <div className="kpi-card glass-card error">
                <div className="kpi-icon">⚠️</div>
                <div className="kpi-info">
                  <h3>CARGAS CON ERROR</h3>
                  <div className="kpi-value">{errorCount.toLocaleString()}</div>
                </div>
              </div>
            </section>

            <section className="main-grid">
              <div className="upload-section glass-card">
                <div className="section-header">
                  <h3>CARGA DE DATOS</h3>
                  <p>Selecciona un archivo CSV o Excel para el proceso ETL</p>
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
                    accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  
                  <div className="dropzone-content">
                    <span className="upload-cloud-icon">📤</span>
                    <p>Arrastra tu archivo CSV o Excel aquí</p>
                    <span className="browse-text">o haz clic para explorar</span>
                  </div>

                  {file && (
                    <div className="selected-file-overlay" style={{marginTop: '1rem', color: '#0072ff', fontWeight: 'bold'}}>
                      <span className="file-name-v2">{file.name}</span>
                    </div>
                  )}
                </div>
                
                {result && (
                  <div style={{ marginTop: '1rem', color: result.success ? '#00f2a6' : '#ff4d6d' }}>
                    {result.message}
                  </div>
                )}

                <button
                  className="btn-action-primary"
                  onClick={handleSubmit}
                  disabled={!file || uploading}
                >
                  {uploading ? (
                    <>
                      <span className="spinner"></span>
                      Procesando...
                    </>
                  ) : (
                    'Iniciar Procesamiento'
                  )}
                </button>

                <div className="upload-metadata">
                  <div className="meta-row">
                    <span>Formatos</span>
                    <span className="meta-val">.csv, .xlsx, .xls</span>
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
                        <th>PASARON</th>
                        <th>RECHAZADOS</th>
                        <th>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="empty-row" style={{textAlign: 'center', opacity: 0.5}}>Sin registros</td>
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
                                <div className="avatar">{getInitials(row.username)}</div>
                                <span className="username-text">{row.username}</span>
                              </div>
                            </td>
                            <td>
                              <div className="date-cell">
                                <span className="date-main">{new Date(row.fecha_inicio).toLocaleDateString()}</span>
                                <span className="date-sub">{new Date(row.fecha_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </td>
                            <td className="records-cell" style={{color: '#00f2a6'}}>
                              {row.estado === 'procesando' ? (
                                <span className="processing-text" style={{color: '#ffb800'}}>...</span>
                              ) : (
                                row.registros?.toLocaleString() || '0'
                              )}
                            </td>
                            <td className="records-cell" style={{color: '#ff4d6d'}}>
                              {row.estado === 'procesando' ? (
                                <span className="processing-text" style={{color: '#ffb800'}}>...</span>
                              ) : (
                                row.registros_rechazados?.toLocaleString() || '0'
                              )}
                            </td>
                            <td>
                              {row.estado === 'exitoso' || row.estado === 'error' ? (
                                <button 
                                  className="btn-action-secondary" 
                                  onClick={() => verAnalisis(row.id)}
                                  style={{padding: '0.4rem 0.8rem', fontSize: '0.85rem'}}
                                >
                                  Ver Análisis
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'analitica' && (
          <section className="analytics-section">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
              <h2 style={{color: 'var(--text)', margin: 0}}>Ingresos por Sucursal</h2>
              <button 
                className="btn-action-primary" 
                onClick={() => verAnalisis()}
                disabled={loadingAnalytics}
                style={{width: 'auto', padding: '0.75rem 1.5rem', margin: 0}}
              >
                {loadingAnalytics ? (
                  <>
                    <span className="spinner"></span>
                    Cargando...
                  </>
                ) : (
                  'Generar Análisis de Todas las Ventas'
                )}
              </button>
            </div>
            
            <div className="glass-card" style={{padding: '2rem', minHeight: '400px', background: 'var(--surface)', border: '1px solid var(--border)'}}>
              {loadingAnalytics ? (
                 <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '350px', color: 'var(--text-muted)'}}>
                   <span className="spinner" style={{width: '32px', height: '32px', marginBottom: '1rem'}}></span>
                   <p>Generando métricas desde la base de datos...</p>
                 </div>
              ) : analyticsData.length > 0 ? (
                <div style={{ width: '100%', height: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" />
                      <YAxis stroke="var(--text-muted)" />
                      <Tooltip cursor={{fill: 'var(--surface-hover)'}} contentStyle={{backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)', borderRadius: '8px'}} />
                      <Bar dataKey="Ingresos" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : hasSearched ? (
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '350px'}}>
                  <p style={{color: '#ff4d6d'}}>No hay datos de ventas registrados en la base de datos para este archivo.</p>
                </div>
              ) : (
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '350px'}}>
                  <p style={{color: '#8b949e'}}>Haz clic en "Generar Análisis" o selecciona un archivo del historial.</p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
