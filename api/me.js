// api/me.jsexport default async function handler(req, res) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map(v => v.trim())
      .filter(Boolean)
      .map(v => v.split('='))
  );

  if (!cookies.session) {
    return res.status(401).json({ authenticated: false });
  }

  let session;
  try {
    session = JSON.parse(Buffer.from(cookies.session, 'base64').toString('utf8'));
  } catch {
    return res.status(401).json({ authenticated: false });
  }

  // La sesión guarda session.user.name y session.user.email
  return res.status(200).json({
    authenticated: true,
    name: session.user?.name || 'Usuario',
    email: session.user?.email || '' 
  });
}
