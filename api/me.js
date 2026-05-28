export default async function me(req, res) {
  const cookies = Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map(v => v.trim())
      .filter(Boolean)
      .map(v => v.split("="))
  )

  const token = cookies.access_token
  if (!token) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await graphResponse.json()
  return res.status(graphResponse.status).json(data)
}
