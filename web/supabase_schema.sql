-- ====================================================================
-- 🏪 BI RETAIL — ESQUEMA DE BASE DE DATOS Y SEGURIDAD (SUPABASE)
-- ====================================================================

-- 1. TABLA DE USUARIOS (Vinculada a auth.users de Supabase)
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'operador',
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security (RLS) en usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para usuarios
CREATE POLICY "Usuarios autenticados pueden ver perfiles" 
ON public.usuarios 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden actualizar su propio perfil" 
ON public.usuarios 
FOR UPDATE 
USING (auth.uid() = id);


-- 2. TABLA DE AUDITORÍA DE CARGAS
CREATE TABLE public.auditoria_cargas (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    fecha_inicio TIMESTAMPTZ DEFAULT now(),
    fecha_fin TIMESTAMPTZ,
    registros INT,
    estado VARCHAR(50) DEFAULT 'procesando' CHECK (estado IN ('procesando', 'exitoso', 'error')),
    error_msg TEXT
);

-- Habilitar Row Level Security (RLS) en auditoria_cargas
ALTER TABLE public.auditoria_cargas ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para auditoria_cargas
CREATE POLICY "Usuarios autenticados pueden ver el historial de cargas" 
ON public.auditoria_cargas 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden registrar nuevas cargas" 
ON public.auditoria_cargas 
FOR INSERT 
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden actualizar el estado de sus propias cargas (ETL)" 
ON public.auditoria_cargas 
FOR UPDATE 
USING (auth.uid() = usuario_id);


-- ====================================================================
-- 3. AUTOMATIZACIÓN: TRIGGER PARA CREAR PERFIL AL REGISTRAR USUARIO
-- ====================================================================
-- Este trigger crea automáticamente un registro en public.usuarios 
-- cada vez que un nuevo usuario se registra en Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (id, username, role)
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'operador')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
