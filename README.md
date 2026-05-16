# 🏪 BI Retail — Fase 2 / Entrega 2 (Migración a Next.js)
**Universidad Mariano Gálvez — Administración de Sistemas de Información**

Sistema de seguridad y carga de datos para la plataforma de Inteligencia de Negocios, migrado a una arquitectura moderna Full-Stack con Next.js y Supabase.

---

## 📁 Estructura del Proyecto

```
proyecto-bi-retail/
└── web/               # Aplicación Full-Stack en Next.js 15 (App Router)
    ├── app/
    │   ├── dashboard/ # Vista del panel principal de BI Retail
    │   ├── login/     # Inicio de sesión con diseño Glassmorphism
    │   └── api/       # API Routes (ej. /api/upload para carga de CSV)
    └── utils/         # Configuración y cliente de Supabase
```

---

## ⚙️ Tecnologías Principales

- **Frontend & Backend:** [Next.js 15](https://nextjs.org/) (App Router) con React 19.
- **Base de Datos & Autenticación:** [Supabase](https://supabase.com/) (PostgreSQL + Row Level Security).
- **Estilos:** CSS Puro (diseño *Glassmorphism* premium adaptado a Next.js).
- **Procesamiento de Datos (ETL):** Nativo en Node.js mediante Next.js API Routes (`/api/upload`).

---

## 🚀 Instalación y Ejecución

```bash
cd web
npm install

# Configurar variables de entorno (crear .env.local basado en la configuración de Supabase)
# NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key

npm run dev
# La aplicación estará disponible en http://localhost:3000
```

---

## 🔒 Seguridad y Arquitectura

- ✅ **Protección de Rutas:** Middleware de Next.js (`web/middleware.js`) para verificar sesiones activas.
- ✅ **Políticas RLS:** Seguridad a nivel de fila en Supabase para garantizar que cada usuario acceda únicamente a sus datos autorizados.
- ✅ **ETL Integrado:** Eliminación de dependencias externas (Python/Express), procesando y validando los archivos CSV directamente en el servidor de Next.js antes de su inserción en Supabase.
