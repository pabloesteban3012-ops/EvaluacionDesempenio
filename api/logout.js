export default async function handler(req, res) {
  res.setHeader('Set-Cookie', [
    'session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0'
  ]);
  return res.status(200).json({ success: true });
}
