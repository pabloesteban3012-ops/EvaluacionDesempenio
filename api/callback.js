export default async function callback(req, res) {
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

  if (!cookies.oauth_state || cookies.oauth_state !== state) {
    return res.status(400).json({ error: "invalid_state" })
  }

  const tenant = process.env.AZURE_AD_TENANT_ID
  const clientId = process.env.AZURE_AD_CLIENT_ID
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET
  const redirectUri = process.env.AZURE_AD_REDIRECT_URI

  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        scope: "openid profile email User.Read",
      }),
    }
  )

  const data = await tokenResponse.json()

  if (!tokenResponse.ok) {
    return res.status(400).json(data)
  }

  res.setHeader("Set-Cookie", [
    `access_token=${data.access_token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=3600`,
    `oauth_state=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
  ])

  return res.writeHead(302, { Location: "/" }).end()
}
