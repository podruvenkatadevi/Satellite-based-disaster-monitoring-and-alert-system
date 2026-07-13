// API client. Talks to the FastAPI backend under /api.
//
// Dev:  VITE_API_URL empty → relative /api/* (Vite proxy → backend :8000)
// Prod: VITE_API_URL empty → same origin (backend serves frontend build)

const RAW = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function url(path) {
  return RAW ? `${RAW}${path}` : path
}

async function j(res) {
  if (!res.ok) {
    let detail = await res.text()
    try {
      const parsed = JSON.parse(detail)
      if (parsed.detail) {
        detail = Array.isArray(parsed.detail)
          ? parsed.detail.map((d) => d.msg || d).join(', ')
          : parsed.detail
      }
    } catch { /* keep raw text */ }
    throw new Error(detail || `API ${res.status}`)
  }
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function request(path, options = {}, timeoutMs = 30000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url(path), { ...options, signal: ctrl.signal })
    return j(res)
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. First AI analysis can take up to 2 minutes — try again.')
    }
    if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
      throw new Error(
        'Cannot reach backend. Start it from the backend/ folder: python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000'
      )
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  base: RAW || (typeof window !== 'undefined' ? `${window.location.origin} (proxied → :8000)` : ''),

  health: () => request('/api/health', {}, 15000),
  stats: () => request('/api/stats'),
  disasters: () => request('/api/disasters'),
  disaster: (id) => request(`/api/disasters/${id}`),
  alerts: () => request('/api/alerts'),
  seed: () => request('/api/seed', { method: 'POST' }),
  clear: () => request('/api/clear', { method: 'POST' }),

  updateDisaster: (id, lifecycle) =>
    request(`/api/disasters/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lifecycle }),
    }),

  deleteDisaster: (id) =>
    request(`/api/disasters/${id}`, { method: 'DELETE' }),

  upload: (file, location) => {
    const form = new FormData()
    form.append('image', file)
    form.append('location', location || 'Unknown')
    return request('/api/upload', { method: 'POST', body: form }, 180000)
  },
}
