const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api').replace(/\/$/, '')

function getTokens() {
  return {
    accessToken: localStorage.getItem('access_token'),
    refreshToken: localStorage.getItem('refresh_token'),
  }
}

export function saveSession(data) {
  localStorage.setItem('access_token', data.tokens.access_token)
  localStorage.setItem('refresh_token', data.tokens.refresh_token)
  localStorage.setItem('user', JSON.stringify(data.user))
}

export function clearSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

export function hasSession() {
  return Boolean(localStorage.getItem('access_token'))
}

export function currentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

async function parseResponse(response) {
  const text = await response.text()
  let data = {}

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
  }

  if (!response.ok) {
    const error = new Error(data.error || data.message || 'Request failed.')
    error.status = response.status
    throw error
  }

  return data
}

export async function login(username, password) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  return parseResponse(response)
}

export async function logout() {
  const { refreshToken } = getTokens()

  if (refreshToken) {
    try {
      await fetch(`${API_URL}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch {
      // Client session is cleared even if the API is temporarily unavailable.
    }
  }

  clearSession()
}

export async function apiRequest(path, options = {}) {
  const { accessToken } = getTokens()
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken || ''}`,
      ...(options.headers || {}),
    },
  })

  return parseResponse(response)
}
