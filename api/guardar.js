import { createClient } from '@supabase/supabase-js';


if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Faltan variables de entorno de Supabase');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }, 
    global: { headers: { 'X-Client-Info': 'guardar-api' } }
  }
);


export const config = {
  api: {
    bodyParser: { sizeLimit: '500kb' }, // Previene DoS por memoria
  },
};

export default async function handler(req, res) {
  // Headers CORS seguros
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  // Timeout global (evita colgas por Supabase lento)
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('[guardar.js] Timeout excedido');
      res.status(504).json({ error: 'Timeout: La operación tardó demasiado' });
    }
  }, 25000);

  try {
    // Body parsing robusto con validación
    let body = {};
    if (req.body) {
      try {
        const raw = typeof req.body === 'string' ? req.body : req.body.toString();
        body = JSON.parse(raw);
      } catch (parseError) {
        clearTimeout(timeout);
        console.warn('[guardar.js] JSON inválido:', parseError.message);
        return res.status(400).json({ error: 'JSON inválido', details: parseError.message });
      }
    }

    // Validación de schema básico (evita inserts corruptos)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      clearTimeout(timeout);
      return res.status(400).json({ error: 'El body debe ser un objeto JSON' });
    }

    // Campos críticos (ajusta según tu tabla)
    const camposRequeridos = ['evaluador', 'fecha']; // Ejemplo
    for (const campo of camposRequeridos) {
      if (body[campo] === undefined || body[campo] === null) {
        clearTimeout(timeout);
        return res.status(400).json({ error: `Campo requerido faltante: ${campo}` });
      }
    }

    // Insert con manejo explícito de errores de Supabase
    const { data, error } = await supabase
      .from('evaluaciones')
      .insert([body])
      .select('id') // Solo trae lo necesario (reduce payload)
      .single();

    if (error) {
      clearTimeout(timeout);
      console.error('[guardar.js] Error de Supabase:', {
        code: error.code,
        message: error.message,
        details: error.details
      });

      // Mapeo de errores comunes de Supabase
      if (error.code === '23505') { // Violación de unique constraint
        return res.status(409).json({ error: 'Registro duplicado', code: 'DUPLICATE' });
      }
      if (error.code === '23503') { // Violación de foreign key
        return res.status(400).json({ error: 'Referencia inválida', code: 'FOREIGN_KEY' });
      }
      if (error.code === 'PGRST301') { // Resource not found
        return res.status(404).json({ error: 'Tabla no encontrada', code: 'NOT_FOUND' });
      }

      throw error;
    }

    clearTimeout(timeout);
    console.log('[guardar.js] Insert exitoso:', { id: data?.id });
    return res.status(201).json({ 
      success: true, 
      id: data?.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    clearTimeout(timeout);
    
    // Logging estructurado (no expongas stack en prod)
    console.error('[guardar.js] Error crítico:', {
      message: error.message,
      code: error.code || 'INTERNAL_ERROR',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Respuesta segura al cliente
    const isClientError = error.status >= 400 && error.status < 500;
    return res.status(isClientError ? error.status : 500).json({
      error: isClientError ? error.message : 'Error interno del servidor',
      code: error.code || 'INTERNAL_ERROR',
      success: false
    });
  }
}
