import crypto from "crypto"

export default async function login(req, res) {
  const tenant = process.env.AZURE_AD_TENANT_ID
  const clientId = process.env.AZURE_AD_CLIENT_ID
  const redirectUri = process.env.AZURE_AD_REDIRECT_URI

  const state = crypto.randomBytes(16).toString("hex")

  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`)
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("response_mode", "query")
  url.searchParams.set("scope", "openid profile email User.Read")
  url.searchParams.set("state", state)

  res.setHeader(
    "Set-Cookie",
    `oauth_state=${state}; HttpOnly; Path=/; SameSite=Lax; Max-Age=600`
  )

  return res.writeHead(302, { Location: url.toString() }).end()
}
