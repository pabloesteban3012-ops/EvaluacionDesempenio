import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pabloesteban2012opscghnwjgzx.supabase.co',
  'sb_secret_IHZEmHEKirA38YlyRCy4og_Uqb9U8-V'
);

export default async function handler(req, res) {
  // CORS primero
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Raw body manual (Vercel fix)
  let body;
  try {
    body = req.body ? JSON.parse(req.body) : {};
  } catch {
    return res.status(400).json({ error: 'JSON inválido', body: req.body });
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
    console.error('Error completo:', error);
    res.status(500).json({ error: error.message });
  }
}
