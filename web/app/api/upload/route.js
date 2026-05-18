import { NextResponse } from 'next/server';
import { createClient } from '../../../utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';

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
  try {
    // Inicializamos un cliente de Supabase con Service Role Key para actualizar en segundo plano sin depender de cookies()
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    let numRegistros = 0;
    
    // Procesar según el tipo de archivo
    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim() !== '');
      numRegistros = Math.max(0, lines.length - 1); // asumiendo 1 linea de header
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = xlsx.read(arrayBuffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = xlsx.utils.sheet_to_json(worksheet);
      numRegistros = json.length;
    }
    
    // Simular espera de 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Actualizar auditoría
    const { error } = await supabaseAdmin
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
       const supabaseAdmin = createSupabaseClient(
         process.env.NEXT_PUBLIC_SUPABASE_URL,
         process.env.SUPABASE_SERVICE_ROLE_KEY,
         { auth: { autoRefreshToken: false, persistSession: false } }
       );
       await supabaseAdmin.from('auditoria_cargas').update({
         estado: 'error',
         error_msg: String(err).substring(0, 500),
         fecha_fin: new Date().toISOString()
       }).eq('id', auditId);
    } catch (e) {
       console.error('Fatal error updating audit error state:', e);
    }
  }
}
