/**
 * Central API client for ResumeIQ.
 * All data operations go through here — frontend NEVER writes to Firestore directly.
 * Every request includes the Firebase ID token in the Authorization header.
 */
import { auth } from './firebase'
import { logger } from './logger'

const BASE = import.meta.env.VITE_BACKEND_URL

async function getHeaders(isMultipart = false) {
  const token = await auth.currentUser?.getIdToken()
  const headers = {
    'Authorization': `Bearer ${token}`,
  }
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}

async function getToken() {
  return auth.currentUser?.getIdToken()
}

async function requestWithToken(token, path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }
  if (body) opts.body = JSON.stringify(body)
  logger.log(`${method} ${path}`)
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const raw = await res.text().catch(() => '')
    let errorData = null
    try {
      errorData = JSON.parse(raw)
    } catch {
      errorData = { message: raw }
    }
    
    logger.error(`API Error: ${method} ${path} → ${res.status}`, errorData)
    
    const error = new Error(errorData.message || errorData.detail || `HTTP ${res.status}`)
    if (errorData.code) error.code = errorData.code
    error.status = res.status
    throw error
  }
  return res.json()
}

async function request(path, method = 'GET', body = null) {
  const opts = { method, headers: await getHeaders() }
  if (body) opts.body = JSON.stringify(body)

  logger.log(`${method} ${path}`)

  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const raw = await res.text().catch(() => '')
    let errorData = null
    try {
      errorData = JSON.parse(raw)
    } catch {
      errorData = { message: raw }
    }
    
    logger.error(`API Error: ${method} ${path} → ${res.status}`, errorData)
    
    const error = new Error(errorData.message || errorData.detail || `HTTP ${res.status}`)
    if (errorData.code) error.code = errorData.code
    error.status = res.status
    throw error
  }
  return res.json()
}

export const api = {
  // ── Auth ──────────────────────────────────────────
  getMe: () => request('/api/me'),
  getMyStats: () => request('/api/me/stats'),
  getTransactions: (limit = 5, offset = 0) => request(`/api/me/transactions?limit=${limit}&offset=${offset}`),

  // ── Resumes ───────────────────────────────────────
  getResumes:     ()           => request('/api/resumes'),
  getResume:      (id)         => request(`/api/resumes/${id}`),
  createResume:   (body)       => request('/api/resumes', 'POST', body),
  updateMeta:     (id, body)   => request(`/api/resumes/${id}/meta`, 'PATCH', body),
  updateSections: (id, body)   => request(`/api/resumes/${id}/sections`, 'PATCH', body),
  updateBullet:   (id, body)   => request(`/api/resumes/${id}/bullet`, 'PATCH', body),
  updateTemplate: (id, body)   => request(`/api/resumes/${id}/template`, 'PATCH', body),
  updateResumeTitle:(id, body) => request(`/api/resumes/${id}/title`, 'PATCH', body),
  toggleBaseStatus: (id, isBase) => request(`/api/resumes/${id}/base`, 'PATCH', { isBase }),
  deleteResume:   (id)         => request(`/api/resumes/${id}`, 'DELETE'),

  // Batch save — fetches ONE token then fires all 3 requests truly in parallel
  saveResume: async (id, { meta, sections, title }) => {
    const token = await getToken()
    return Promise.all([
      requestWithToken(token, `/api/resumes/${id}/meta`, 'PATCH', meta),
      requestWithToken(token, `/api/resumes/${id}/sections`, 'PATCH', { sections }),
      requestWithToken(token, `/api/resumes/${id}/title`, 'PATCH', { title }),
    ])
  },

  importPDF: async (formData) => {
    const res = await fetch(`${BASE}/api/resumes/import-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`,
      },
      body: formData, // multipart — no Content-Type header
    })
    
    if (!res.ok) {
      const raw = await res.text().catch(() => '')
      let errorData = null
      try {
        errorData = JSON.parse(raw)
      } catch {
        errorData = { message: raw }
      }
      
      const error = new Error(errorData.message || errorData.detail || `HTTP ${res.status}`)
      if (errorData.code) error.code = errorData.code
      error.status = res.status
      throw error
    }
    
    return res.json()
  },

  exportPDF: async (id, templateId) => {
    const token = await auth.currentUser?.getIdToken()
    const res = await fetch(`${BASE}/api/resumes/${id}/export-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ templateId }),
    })
    if (!res.ok) {
      const raw = await res.text().catch(() => '')
      let detail = ''
      try {
        const parsed = JSON.parse(raw)
        detail = parsed?.detail || ''
      } catch {
        detail = raw
      }
      logger.error(`API Error: POST /api/resumes/${id}/export-pdf → ${res.status}`, detail)
      const error = new Error(detail || `PDF export failed (HTTP ${res.status})`)
      error.status = res.status
      throw error
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'resume.pdf'
    a.click()
    URL.revokeObjectURL(url)
  },

  // ── Jobs / Analysis ───────────────────────────────
  analyze:              (body) => request('/api/analyze', 'POST', body),
  checkJob:             (url)  => request(`/api/jobs/check?url=${encodeURIComponent(url)}`),
  getJobs:              ()     => request('/api/jobs'),
  getJob:               (id)   => request(`/api/jobs/${id}`),
  updateJobStatus:      (id, body) => request(`/api/jobs/${id}/status`, 'PATCH', body),
  approveRecommendation:(id, body) => request(`/api/jobs/${id}/recommendation`, 'PATCH', body),
  generateInterviewPrep:(id)       => request(`/api/jobs/${id}/interview-prep`, 'POST'),
  deleteJob:            (id)   => request(`/api/jobs/${id}`, 'DELETE'),

  // ── Billing ────────────────────────────────────────
  getBillingStatus:       ()                        => request('/api/billing/status'),
  getBillingCatalog:      ()                        => request('/api/billing/plans/catalog'),
  createSubscriptionOrder:(planId, cycle, currency = 'INR') =>
    request('/api/billing/subscription/order', 'POST', {
      plan_id: planId,
      billing_cycle: cycle,
      currency,
    }),
  createTopUpOrder:       (packId, currency = 'INR') =>
    request('/api/billing/topup/order', 'POST', {
      pack_id: packId,
      currency,
    }),
  verifyPayment:          (body) => request('/api/billing/verify', 'POST', body),
  cancelSubscription:     (reason) =>
    request('/api/billing/subscription/cancel', 'POST', { reason }),
}
