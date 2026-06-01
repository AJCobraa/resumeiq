/**
 * RoadmapNodePanel.jsx
 *
 * Premium node detail panel — slides in from the right when a node is clicked.
 * Reads rich fields from node data: what, why, mastery_check, exercise,
 * difficulty_note, level, estimated_hours, and structured resources.
 *
 * Falls back gracefully to `description` if newer fields aren't present
 * (for backwards compat with old AI-generated roadmaps).
 */

import { useState } from 'react'
import { X, ExternalLink, Clock, CheckCircle2, Hammer, Zap, BookOpen, Play, FileText, GraduationCap, Wrench, AlertTriangle } from 'lucide-react'
import './roadmap-graph.css'

// ── Resource type helpers ─────────────────────────────────

const RESOURCE_META = {
  VIDEO:         { label: 'Video',    cls: 'rg-tag-video',    icon: Play },
  DOCUMENTATION: { label: 'Official', cls: 'rg-tag-official', icon: FileText },
  ARTICLE:       { label: 'Article',  cls: 'rg-tag-article',  icon: BookOpen },
  PRACTICE:      { label: 'Practice', cls: 'rg-tag-practice', icon: Wrench },
  COURSE:        { label: 'Course',   cls: 'rg-tag-course',   icon: GraduationCap },
}

/** Converts the structured resources object { video, official_docs, article, practice, paid_course }
 *  OR the legacy flat array into a normalised list */
function normaliseResources(resources) {
  if (!resources) return []

  // Legacy flat array (old roadmaps)
  if (Array.isArray(resources)) {
    return resources.map(r => ({
      type:     (r.type || 'ARTICLE').toUpperCase(),
      title:    r.title || '',
      url:      r.url || '#',
      platform: r.platform || '',
      is_paid:  r.is_paid || false,
    }))
  }

  // New structured object
  const list = []

  if (resources.video) {
    const url = resources.video.url || (resources.video.search_query ? `https://www.youtube.com/results?search_query=${encodeURIComponent(resources.video.search_query)}` : '#')
    list.push({
      type: 'VIDEO',
      title: resources.video.title,
      url: url,
      platform: resources.video.source || 'YouTube',
      is_paid: false,
    })
  }
  if (resources.official_docs) {
    list.push({
      type: 'DOCUMENTATION',
      title: resources.official_docs.title,
      url: resources.official_docs.url || '#',
      platform: 'Official Docs',
      is_paid: false,
    })
  }
  if (resources.article) {
    const url = resources.article.url || (resources.article.search_query ? `https://www.google.com/search?q=${encodeURIComponent(resources.article.search_query)}` : '#')
    list.push({
      type: 'ARTICLE',
      title: resources.article.title,
      url: url,
      platform: resources.article.source || 'Article',
      is_paid: false,
    })
  }
  if (resources.practice) {
    const url = resources.practice.url || (resources.practice.search_query ? `https://www.google.com/search?q=${encodeURIComponent(resources.practice.search_query)}` : '#')
    list.push({
      type: 'PRACTICE',
      title: resources.practice.title,
      url: url,
      platform: resources.practice.source || 'Practice',
      is_paid: false,
    })
  }
  if (resources.paid_course) {
    const url = resources.paid_course.url || (resources.paid_course.search_query ? `https://www.google.com/search?q=${encodeURIComponent(resources.paid_course.search_query)}` : '#')
    list.push({
      type: 'COURSE',
      title: resources.paid_course.title,
      url: url,
      platform: resources.paid_course.platform || 'Udemy',
      is_paid: true,
    })
  }

  return list
}

// ── Status helpers ────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: '⏳ Not Started', cls: 'rg-status-not-started' },
  { value: 'IN_PROGRESS', label: '🔄 In Progress', cls: 'rg-status-in-progress' },
  { value: 'DONE',        label: '✅ Done',         cls: 'rg-status-done'       },
]

function getStatusCls(status) {
  const opt = STATUS_OPTIONS.find(o => o.value === status)
  return opt ? opt.cls : 'rg-status-not-started'
}

// ── Main component ────────────────────────────────────────

