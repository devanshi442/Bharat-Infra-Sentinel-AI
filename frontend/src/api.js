import { addToQueue, getQueue, removeFromQueue } from './offlineQueue'

const BASE = '/api'

async function handle(res) {
  if (res.status === 401) {
    const adminToken = localStorage.getItem('demo-token')
    const citizenToken = localStorage.getItem('citizen-token')
    if (adminToken) {
      localStorage.removeItem('demo-token')
      window.location.href = '/login'
    } else if (citizenToken) {
      localStorage.removeItem('citizen-token')
      localStorage.removeItem('citizen-name')
      localStorage.removeItem('citizen-phone')
      sessionStorage.setItem('citizen_session_expired', 'true')
      window.location.reload()
    } else {
      window.location.href = '/login'
    }
    return
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

function getHeaders(options = {}, custom = {}) {
  // options: { preferCitizen: boolean }
  const citizenToken = localStorage.getItem('citizen-token')
  const adminToken = localStorage.getItem('demo-token')
  let authToken = null
  if (options.preferCitizen && citizenToken) authToken = citizenToken
  else if (adminToken) authToken = adminToken
  else if (citizenToken) authToken = citizenToken

  return {
    ...custom,
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
  }
}

export const api = {
  uploadIssue: async ({ file, latitude, longitude, address, reporterNote, originalLanguage, reporterPhone }) => {
    const form = new FormData()
    form.append('file', file)
    form.append('latitude', latitude)
    form.append('longitude', longitude)
    if (address) form.append('address', address)
    if (reporterNote) form.append('reporter_note', reporterNote)
    if (originalLanguage) form.append('original_language', originalLanguage)
    if (reporterPhone) form.append('reporter_phone', reporterPhone)

    if (!navigator.onLine) {
      await addToQueue({ file, latitude, longitude, address, reporterNote, originalLanguage, timestamp: Date.now() })
      return { offline: true }
    }

    try {
      const res = await fetch(`${BASE}/issues/upload`, {
        method: 'POST',
        headers: getHeaders({ preferCitizen: true }),
        body: form,
      })
      return handle(res)
    } catch (err) {
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

  /**
   * Update an issue's status.
   * @param {number}  id
   * @param {string}  status       - 'reported' | 'in_progress' | 'resolved'
   * @param {string}  [contractor] - contractor name
   * @param {File}    [afterImageFile] - optional after-photo to attach
   */
  updateStatus: async (id, status, contractor, afterImageFile) => {
    const form = new FormData()
    form.append('status', status)
    if (contractor) form.append('contractor', contractor)
    if (afterImageFile instanceof File) form.append('after_image', afterImageFile)

    const res = await fetch(`${BASE}/issues/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(), // let browser set Content-Type with boundary for FormData
      body: form,
    })
    return handle(res)
  },

  dashboardStats: async () => {
    const url = new URL(`${BASE}/dashboard/stats`, window.location.origin).href;
    console.log('Resolved API URL:', url);
    const res = await fetch(url, { headers: getHeaders() })
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
    fetch(`${BASE}/dashboard/export/${ward}`, { headers: getHeaders() })
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

  translate: async (text, targetLang) => {
    if (!text) return { translatedText: '' }
    const res = await fetch(`${BASE}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify({ text, target_lang: targetLang })
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
        if (item.reporterPhone) form.append('reporter_phone', item.reporterPhone)

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
  },
  
  // Citizen auth (demo OTP)
  requestOtp: async (name, phone) => {
    const res = await fetch(`${BASE}/auth/citizen/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone })
    })
    return handle(res)
  },

  verifyOtp: async (phone, otp) => {
    const res = await fetch(`${BASE}/auth/citizen/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    })
    const data = await handle(res)
    if (data && data.token) {
      localStorage.setItem('citizen-token', data.token)
      localStorage.setItem('citizen-name', data.name || '')
      localStorage.setItem('citizen-phone', data.phone || '')
    }
    return data
  },

  logoutCitizen: () => {
    localStorage.removeItem('citizen-token')
    localStorage.removeItem('citizen-name')
    localStorage.removeItem('citizen-phone')
  },

  getMyReports: async () => {
    const res = await fetch(`${BASE}/issues/mine`, { headers: getHeaders({ preferCitizen: true }) })
    return handle(res)
  },

  getDepartmentStats: async () => {
    const res = await fetch(`${BASE}/dashboard/departments`, { headers: getHeaders() })
    return handle(res)
  },

  getActivityLog: async () => {
    const res = await fetch(`${BASE}/dashboard/activity`, { headers: getHeaders() })
    return handle(res)
  },
}