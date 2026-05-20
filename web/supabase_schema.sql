-- ====================================================================
-- SCRIPT DE ACTUALIZACIÓN (MIGRACIÓN FASE 1)
-- Ejecuta esto en tu SQL Editor de Supabase
-- ====================================================================

-- 1. Actualizar tabla auditoria_cargas existente
ALTER TABLE public.auditoria_cargas ADD COLUMN IF NOT EXISTS registros_rechazados INT DEFAULT 0;

-- 2. Crear nuevas tablas (Dimensiones y Hechos)

-- SUCURSALES (Dimensión)
CREATE TABLE public.sucursales (
    nombre VARCHAR(100) PRIMARY KEY,
    ciudad VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios autenticados pueden ver sucursales" ON public.sucursales FOR SELECT USING (auth.role() = 'authenticated');

-- PRODUCTOS (Dimensión)
CREATE TABLE public.productos (
    sku VARCHAR(100) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(100),
    precio NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios autenticados pueden ver productos" ON public.productos FOR SELECT USING (auth.role() = 'authenticated');

-- VENTAS (Hechos)
CREATE TABLE public.ventas (
    id BIGSERIAL PRIMARY KEY,
    factura_id VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL,
    sku_producto VARCHAR(100) REFERENCES public.productos(sku),
    nombre_sucursal VARCHAR(100) REFERENCES public.sucursales(nombre),
    cantidad INT NOT NULL,
    monto_total NUMERIC(12, 2) NOT NULL,
    auditoria_id BIGINT REFERENCES public.auditoria_cargas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios autenticados pueden ver ventas" ON public.ventas FOR SELECT USING (auth.role() = 'authenticated');

-- ERRORES DE FILA (Data Quality)
CREATE TABLE public.errores_fila (
    id BIGSERIAL PRIMARY KEY,
    auditoria_id BIGINT REFERENCES public.auditoria_cargas(id) ON DELETE CASCADE,
    fila_numero INT,
    datos_fila JSONB,
    error_msg TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.errores_fila ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios autenticados pueden ver errores" ON public.errores_fila FOR SELECT USING (auth.role() = 'authenticated');
