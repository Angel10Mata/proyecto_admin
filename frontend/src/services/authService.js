const API_URL = import.meta.env.VITE_API_URL

/**
 * Envía credenciales al backend y retorna { token, user }
 * @param {{ username: string, password: string }} credentials
 */
export async function loginUser(credentials) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al iniciar sesión')
  }

  return data // { token, user: { id, username, role } }
}
