import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pabloesteban2012opscghnwjgzx.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'TU_ANON_KEY_AQUI';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Solo POST' });
    return;
  }

  // 🔧 DEBUG + FIX JSON
  console.log('req.body length:', req.body?.length || 0);
  console.log('Content-Type:', req.headers['content-type']);
  
  let body = {};
  if (req.body && req.body.length > 0) {
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      console.error('Parse error:', e);
      res.status(400).json({ error: 'JSON inválido', raw: req.body?.substring(0, 100) });
      return;
    }
  } else {
    res.status(400).json({ error: 'Body vacío', headers: req.headers });
    return;
  }

  try {
    const { data, error } = await supabase
      .from('evaluaciones')
      .insert([body])
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, id: data.id });
  } catch (error) {
    console.error('Supabase:', error);
    res.status(500).json({ error: error.message });
  }
}
