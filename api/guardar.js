import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

const supabaseUrl = 'https://pabloesteban2012opscghnwjgzx.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'TU_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ Desactiva body parsing automático
export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  // 🔧 LEE RAW BODY con micro
  const rawBody = await buffer(req);
  const body = JSON.parse(rawBody.toString());

  console.log('Raw body recibido:', body);

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
    res.status(500).json({ error: error.message });
  }
}
