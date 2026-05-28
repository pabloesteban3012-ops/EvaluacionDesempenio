export default async function handler(req, res) {
  const { code, state } = req.query

  if (!code) {
    return res.status(400).json({ error: "missing_code" })
  }

  const cookies = Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map(v => v.trim())
      .filter(Boolean)
      .map(v => v.split("="))
  )

  if (!cookies.oauth_state || String(cookies.oauth_state) !== String(state)) {
    return res.status(400).json({ error: "invalid_state" })
  }

  const tenant = process.env.AZURE_AD_TENANT_ID
  const clientId = process.env.AZURE_AD_CLIENT_ID
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET
  const redirectUri = process.env.AZURE_AD_REDIRECT_URI

  const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      scope: "openid profile email User.Read",
    }),
  })

  const tokenData = await tokenResponse.json()
  if (!tokenResponse.ok) {
    return res.status(400).json(tokenData)
  }

  const meResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const me = await meResponse.json()

  const sessionPayload = Buffer.from(JSON.stringify({
    user: {
      name: me.displayName || me.userPrincipalName || "Usuario",
      email: me.mail || me.userPrincipalName || "",
    },
    access_token: tokenData.access_token,
    time: Date.now()
  })).toString("base64")

  const isProd = process.env.VERCEL_ENV === "production"
  const sessionCookie = `session=${sessionPayload}; Path=/; HttpOnly; Max-Age=86400; SameSite=${isProd ? "None" : "Lax"}${isProd ? "; Secure" : ""}`

  res.setHeader("Set-Cookie", [
    sessionCookie,
    `oauth_state=; Path=/; HttpOnly; Max-Age=0; SameSite=${isProd ? "None" : "Lax"}${isProd ? "; Secure" : ""}`,
  ])

  return res.writeHead(302, { Location: "/" }).end()
}
