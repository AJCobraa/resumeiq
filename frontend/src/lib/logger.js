/**
 * Logger utility — replaces console.log.
 * Disabled in production per AGENTS.md rules.
 */
const isDev = import.meta.env.DEV

export const logger = {
  log: (...args) => { if (isDev) console.log('[ResumeIQ]', ...args) },
  warn: (...args) => { if (isDev) console.warn('[ResumeIQ]', ...args) },
  error: (...args) => { console.error('[ResumeIQ]', ...args) },
  info: (...args) => { if (isDev) console.info('[ResumeIQ]', ...args) },
}
