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
    console.error('Error decodificando sesión:', err);
    return res.status(401).json({ authenticated: false, error: 'invalid_session' });
  }

  // Log para debug - muestra el departamento en los logs de Vercel
  console.log('👤 USUARIO CONECTADO:', {
    nombre: session.user?.name,
    email: session.user?.email,
    departamento: session.user?.Department,
    cargo: session.user?.Title,
    empresa: session.user?.companyName,
    ubicacion: session.user?.officeLocation
  });

  return res.status(200).json({
    authenticated: true,
    name: session.user?.name || 'Usuario',
    email: session.user?.email || '',
    department: session.user?.Department || 'Sin departamento',
    jobTitle: session.user?.Title || 'Sin cargo',
    officeLocation: session.user?.officeLocation || 'Sin ubicación',
    companyName: session.user?.companyName || '',
    city: session.user?.city || '',
    country: session.user?.country || ''
  });
}
