import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pabloesteban2012opscghnwjgzx.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'TU_ANON_KEY_AQUI'
);

export default async function handler(req, res) {
  // ✅ FIX: Parsea JSON manual
  let body;
  try {
    body = JSON.parse(req.body || '{}');
  } catch {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST' });
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
    console.error('Supabase error:', error);
    res.status(500).json({ error: error.message });
  }
}
