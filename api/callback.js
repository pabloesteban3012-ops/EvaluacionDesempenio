// api/callback.js
export default async function handler(req, res) {
  const { code } = req.query
  if (!code) {
    return res.status(400).json({ error: "missing_code" })
  }
  const tenant = process.env.AZURE_AD_TENANT_ID
  const clientId = process.env.AZURE_AD_CLIENT_ID
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET
  const redirectUri = process.env.AZURE_AD_REDIRECT_URI
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
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
    }
  )
  const tokenData = await tokenResponse.json()
  if (!tokenResponse.ok) {
    return res.status(400).json(tokenData)
  }
  // ✅ CON $select - agregado officeLocation para "área"
  const meResponse = await fetch(
    "https://graph.microsoft.com/v1.0/me?$select=displayName,mail,department,jobTitle,companyName,officeLocation",
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }
  )
  const me = await meResponse.json()
  const sessionPayload = Buffer.from(JSON.stringify({
    user: {
      name: me.displayName || me.userPrincipalName || "Usuario",
      email: me.mail || me.userPrincipalName || "",
      department: me.department || "Sin departamento",
      area: me.officeLocation || "Sin área",
      jobTitle: me.jobTitle || "Sin cargo",
      companyName: me.companyName || ""
    },
    time: Date.now()
  })).toString("base64")
  const isProd = process.env.VERCEL_ENV === "production"
  const sessionCookie = `session=${sessionPayload}; Path=/; Max-Age=86400; SameSite=${isProd ? "None" : "Lax"}${isProd ? "; Secure" : ""}`
  res.setHeader("Set-Cookie", [
    sessionCookie,
    `oauth_state=; Path=/; Max-Age=0`,
  ])
  return res.writeHead(302, { Location: "/" }).end()
}