export default function RoadmapNodePanel({ node, onClose, onStatusChange }) {
  const [activeTab, setActiveTab] = useState('resources')

  if (!node) return null

  const {
    title,
    description,
    what,
    why,
    mastery_check,
    exercise,
    difficulty_note,
    estimated_hours,
    resources,
    user_status = 'NOT_STARTED',
    level,
    importance,
    phase_label,
  } = node

  const normalisedResources = normaliseResources(resources)
  const freeResources       = normalisedResources.filter(r => !r.is_paid)
  const paidResources       = normalisedResources.filter(r => r.is_paid)

  const isComplete = user_status === 'DONE'

  // Pick best "what" text — prefer new field, fall back to description
  const whatText         = what || description || ''
  const whyText          = why || ''
  const masteryCheckText = mastery_check || ''
  const exerciseText     = exercise || ''
  const difficultyText   = difficulty_note || ''

  // Level badge colours
  const levelColor = level === 'intermediate' ? '#a855f7'
                   : level === 'advanced'     ? '#1e293b'
                   : '#22c55e'

  return (
    <div className="rg-panel">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="rg-panel-header">
        <div className="rg-panel-header-top">
          <div style={{ flex: 1 }}>
            {/* Level + importance badges */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {level && (
                <span style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 9999,
                  background: levelColor + '20', color: levelColor,
                  border: `1px solid ${levelColor}40`,
                }}>
                  {level}
                </span>
              )}
              {importance && (
                <span style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 9999,
                  background: importance === 'REQUIRED' ? '#fef2f2' : importance === 'RECOMMENDED' ? '#fffbeb' : '#f9fafb',
                  color:      importance === 'REQUIRED' ? '#b91c1c' : importance === 'RECOMMENDED' ? '#92400e' : '#6b7280',
                  border: `1px solid ${importance === 'REQUIRED' ? '#fecaca' : importance === 'RECOMMENDED' ? '#fde68a' : '#e5e7eb'}`,
                }}>
                  {importance}
                </span>
              )}
              {phase_label && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
                  background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ede9fe',
                }}>
                  {phase_label}
                </span>
              )}
            </div>

            <h2 className="rg-panel-title">{title}</h2>
          </div>

          <button className="rg-panel-close" onClick={onClose} aria-label="Close panel">
            <X size={16} />
          </button>
        </div>

        {/* Status selector */}
        <div className="rg-status-select-wrapper" style={{ marginBottom: 12 }}>
          <select
            className={`rg-status-select ${getStatusCls(user_status)}`}
            value={user_status}
            onChange={e => onStatusChange(node.id, e.target.value)}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <span className="rg-status-select-arrow" style={{ fontSize: 10 }}>▾</span>
        </div>

        {/* Estimated time */}
        {estimated_hours && (
          <div style={{ marginBottom: 12 }}>
            <span className="rg-time-pill">
              <Clock size={13} />
              ~{estimated_hours} {estimated_hours === 1 ? 'hour' : 'hours'} estimated
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="rg-tabs">
          {['resources', 'details'].map(tab => (
            <button
              key={tab}
              className={`rg-tab ${activeTab === tab ? 'rg-tab-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'resources' ? '📚 Resources' : '📋 Details'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="rg-panel-body">

        {activeTab === 'details' && (
          <>
            {/* What is it */}
            {whatText && (
              <div className="rg-info-section">
                <div className="rg-info-label">
                  <BookOpen size={12} /> What it is
                </div>
                <p className="rg-info-text">{whatText}</p>
              </div>
            )}

            {/* Why it matters */}
            {whyText && (
              <>
                <div className="rg-divider" />
                <div className="rg-info-section">
                  <div className="rg-info-label">
                    <Zap size={12} /> Why it matters
                  </div>
                  <p className="rg-info-text">{whyText}</p>
                </div>
              </>
            )}

            {/* Difficulty note */}
            {difficultyText && difficultyText !== 'null' && (
              <>
                <div className="rg-divider" />
                <div className="rg-difficulty-card">
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{difficultyText}</span>
                </div>
              </>
            )}

            {/* Exercise */}
            {exerciseText && (
              <>
                <div className="rg-divider" />
                <div className="rg-info-section">
                  <div className="rg-info-label">
                    <Hammer size={12} /> Mini Exercise
                  </div>
                  <div className="rg-exercise-card">{exerciseText}</div>
                </div>
              </>
            )}

            {/* Mastery check */}
            {masteryCheckText && (
              <>
                <div className="rg-divider" />
                <div className="rg-info-section">
                  <div className="rg-info-label">
                    <CheckCircle2 size={12} /> Mastery Check
                  </div>
                  <div className="rg-mastery-card">{masteryCheckText}</div>
                </div>
              </>
            )}

            {/* Fallback: if no detail fields, show description */}
            {!whatText && !whyText && !masteryCheckText && !exerciseText && (
              <p className="rg-info-text" style={{ color: '#9ca3af', fontSize: 13 }}>
                No detailed information available for this topic yet.
              </p>
            )}
          </>
        )}

        {activeTab === 'resources' && (
          <>
            {normalisedResources.length === 0 ? (
              <p className="rg-info-text" style={{ color: '#9ca3af', fontSize: 13 }}>
                No resources available for this topic.
              </p>
            ) : (
              <>
                {/* Free resources */}
                {freeResources.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div className="rg-resource-group-title">
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                      Free Resources
                    </div>
                    {freeResources.map((res, idx) => (
                      <ResourceItem key={idx} resource={res} />
                    ))}
                  </div>
                )}

                {/* Paid resources */}
                {paidResources.length > 0 && (
                  <div>
                    <div className="rg-resource-group-title">
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
                      Premium Resources
                    </div>
                    {paidResources.map((res, idx) => (
                      <ResourceItem key={idx} resource={res} isPaid />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <div className="rg-panel-footer">
        <button
          className={`rg-mark-btn ${isComplete ? 'rg-mark-btn-done' : 'rg-mark-btn-complete'}`}
          onClick={() => onStatusChange(node.id, isComplete ? 'NOT_STARTED' : 'DONE')}
        >
          {isComplete ? (
            <><CheckCircle2 size={16} /> Marked as Complete</>
          ) : (
            <><CheckCircle2 size={16} /> Mark as Complete</>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Resource Item sub-component ──────────────────────────

function ResourceItem({ resource, isPaid }) {
  const meta = RESOURCE_META[resource.type] || RESOURCE_META.ARTICLE
  const Icon = meta.icon

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="rg-resource-item"
    >
      <span className={`rg-resource-tag ${isPaid ? 'rg-tag-paid' : meta.cls}`}>
        {isPaid ? '💰 Paid' : meta.label}
      </span>
      <div className="rg-resource-info">
        <div className="rg-resource-title">{resource.title}</div>
        {resource.platform && (
          <div className="rg-resource-platform">{resource.platform}</div>
        )}
      </div>
      <ExternalLink size={13} className="rg-resource-external" />
    </a>
  )
}
