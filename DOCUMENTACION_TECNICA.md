# 🏪 BI Retail — Documentación Técnica y Funcional
**Universidad Mariano Gálvez — Administración de Sistemas de Información**

---

## 🏛️ 1. Arquitectura del Sistema

El proyecto está construido bajo una arquitectura **Full-Stack Moderna** utilizando **Next.js (App Router)**. A diferencia de arquitecturas tradicionales que separan el frontend y el backend en distintos repositorios o servidores, BI Retail unifica ambas capas dentro de un único entorno robusto ubicado en la carpeta `web/`.

```
proyecto-bi-retail/
├── web/
│   ├── app/
│   │   ├── dashboard/     # Aplicación cliente: Panel de control y monitoreo ETL
│   │   ├── login/         # Aplicación cliente: Inicio de sesión seguro
│   │   └── api/upload/    # Servidor (API Route): Motor ETL y procesamiento de archivos
│   ├── utils/supabase/    # Clientes de conexión a Base de Datos (Cliente, Servidor y Admin)
│   └── middleware.js      # Middleware de seguridad para protección de rutas
└── DOCUMENTACION_TECNICA.md
```

---

## 💻 2. Lenguajes de Programación y Tecnologías

El ecosistema tecnológico se compone de los siguientes lenguajes y herramientas estandarizadas:

### ⚡ JavaScript / ECMAScript (ES6+)
Es el lenguaje central de todo el proyecto. Se utiliza tanto en el frontend (React 19) como en el backend (Node.js / Next.js API Routes).
- **Frontend:** Manejo del DOM, estado interactivo (`useState`, `useEffect`), eventos de *Drag & Drop* y peticiones HTTP asíncronas (`fetch`).
- **Backend:** Lógica de servidor, validación de formularios multipart (`FormData`), manejo de buffers de memoria y temporizadores asíncronos (`setTimeout`).

### 🎨 HTML5 & CSS3 (Diseño *Glassmorphism*)
- **HTML Semántico:** Estructuración accesible mediante etiquetas modernas (`<header>`, `<main>`, `<section>`, `<aside>`, `<table role="grid">`).
- **CSS Puro (Vanilla CSS):** Implementación de un sistema de diseño premium sin frameworks externos. Destaca el uso del efecto **Glassmorphism** (tarjetas de vidrio esmerilado translúcidas con desenfoque de fondo `backdrop-filter`, bordes sutiles y gradientes dinámicos).

### 🗄️ SQL & PL/pgSQL (PostgreSQL en Supabase)
Lenguaje utilizado para la definición del esquema de base de datos en la nube, control de concurrencia y reglas de seguridad relacionales.
- **DDL:** Creación de tablas estructuradas (`usuarios`, `auditoria_cargas`).
- **PL/pgSQL:** Creación de funciones de base de datos y disparadores automáticos (*Triggers*) para la sincronización de perfiles de usuario al momento del registro.

---

## ☁️ 3. Infraestructura y Servicios Cloud (Supabase)

El backend de base de datos y autenticación está delegado a **Supabase**, una plataforma de *Backend as a Service (BaaS)* basada en PostgreSQL:

1. **Supabase Auth:** Gestiona las sesiones de usuario mediante tokens JWT seguros y encriptación de contraseñas de grado militar.
2. **PostgreSQL Database:** Almacenamiento relacional de perfiles y registros de auditoría.
3. **Row Level Security (RLS):** Motor de seguridad a nivel de fila activado en todas las tablas. Garantiza que, incluso si alguien intercepta una consulta, la base de datos rechace cualquier petición que no pertenezca al usuario autenticado o que viole sus permisos de rol.

---

## 📦 4. Librerías y Dependencias Principales

| Librería | Versión | Capa | Propósito / Funcionalidad |
| :--- | :---: | :---: | :--- |
| **Next.js** | `16.2.x` | Full-Stack | Framework principal de React para renderizado, enrutamiento y API Routes. |
| **React** | `19.2.x` | Frontend | Biblioteca de interfaz de usuario para la creación de componentes modulares. |
| **@supabase/ssr** | `0.10.x` | Servidor | Adaptador oficial de Supabase para renderizado del lado del servidor (SSR) y cookies. |
| **@supabase/supabase-js**| `2.105.x`| Full-Stack| Cliente principal para interactuar con la base de datos, autenticación y modo Admin. |
| **xlsx (SheetJS)** | `0.18.x` | Backend | Motor de decodificación binaria para leer, parsear y extraer datos de archivos Excel. |

---

## 🚀 5. Desglose de Funcionalidades del Sistema

### 🔐 A. Autenticación Inteligente y Seguridad de Rutas
- **Login Simplificado:** El usuario ingresa únicamente su identificador (ej. `admin`). El frontend compone de manera transparente el correo corporativo (`@biretail.com`) para interactuar con Supabase.
- **Protección por Middleware:** El archivo `middleware.js` intercepta cada petición en el servidor. Si un usuario sin sesión activa intenta entrar a `/dashboard`, es redirigido instantáneamente a `/login`.

### 📂 B. Módulo de Carga Multiformato (Drag & Drop)
- **Zona de Arrastre Interactiva:** Un área visual que reacciona cuando el usuario arrastra un archivo sobre ella, cambiando de color y mostrando animaciones sutiles.
- **Soporte de Formatos:** Admite archivos de texto plano (**`.csv`**) y hojas de cálculo binarias de Microsoft Excel (**`.xlsx`** y **`.xls`**).
- **Validación de Reglas de Negocio:** Impide la carga de archivos no compatibles y advierte sobre los límites del sistema (50 MB / 100,000 registros).

### ⚙️ C. Motor ETL Asíncrono en Segundo Plano (Node.js)
El corazón del procesamiento de datos reside en la API Route `/api/upload/route.js`, la cual opera en un flujo de dos etapas para garantizar una experiencia de usuario fluida:
1. **Respuesta Inmediata (Fase 1):** Al recibir el archivo, el servidor inserta un registro en la tabla `auditoria_cargas` con el estado `procesando` y responde al navegador con un código `202 Accepted`. Esto libera la pantalla del usuario inmediatamente.
2. **Procesamiento de Datos en Memoria (Fase 2):** En segundo plano, el servidor identifica el tipo de archivo:
   - *Para archivos CSV:* Parsea el texto plano y cuenta las líneas de datos de forma ultra-rápida.
   - *Para archivos Excel:* Utiliza la librería `xlsx` para transformar el buffer binario en un libro de trabajo (*workbook*), selecciona la hoja principal y la convierte a JSON para obtener el conteo exacto de filas reales.
3. **Simulación y Conclusión:** Tras simular el tiempo de limpieza y transformación de datos (2 segundos), utiliza el *Service Role Key* de Supabase para actualizar de forma segura e infalible el registro en la base de datos, cambiando el estado a `exitoso` y guardando el número de filas.

### 📊 D. Monitoreo en Tiempo Real (*Polling* Automático)
- **Tarjetas de KPI Dinámicas:** Paneles superiores que calculan en tiempo real el total histórico de registros cargados en la empresa, el conteo de cargas exitosas y las cargas fallidas.
- **Historial Vivo (Auto-Refresh):** La tabla de movimientos recientes cuenta con un algoritmo inteligente de *polling*. Si el sistema detecta que existe algún archivo en estado `procesando...`, el Dashboard consulta silenciosamente a la base de datos cada **2 segundos**. En cuanto el backend finaliza el proceso ETL, la fila de la tabla se actualiza automáticamente a **Exitoso** con su número de registros, creando una experiencia visual mágica y sin interrupciones.
