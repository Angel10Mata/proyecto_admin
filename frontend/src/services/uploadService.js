const API_URL = import.meta.env.VITE_API_URL

/**
 * Sube un archivo CSV al backend para disparar el script de carga
 * @param {File} file - Archivo CSV seleccionado
 * @param {string} token - JWT del usuario autenticado
 * @param {function} onProgress - Callback opcional para progreso (0-100)
 */
export async function uploadCSV(file, token, onProgress) {
  const formData = new FormData()
  formData.append('file', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.open('POST', `${API_URL}/api/upload/csv`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    })

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data)
        } else {
          reject(new Error(data.message || 'Error en la carga'))
        }
      } catch {
        reject(new Error('Respuesta inválida del servidor'))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Error de red')))
    xhr.send(formData)
  })
}

/**
 * Obtiene el historial de cargas del backend
 * @param {string} token
 */
export async function getUploadHistory(token) {
  const response = await fetch(`${API_URL}/api/upload/history`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al obtener historial')
  }

  return data // [{ id, filename, usuario, fecha, registros, estado }]
}
