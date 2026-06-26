// api/debug-graph.js - Endpoint temporal para diagnosticar
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
    return res.status(401).json({ error: 'no_session' });
  }

  let session;
  try {
    session = JSON.parse(Buffer.from(cookies.session, 'base64').toString('utf8'));
  } catch (err) {
    return res.status(401).json({ error: 'invalid_session' });
  }

  const token = session.access_token;
  
  // Prueba 1: /me con $select
  const me1 = await fetch(
    "https://graph.microsoft.com/v1.0/me?$select=displayName,mail,department,jobTitle,companyName,officeLocation",
    { headers: { Authorization: `Bearer ${token}` } }
  ).then(r => r.json());

  // Prueba 2: /me/profile
  const me2 = await fetch(
    "https://graph.microsoft.com/v1.0/me/profile",
    { headers: { Authorization: `Bearer ${token}` } }
  ).then(r => r.json()).catch(() => ({ error: 'profile not available' }));

  // Prueba 3: /me sin $select (todos los campos por defecto)
  const me3 = await fetch(
    "https://graph.microsoft.com/v1.0/me",
    { headers: { Authorization: `Bearer ${token}` } }
  ).then(r => r.json());

  return res.status(200).json({
    prueba1_me_select: me1,
    prueba2_me_profile: me2,
    prueba3_me_default: me3
  });
}
