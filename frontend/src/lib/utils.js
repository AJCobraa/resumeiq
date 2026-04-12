/* src/lib/utils.js - Premium helper version */

export function formatDate(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

export function getScoreColor(score) {
  if (score >= 80) return 'text-emerald-500'
  if (score >= 60) return 'text-amber-500'
  return 'text-rose-500'
}

export function getPortalInfo(portal) {
  const portals = {
    linkedin: { label: 'LinkedIn', color: 'bg-blue-500/10 text-blue-500' },
    naukri: { label: 'Naukri', color: 'bg-sky-500/10 text-sky-500' },
    indeed: { label: 'Indeed', color: 'bg-indigo-500/10 text-indigo-500' },
    internshala: { label: 'Internshala', color: 'bg-cyan-500/10 text-cyan-500' },
    other: { label: 'Other', color: 'bg-slate-500/10 text-slate-500' }
  }
  return portals[portal] || portals.other
}

export function truncate(text, length = 60) {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

/**
 * Merge class names, filtering falsy values.
 * @param  {...string} classes
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Debounce a function.
 * @param {Function} fn - Function to debounce
 * @param {number} ms - Delay in milliseconds
 */
export function debounce(fn, ms) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}
