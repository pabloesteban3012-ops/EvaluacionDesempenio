import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: { sizeLimit: '500kb' },
  },
};

export default async function handler(req, res) {
  // ✅ MOVER: Validar env vars DENTRO del handler (no en module scope)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  // 🚨 LOG DE DEBUG (verás esto en vercel logs)
  console.log('[guardar.js] Env vars check:', {
    urlPresent: !!supabaseUrl,
    urlLength: supabaseUrl?.length || 0,
    keyPresent: !!supabaseKey,
    keyLength: supabaseKey?.length || 0,
    nodeEnv: process.env.NODE_ENV
  });

  if (!supabaseUrl || !supabaseKey) {
    console.error('[guardar.js] FALTAN ENV VARS:', {
      url: supabaseUrl ? 'OK' : 'MISSING',
      key: supabaseKey ? 'OK' : 'MISSING'
    });
    return res.status(500).json({ 
      error: 'Configuración del servidor incompleta',
      code: 'MISSING_ENV'
    });
  }

  // ✅ Crear cliente DENTRO del handler
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Client-Info': 'guardar-api' } }
  });

  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  // Timeout
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('[guardar.js] Timeout excedido');
      res.status(504).json({ error: 'Timeout: La operación tardó demasiado' });
    }
  }, 25000);

  try {
    // Body parsing
    let body = {};
    if (req.body) {
      try {
        const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        body = typeof req.body === 'object' ? req.body : JSON.parse(raw);
      } catch (parseError) {
        clearTimeout(timeout);
        console.warn('[guardar.js] JSON inválido:', parseError.message);
        return res.status(400).json({ error: 'JSON inválido' });
      }
    }

    // Validación básica
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      clearTimeout(timeout);
      return res.status(400).json({ error: 'El body debe ser un objeto JSON' });
    }

    // Insert en Supabase
    const { data, error } = await supabase
      .from('evaluaciones')
      .insert([body])
      .select('id')
      .single();

    if (error) {
      clearTimeout(timeout);
      console.error('[guardar.js] Error de Supabase:', {
        code: error.code,
        message: error.message,
        details: error.details
      });

      if (error.code === '23505') return res.status(409).json({ error: 'Registro duplicado' });
      if (error.code === '23503') return res.status(400).json({ error: 'Referencia inválida' });
      
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
    console.error('[guardar.js] Error crítico:', {
      message: error.message,
      code: error.code || 'INTERNAL_ERROR',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    const isClientError = error.status >= 400 && error.status < 500;
    return res.status(isClientError ? error.status : 500).json({
      error: isClientError ? error.message : 'Error interno del servidor',
      code: error.code || 'INTERNAL_ERROR',
      success: false
    });
  }
}
