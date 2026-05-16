# 🏪 BI Retail — Fase 2 / Entrega 2
**Universidad Mariano Gálvez — Administración de Sistemas de Información**

Sistema de seguridad y carga de datos para la plataforma de Inteligencia de Negocios.

---

## 📁 Estructura del Proyecto

```
proyecto-bi-retail/
├── frontend/          # React + Vite (Login + Módulo de Carga)
└── backend/           # Node.js + Express (API REST + JWT + MySQL)
```

---

## ⚙️ Requisitos Previos

- Node.js >= 18
- npm >= 9
- MySQL en AWS (RDS) con las tablas requeridas
- Python 3 (para el script ETL del Usuario 1)

---

## 🚀 Instalación y Ejecución

### 1. Backend

```bash
cd backend
npm install

# Configurar variables de entorno
cp .env.example .env
# → Edita .env con tus datos reales de AWS RDS y JWT

npm run dev
# Servidor en http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install

# Configurar variable de entorno
cp .env.example .env
# → Asegúrate que VITE_API_URL apunte al backend

npm run dev
# App en http://localhost:5173
```

---

## 🗄️ Tablas Requeridas en MySQL

```sql
-- Tabla de usuarios (gestionada por el Administrador de BD)
CREATE TABLE usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'operador',
  activo        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de auditoría (gestionada por el Administrador de BD)
CREATE TABLE auditoria_cargas (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT          NOT NULL,
  username     VARCHAR(100) NOT NULL,
  filename     VARCHAR(255) NOT NULL,
  fecha_inicio DATETIME     DEFAULT CURRENT_TIMESTAMP,
  fecha_fin    DATETIME     NULL,
  registros    INT          NULL,
  estado       ENUM('procesando','exitoso','error') DEFAULT 'procesando',
  error_msg    TEXT         NULL
);
```

---

## 🔑 Crear un Usuario de Prueba

```sql
-- Generar hash desde Node.js:
-- node -e "const b=require('bcryptjs'); b.hash('tu_password',10).then(console.log)"

INSERT INTO usuarios (username, password_hash, role)
VALUES ('admin', '$2a$10$HASH_GENERADO_AQUI', 'administrador');
```

---

## 📡 Endpoints de la API

| Método | Ruta                 | Auth | Descripción                     |
|--------|----------------------|------|---------------------------------|
| POST   | /api/auth/login      | ❌    | Login → retorna JWT             |
| POST   | /api/upload/csv      | ✅ JWT | Sube CSV y dispara script ETL  |
| GET    | /api/upload/history  | ✅ JWT | Historial de auditoría          |
| GET    | /health              | ❌    | Health check del servidor       |

---

## 🔒 Reglas de Seguridad Implementadas

- ✅ Sin hardcodeo — todo via variables de entorno `.env`
- ✅ Contraseñas almacenadas con bcrypt (hash salteado)
- ✅ Autenticación stateless con JWT (exp. 8h)
- ✅ Rutas protegidas con middleware de verificación de token
- ✅ CORS restringido al frontend autorizado
- ✅ Toda carga registrada en `auditoria_cargas` (usuario, fecha, archivo, estado)
- ✅ Archivos temporales eliminados después del procesamiento

---

## 👥 Roles del Equipo

| Usuario | Rol | Responsabilidad |
|---------|-----|-----------------|
| Usuario 1 | Ingeniero de Datos | Script Python ETL (`scripts/etl_carga.py`) |
| Usuario 2 | Administrador BD | Tablas MySQL, vistas, integridad |
| **Usuario 3** | **Full-Stack** | **Este repositorio** |
| Usuario 4 | Analista BI | Validación KPIs, vista auditoría |
| Usuario 5 | Científico de Datos | Registro auditoría, documentación |
