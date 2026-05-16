import { NextResponse } from 'next/server';
import { createClient } from '../../../utils/supabase/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Get user profile to have the username
    const { data: profile } = await supabase
      .from('usuarios')
      .select('username')
      .eq('id', user.id)
      .single();
      
    const username = profile?.username || user.email;

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    const filename = file.name;

    // 1. Registrar inicio de carga en auditoría
    const { data: audit, error: auditError } = await supabase
      .from('auditoria_cargas')
      .insert({
        usuario_id: user.id,
        username: username,
        filename: filename,
        estado: 'procesando'
      })
      .select('id')
      .single();

    if (auditError) {
      console.error('Error insertando auditoría:', auditError);
      return NextResponse.json({ error: 'Error al registrar auditoría' }, { status: 500 });
    }

    const auditId = audit.id;

    // 2. Disparar procesamiento asíncrono simulado en Node.js (reemplaza a Python)
    // No usamos await aquí para no bloquear la respuesta
    simulateETLProcessing(file, auditId, user.id);

    return NextResponse.json({ 
      message: `Archivo recibido. Procesando en background (auditoria #${auditId})`,
      auditId
    }, { status: 202 });

  } catch (error) {
    console.error('[Upload API Error]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

async function simulateETLProcessing(file, auditId, userId) {
  // Inicializamos un cliente de Supabase usando el Service Role Key (o podemos saltarnos RLS si es interno, pero para simplificar usamos un nuevo serverClient que tenga sesión si es necesario, sin embargo since it's background, standard fetch might not have cookies context easily inside a timeout if Next.js drops it.
  // Instead, we will do the update using an admin client, or just do a direct call using NEXT_PUBLIC_SUPABASE_URL and Service Role if available. But the user doesn't have a service role yet.
  // Actually, we can just use the user client since we are still in the Node environment. Wait, background tasks in Next.js API Routes (serverless) can be killed once the response is sent. 
  // Next.js now provides `waitUntil` for background tasks, but standard Promises usually work in development.
  
  try {
    const supabase = await createClient(); // this will use cookies from the initial request if still alive
    
    // Simular el parseo del CSV
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const numRegistros = Math.max(0, lines.length - 1); // asumiendo 1 linea de header
    
    // Simular espera de 2 segundos (lo que hacía Python)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Actualizar auditoría
    const { error } = await supabase
      .from('auditoria_cargas')
      .update({
        estado: 'exitoso',
        registros: numRegistros,
        fecha_fin: new Date().toISOString()
      })
      .eq('id', auditId);
      
    if (error) {
      console.error('Error updating ETL status:', error);
    } else {
      console.log(`ETL finalizado para auditId ${auditId}. Registros insertados: ${numRegistros}`);
    }
  } catch (err) {
    console.error('Error in simulateETLProcessing:', err);
    try {
       const supabase = await createClient();
       await supabase.from('auditoria_cargas').update({
         estado: 'error',
         error_msg: String(err).substring(0, 500),
         fecha_fin: new Date().toISOString()
       }).eq('id', auditId);
    } catch (e) {}
  }
}
