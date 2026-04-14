/**
 * sectionUtils.js — Shared helpers for resume section manipulation.
 * Used by all accordion components in ResumeEditor.
 */

/**
 * Move a section up or down within its type-group.
 * Swaps `order` values between the target section and its neighbor,
 * then returns the array re-sorted by order.
 *
 * @param {Array} allSections - Full resume.sections array
 * @param {string} sectionId  - The sectionId to move
 * @param {'up'|'down'} direction
 * @returns {Array} New sorted sections array
 */
export function moveSection(allSections, sectionId, direction) {
  const idx = allSections.findIndex(s => s.sectionId === sectionId)
  if (idx === -1) return allSections

  const type = allSections[idx].type
  const sameType = allSections.filter(s => s.type === type)
  const sameIdx = sameType.findIndex(s => s.sectionId === sectionId)

  if (direction === 'up' && sameIdx === 0) return allSections
  if (direction === 'down' && sameIdx === sameType.length - 1) return allSections

  const newSections = allSections.map(s => ({ ...s }))
  const targetType = direction === 'up' ? sameType[sameIdx - 1] : sameType[sameIdx + 1]
  const targetIdx = newSections.findIndex(s => s.sectionId === targetType.sectionId)

  const tmpOrder = newSections[idx].order
  newSections[idx].order = newSections[targetIdx].order
  newSections[targetIdx].order = tmpOrder

  return newSections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/** Generate a unique ID (UUID v4 if available, else timestamp-based fallback). */
export function genId() {
  try { return crypto.randomUUID() } catch { return Date.now().toString(36) + Math.random().toString(36).slice(2) }
}
