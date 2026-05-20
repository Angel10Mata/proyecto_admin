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

    // 2. Disparar procesamiento asíncrono real en Node.js
    // No usamos await aquí para no bloquear la respuesta
    processETL(file, auditId, user.id);

    return NextResponse.json({ 
      message: `Archivo recibido. Procesando en background (auditoria #${auditId})`,
      auditId
    }, { status: 202 });

  } catch (error) {
    console.error('[Upload API Error]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

async function processETL(file, auditId, userId) {
  try {
    // Inicializamos un cliente de Supabase con Service Role Key para hacer inserts en segundo plano
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
    
    let jsonData = [];
    const arrayBuffer = await file.arrayBuffer();
    
    // Parsear el archivo con soporte de fechas de Excel
    const workbook = xlsx.read(arrayBuffer, { type: 'buffer', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    jsonData = xlsx.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      throw new Error('El archivo está vacío o no se pudo leer');
    }

    // 1. Extraer y Upsert Sucursales Únicas
    const sucursalesMap = new Map();
    jsonData.forEach(row => {
      if (row.sucursal) {
        sucursalesMap.set(String(row.sucursal).trim(), {
          nombre: String(row.sucursal).trim(),
          ciudad: row.ciudad ? String(row.ciudad).trim() : null
        });
      }
    });

    const sucursalesArray = Array.from(sucursalesMap.values());
    if (sucursalesArray.length > 0) {
      const { error } = await supabaseAdmin.from('sucursales').upsert(sucursalesArray, { onConflict: 'nombre' });
      if (error) throw new Error('Error guardando sucursales: ' + error.message);
    }

    // 2. Extraer y Upsert Productos Únicos
    const productosMap = new Map();
    jsonData.forEach(row => {
      if (row.sku) {
        productosMap.set(String(row.sku).trim(), {
          sku: String(row.sku).trim(),
          nombre: row.producto ? String(row.producto).trim() : 'Sin Nombre',
          categoria: row.categoria ? String(row.categoria).trim() : 'General',
          precio: row.precio ? parseFloat(row.precio) : 0
        });
      }
    });

    const productosArray = Array.from(productosMap.values());
    if (productosArray.length > 0) {
      const { error } = await supabaseAdmin.from('productos').upsert(productosArray, { onConflict: 'sku' });
      if (error) throw new Error('Error guardando productos: ' + error.message);
    }

    // 3. Procesar Ventas y Validar Errores por fila
    const validVentas = [];
    const errores = [];

    jsonData.forEach((row, index) => {
      const fila_numero = index + 2; // +1 por ser index 0, +1 por la cabecera
      
      // Validaciones de campos obligatorios
      if (!row.factura_id || !row.sku || !row.sucursal || !row.cantidad || !row.fecha) {
        errores.push({
          auditoria_id: auditId,
          fila_numero,
          datos_fila: row,
          error_msg: 'Faltan campos obligatorios (factura_id, sku, sucursal, cantidad, fecha)'
        });
        return;
      }

      const cantidad = parseInt(row.cantidad, 10);
      const precio = row.precio ? parseFloat(row.precio) : 0;
      
      if (isNaN(cantidad) || cantidad <= 0) {
        errores.push({
          auditoria_id: auditId,
          fila_numero,
          datos_fila: row,
          error_msg: 'La cantidad debe ser un número entero mayor a 0'
        });
        return;
      }

      // Procesar la fecha (xlsx cellDates convierte fechas a objetos Date de JS)
      let fechaVenta;
      if (row.fecha instanceof Date && !isNaN(row.fecha)) {
        fechaVenta = row.fecha.toISOString().split('T')[0];
      } else {
        // Fallback por si viene como texto válido (ej. "2026-05-18")
        const parsed = new Date(row.fecha);
        if (!isNaN(parsed)) {
          fechaVenta = parsed.toISOString().split('T')[0];
        } else {
          errores.push({
            auditoria_id: auditId,
            fila_numero,
            datos_fila: row,
            error_msg: 'Formato de fecha inválido'
          });
          return;
        }
      }

      validVentas.push({
        factura_id: String(row.factura_id).trim(),
        fecha: fechaVenta,
        sku_producto: String(row.sku).trim(),
        nombre_sucursal: String(row.sucursal).trim(),
        cantidad: cantidad,
        monto_total: cantidad * precio,
        auditoria_id: auditId
      });
    });

    // 4. Insertar Ventas Validadas por bloques (Chunks) para optimizar
    if (validVentas.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < validVentas.length; i += chunkSize) {
        const chunk = validVentas.slice(i, i + chunkSize);
        const { error } = await supabaseAdmin.from('ventas').insert(chunk);
        if (error) throw new Error('Error insertando ventas: ' + error.message);
      }
    }

    // 5. Registrar Errores de Fila (si los hay)
    if (errores.length > 0) {
      const { error } = await supabaseAdmin.from('errores_fila').insert(errores);
      if (error) console.error('Error insertando errores de fila:', error);
    }

    // 6. Finalizar: Actualizar Auditoría
    const estadoFinal = errores.length === jsonData.length ? 'error' : 'exitoso';
    const numRegistros = validVentas.length;
    let msg = null;
    
    if (errores.length > 0) {
      msg = `Se insertaron ${numRegistros} registros. Hubo ${errores.length} filas ignoradas por errores.`;
    }

    const { error: auditErr } = await supabaseAdmin
      .from('auditoria_cargas')
      .update({
        estado: estadoFinal,
        registros: numRegistros,
        registros_rechazados: errores.length,
        error_msg: msg,
        fecha_fin: new Date().toISOString()
      })
      .eq('id', auditId);
      
    if (auditErr) {
      console.error('Error updating ETL status:', auditErr);
    } else {
      console.log(`ETL finalizado para auditId ${auditId}. Ventas: ${numRegistros}, Errores: ${errores.length}`);
    }
    
  } catch (err) {
    console.error('Error in processETL:', err);
    try {
       const supabaseAdmin = createSupabaseClient(
         process.env.NEXT_PUBLIC_SUPABASE_URL,
         process.env.SUPABASE_SERVICE_ROLE_KEY,
         { auth: { autoRefreshToken: false, persistSession: false } }
       );
       await supabaseAdmin.from('auditoria_cargas').update({
         estado: 'error',
         error_msg: String(err.message || err).substring(0, 500),
         fecha_fin: new Date().toISOString()
       }).eq('id', auditId);
    } catch (e) {
       console.error('Fatal error updating audit error state:', e);
    }
  }
}
