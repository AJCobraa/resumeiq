/**
 * RoadmapCanvas.jsx
 *
 * Top-level page for viewing an individual roadmap.
 * Uses the custom RoadmapGraph SVG renderer (no ReactFlow dependency).
 * Manages: data loading, progress state, node selection, and header UI.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import RoadmapGraph from '../components/study_center/RoadmapGraph'
import RoadmapNodePanel from '../components/study_center/RoadmapNodePanel'
import { ChevronLeft, Loader2, Award, AlertCircle } from 'lucide-react'

export default function RoadmapCanvas() {
  const { roadmapId } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)

  // ── Load roadmap data ─────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.getRoadmap(roadmapId)
      setData(res)
    } catch (err) {
      setError(err.message || 'Failed to load roadmap')
    } finally {
      setLoading(false)
    }
  }, [roadmapId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Handle node status change ─────────────────────────────
  const handleStatusChange = useCallback(async (nodeId, newStatus) => {
    try {
      await api.updateNodeProgress(roadmapId, nodeId, { status: newStatus })

      // Optimistically update local state
      setData(prev => {
        if (!prev?.roadmap_data?.nodes) return prev
        const updated = { ...prev }
        updated.roadmap_data = {
          ...prev.roadmap_data,
          nodes: {
            ...prev.roadmap_data.nodes,
            [nodeId]: {
              ...prev.roadmap_data.nodes[nodeId],
              user_status: newStatus,
            },
          },
        }
        return updated
      })

      // Update selected node if it's the one being changed
      setSelectedNode(prev =>
        prev?.id === nodeId ? { ...prev, user_status: newStatus } : prev
      )
    } catch (err) {
      console.error('Failed to update progress:', err)
    }
  }, [roadmapId])

  // ── Node click ────────────────────────────────────────────
  const handleNodeClick = useCallback(nodeData => {
    setSelectedNode(nodeData)
  }, [])

  // ── Progress computation ──────────────────────────────────
  const progress = useMemo(() => {
    const nodes = Object.values(data?.roadmap_data?.nodes || {})
    if (!nodes.length) return { percent: 0, done: 0, total: 0 }
    const done = nodes.filter(n => n.user_status === 'DONE').length
    return { percent: Math.round((done / nodes.length) * 100), done, total: nodes.length }
  }, [data])

  // ── Enrich selectedNode with phase_label ──────────────────
  const enrichedSelectedNode = useMemo(() => {
    if (!selectedNode || !data?.roadmap_data) return null
    const phases = data.roadmap_data.phases || []
    const phase = phases.find(p => p.id === selectedNode.phase_id)
    return { ...selectedNode, phase_label: phase?.label }
  }, [selectedNode, data])

  // ── Loading / error states ────────────────────────────────
  if (loading) {
    return (
      <div style={{
        height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#f9fafb',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 style={{ width: 36, height: 36, color: '#4f46e5', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280', fontSize: 14, fontWeight: 500 }}>Loading your roadmap…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#f9fafb',
      }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <AlertCircle style={{ width: 40, height: 40, color: '#ef4444', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            Failed to load roadmap
          </h3>
          <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>{error}</p>
          <button
            onClick={loadData}
            style={{
              background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10,
              padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const roadmapTitle = data.skill_name
    ? `${data.skill_name} Mastery`
    : data.roadmap_data?.title || 'Learning Roadmap'

  const isGapRoadmap = data.roadmap_type === 'SKILL_GAP'

  return (
    <div style={{
      height: 'calc(100vh - 64px)',
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
      overflow: 'hidden',
    }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <header style={{
        height: 64,
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {/* Left: back + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/study-prep-center/roadmaps')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 10, border: '1px solid #e5e7eb',
              background: 'white', cursor: 'pointer', color: '#6b7280',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.target.style.background = '#f9fafb'; e.target.style.color = '#111827' }}
            onMouseLeave={e => { e.target.style.background = 'white'; e.target.style.color = '#6b7280' }}
          >
            <ChevronLeft size={18} />
          </button>

          <div>
            <h1 style={{
              fontSize: 16, fontWeight: 800, color: '#0f172a',
              letterSpacing: '-0.02em', lineHeight: 1, margin: 0,
            }}>
              {roadmapTitle}
            </h1>
            <p style={{
              fontSize: 11, color: '#9ca3af', margin: 0, marginTop: 2,
              fontWeight: 600, textTransform: 'capitalize',
            }}>
              {isGapRoadmap ? 'Skill Gap Roadmap' : 'Custom Roadmap'}
              {' · '}
              {data.experience_level} level
            </p>
          </div>
        </div>

        {/* Right: progress + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Progress */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Track */}
              <div style={{
                width: 140, height: 6, background: '#f3f4f6', borderRadius: 9999, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress.percent}%`,
                  background: progress.percent === 100
                    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                    : 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                  borderRadius: 9999,
                  transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', minWidth: 36 }}>
                {progress.percent}%
              </span>
            </div>
            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginTop: 2 }}>
              {progress.done}/{progress.total} nodes complete
            </span>
          </div>

          {/* Mastery badge */}
          {progress.percent === 100 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fef9c3', border: '1px solid #fde047',
              color: '#713f12', borderRadius: 9999, padding: '6px 14px',
              fontSize: 13, fontWeight: 700,
              animation: 'rg-pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
              <Award size={15} /> Mastery Achieved!
            </div>
          )}
        </div>
      </header>

      {/* ── Canvas area ────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <RoadmapGraph
          roadmapData={data.roadmap_data}
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNode?.id}
        />

        {/* Node Detail Panel */}
        {enrichedSelectedNode && (
          <RoadmapNodePanel
            node={enrichedSelectedNode}
            onClose={() => setSelectedNode(null)}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>
    </div>
  )
}
