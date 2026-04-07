/**
 * Utility functions for ResumeIQ.
 */

/**
 * Format a date for display.
 * @param {Date|string|object} date - Date object, ISO string, or Firestore timestamp
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return ''
  // Handle Firestore Timestamp objects
  if (date._seconds) {
    date = new Date(date._seconds * 1000)
  }
  if (typeof date === 'string') {
    date = new Date(date)
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Merge class names, filtering falsy values.
 * @param  {...string} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Debounce a function.
 * @param {Function} fn - Function to debounce
 * @param {number} ms - Delay in milliseconds
 * @returns {Function}
 */
export function debounce(fn, ms) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

/**
 * Get ATS score color based on value.
 * @param {number} score - ATS score 0-100
 * @returns {string} Tailwind color class
 */
export function getScoreColor(score) {
  if (score >= 75) return 'text-green'
  if (score >= 50) return 'text-orange'
  return 'text-red'
}

/**
 * Get ATS score background color.
 * @param {number} score
 * @returns {string}
 */
export function getScoreBgColor(score) {
  if (score >= 75) return 'bg-green-dim'
  if (score >= 50) return 'bg-orange-dim'
  return 'bg-red-dim'
}

/**
 * Get portal display info.
 * @param {string} portal
 * @returns {{ label: string, color: string }}
 */
export function getPortalInfo(portal) {
  const portals = {
    linkedin: { label: 'LinkedIn', color: 'bg-[#0A66C2]/20 text-[#0A66C2]' },
    naukri:   { label: 'Naukri',   color: 'bg-[#4285F4]/20 text-[#4285F4]' },
    indeed:   { label: 'Indeed',   color: 'bg-[#2164f3]/20 text-[#2164f3]' },
    internshala: { label: 'Internshala', color: 'bg-[#00A5EC]/20 text-[#00A5EC]' },
    other:    { label: 'Other',    color: 'bg-border-default text-text-muted' },
  }
  return portals[portal] || portals.other
}

/**
 * Truncate text to a specified length.
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(text, maxLen = 60) {
  if (!text || text.length <= maxLen) return text || ''
  return text.slice(0, maxLen) + '…'
}
