export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  await new Promise(resolve => req.on('end', resolve));

  let data;
  try {
    data = JSON.parse(body || '{}');
  } catch {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  const validUser = process.env.LOCAL_LOGIN_USER || 'admin';
  const validPass = process.env.LOCAL_LOGIN_PASS || '123456';

  if (data.username !== validUser || data.password !== validPass) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  const token = Buffer.from(JSON.stringify({
    username: data.username,
    time: Date.now()
  })).toString('base64');

  const isProd = process.env.VERCEL_ENV === 'production';

  res.setHeader('Set-Cookie', [
    `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${isProd ? '; Secure' : ''}`
  ]);

  return res.status(200).json({ success: true });
}
