// api/me.js
export default async function handler(req, res) {
  const cookieHeader = req.headers.cookie || '';
  
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

  if (!cookies.session) {
    return res.status(401).json({ authenticated: false, error: 'no_session_cookie' });
  }

  let session;
  try {
    session = JSON.parse(Buffer.from(cookies.session, 'base64').toString('utf8'));
  } catch (err) {
    return res.status(401).json({ authenticated: false, error: 'invalid_session' });
  }

  console.log('👤 USUARIO:', {
    nombre: session.user?.name,
    email: session.user?.email,
    departamento: session.user?.department,
    cargo: session.user?.jobTitle,
    empresa: session.user?.companyName
  });

  return res.status(200).json({
    authenticated: true,
    name: session.user?.name || 'Usuario',
    email: session.user?.email || '',
    department: session.user?.department || 'Sin departamento',
    jobTitle: session.user?.jobTitle || 'Sin cargo',
    companyName: session.user?.companyName || ''
  });
}
