// api/me.js
export default async function handler(req, res) {
  const cookieHeader = req.headers.cookie || '';
  
  console.log('Cookie header recibido:', cookieHeader); // Debug log
  
  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map(v => v.trim())
      .filter(Boolean)
      .map(v => {
        const idx = v.indexOf('=');
        return [v.slice(0, idx), v.slice(idx + 1)];
      })
  );

  console.log('Cookies parseadas:', Object.keys(cookies)); // Debug log

  if (!cookies.session) {
    return res.status(401).json({ authenticated: false, error: 'no_session_cookie' });
  }

  let session;
  try {
    session = JSON.parse(Buffer.from(cookies.session, 'base64').toString('utf8'));
    console.log('Sesión decodificada:', session); // Debug log
  } catch (err) {
    console.error('Error decodificando sesión:', err);
    return res.status(401).json({ authenticated: false, error: 'invalid_session' });
  }

  return res.status(200).json({
    authenticated: true,
    name: session.user?.name || 'Usuario',
    email: session.user?.email || ''
  });
}
