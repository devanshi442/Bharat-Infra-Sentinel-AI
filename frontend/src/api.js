import { addToQueue, getQueue, removeFromQueue } from './offlineQueue'

const BASE = '/api'

async function handle(res) {
  if (res.status === 401) {
    localStorage.removeItem('demo-token')
    window.location.href = '/login'
    return
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

function getHeaders(custom = {}) {
  const token = localStorage.getItem('demo-token')
  return {
    ...custom,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  }
}

export const api = {
  uploadIssue: async ({ file, latitude, longitude, address, reporterNote }) => {
    const form = new FormData()
    form.append('file', file)
    form.append('latitude', latitude)
    form.append('longitude', longitude)
    if (address) form.append('address', address)
    if (reporterNote) form.append('reporter_note', reporterNote)

    if (!navigator.onLine) {
      await addToQueue({ file, latitude, longitude, address, reporterNote, timestamp: Date.now() })
      return { offline: true }
    }

    try {
      const res = await fetch(`${BASE}/issues/upload`, {
        method: 'POST',
        headers: getHeaders(), // Don't set Content-Type for FormData
        body: form,
      })
      return handle(res)
    } catch (err) {
      // If network fails
      await addToQueue({ file, latitude, longitude, address, reporterNote, timestamp: Date.now() })
      return { offline: true }
    }
  },

  listIssues: async (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    const res = await fetch(`${BASE}/issues${qs ? `?${qs}` : ''}`, { headers: getHeaders() })
    return handle(res)
  },

  getIssue: async (id) => {
    const res = await fetch(`${BASE}/issues/${id}`, { headers: getHeaders() })
    return handle(res)
  },

  updateStatus: async (id, status, contractor, afterImageFile) => {
    const form = new FormData()
    form.append('status', status)
    if (contractor) form.append('contractor', contractor)
    if (afterImageFile) form.append('after_image', afterImageFile)

    const res = await fetch(`${BASE}/issues/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(), // Don't set Content-Type, fetch sets it with boundary for FormData
      body: form,
    })
    return handle(res)
  },

  dashboardStats: async () => {
    const res = await fetch(`${BASE}/dashboard/stats`, { headers: getHeaders() })
    return handle(res)
  },

  wardHealth: async () => {
    const res = await fetch(`${BASE}/dashboard/ward-health`, { headers: getHeaders() })
    return handle(res)
  },

  dashboardForecast: async (days = 90, resolveTopN = 10) => {
    const res = await fetch(`${BASE}/dashboard/forecast?days=${days}&resolve_top_n=${resolveTopN}`, { headers: getHeaders() })
    return handle(res)
  },

  downloadCSV: (ward = 'all') => {
    const token = localStorage.getItem('demo-token')
    const url = `${BASE}/dashboard/export/${ward}`
    // Quick hack for downloading without exposing the token in URL or dealing with fetch blobs:
    // We fetch as blob then trigger download
    fetch(url, { headers: getHeaders() })
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `ward_${ward.toLowerCase().replace(/ /g, '_')}_issues.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      })
  },

  seedDemoData: async () => {
    const res = await fetch(`${BASE}/seed-demo-data`, { method: 'POST', headers: getHeaders() })
    return handle(res)
  },

  listContractors: async () => {
    const res = await fetch(`${BASE}/contractors`, { headers: getHeaders() })
    return handle(res)
  },

  login: async (username, password) => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    return handle(res)
  },

  syncOfflineQueue: async () => {
    if (!navigator.onLine) return
    const queue = await getQueue()
    for (const item of queue) {
      try {
        const form = new FormData()
        form.append('file', item.file)
        form.append('latitude', item.latitude)
        form.append('longitude', item.longitude)
        if (item.address) form.append('address', item.address)
        if (item.reporterNote) form.append('reporter_note', item.reporterNote)

        const res = await fetch(`${BASE}/issues/upload`, {
          method: 'POST',
          headers: getHeaders(),
          body: form,
        })
        if (res.ok) {
          await removeFromQueue(item.id)
        }
      } catch (err) {
        console.error('Failed to sync offline item', err)
      }
    }
  }
}
