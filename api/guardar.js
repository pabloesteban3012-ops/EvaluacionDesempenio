import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pabloesteban2012opscghnwjgzx.supabase.co',
  process.env.SUPABASE_ANON_KEY || '' 
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // 🔧 DEBUG COMPLETO
  console.log('=== DEBUG ===');
  console.log('Method:', req.method);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body raw:', req.body ? `'${req.body.substring(0, 100)}...'` : 'VACÍO');
  console.log('Body length:', req.body?.length || 0);

  // FIX JSON parsing robusto
  let body = {};
  if (!req.body || req.body.length === 0) {
    return res.status(400).json({ 
      error: 'Body vacío', 
      debug: { headers: req.headers, bodyLength: req.body?.length } 
    });
  }

  try {
    body = JSON.parse(req.body.toString());
  } catch (parseError) {
    return res.status(400).json({ 
      error: 'JSON inválido', 
      rawBody: req.body.toString(),
      parseError: parseError.message 
    });
  }

  // Guarda en Supabase
  try {
    const { data, error } = await supabase
      .from('evaluaciones')
      .insert([body])
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, id: data.id, data: data });
  } catch (error) {
    console.error('Supabase error:', error);
    res.status(500).json({ error: error.message });
  }
}
