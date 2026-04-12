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

async function request(path, method = 'GET', body = null) {
  const opts = { method, headers: await getHeaders() }
  if (body) opts.body = JSON.stringify(body)

  logger.log(`${method} ${path}`)

  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.text()
    logger.error(`API Error: ${method} ${path} → ${res.status}`, err)
    throw new Error(err || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  // ── Auth ──────────────────────────────────────────
  getMe: () => request('/api/me'),
  getMyStats: () => request('/api/me/stats'),

  // ── Resumes ───────────────────────────────────────
  getResumes:     ()           => request('/api/resumes'),
  getResume:      (id)         => request(`/api/resumes/${id}`),
  createResume:   (body)       => request('/api/resumes', 'POST', body),
  updateMeta:     (id, body)   => request(`/api/resumes/${id}/meta`, 'PATCH', body),
  updateSections: (id, body)   => request(`/api/resumes/${id}/sections`, 'PATCH', body),
  updateBullet:   (id, body)   => request(`/api/resumes/${id}/bullet`, 'PATCH', body),
  updateTemplate: (id, body)   => request(`/api/resumes/${id}/template`, 'PATCH', body),
  updateResumeTitle:(id, body) => request(`/api/resumes/${id}/title`, 'PATCH', body),
  deleteResume:   (id)         => request(`/api/resumes/${id}`, 'DELETE'),

  importPDF: async (formData) => {
    const res = await fetch(`${BASE}/api/resumes/import-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`,
      },
      body: formData, // multipart — no Content-Type header
    })
    if (!res.ok) throw new Error(await res.text())
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
    if (!res.ok) throw new Error('PDF export failed')
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
}
