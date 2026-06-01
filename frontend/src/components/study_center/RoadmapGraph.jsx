/**
 * RoadmapGraph.jsx — Fixed Version
 *
 * Root cause of blank page:
 *  1. `.rg-canvas-inner` had no explicit dimensions — all children were
 *     position:absolute so it collapsed to 0×0, making the SVG 0×0 invisible.
 *  2. `.rg-canvas-wrapper` used `flex:1` but its parent div had no flex layout.
 *
 * Fixes:
 *  - Compute `canvasW` / `canvasH` from node bounds and pass as explicit
 *    width+height to both `.rg-canvas-inner` and the `<svg>` element.
 *  - Wrapper is changed to `width:100%; height:100%` in CSS; parent div
 *    in RoadmapCanvas.jsx already has `flex:1` on the outer column.
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import './roadmap-graph.css'

// ── Helpers ──────────────────────────────────────────────────

const PADDING = 200   // extra space around the outermost nodes

function smartPath(x1, y1, x2, y2) {
  const cpX = (x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + cpX} ${y1}, ${x2 - cpX} ${y2}, ${x2} ${y2}`;
}

function levelClass(level) {
  if (!level) return 'rg-level-beginner'
  const l = level.toLowerCase()
  if (l === 'intermediate') return 'rg-level-intermediate'
  if (l === 'advanced')     return 'rg-level-advanced'
  return 'rg-level-beginner'
}

function nodeClasses(node, selectedId) {
  const type = (node.node_type || 'TOPIC').toLowerCase()
  const cls = ['rg-node', `rg-node-${type}`]
  if (node.importance === 'OPTIONAL') cls.push('rg-node-optional')
  if (node.user_status === 'DONE')    cls.push('rg-node-done')
  if (node.gap_status === 'missing')  cls.push('rg-node-missing')
  if (node.gap_status === 'partial')  cls.push('rg-node-partial')
  if (node.id === selectedId)         cls.push('rg-node-selected')
  return cls.join(' ')
}

// ── Sub-components ─────────────────────────────────────────

function EdgeLayer({ edges, nodeMap, width, height }) {
  return (
    <svg
      className="rg-svg-layer"
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
    >
      <defs>
        <marker id="arrow-indigo" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#4f46e5" />
        </marker>
        <marker id="arrow-gray" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#cbd5e1" />
        </marker>
      </defs>

      {edges.map(edge => {
        const from = nodeMap[edge.from_node_id]
        const to   = nodeMap[edge.to_node_id]
        if (!from || !to) return null

        const isCompleted = from.user_status === 'DONE' && to.user_status === 'DONE';
        const cls    = isCompleted ? 'rg-edge-completed' : 'rg-edge-future';
        const marker = isCompleted ? 'url(#arrow-indigo)' : 'url(#arrow-gray)';

        return (
          <path
            key={edge.id}
            d={smartPath(from.position_x, from.position_y, to.position_x, to.position_y)}
            className={cls}
            markerEnd={marker}
          />
        )
      })}
    </svg>
  )
}

function RoadmapNode({ node, selectedId, onClick }) {
  const isMilestone = (node.node_type || '').toUpperCase() === 'MILESTONE'

  return (
    <div
      className={nodeClasses(node, selectedId)}
      style={{ left: node.position_x, top: node.position_y }}
      onClick={() => onClick(node)}
    >
      <div className="rg-node-pill">
        {!isMilestone && (
          <span className={`rg-level-badge ${levelClass(node.level)}`} />
        )}
        <span>{node.title}</span>
        {node.estimated_hours && !isMilestone && (
          <span style={{ fontSize: 10, fontWeight: 500, color: '#92400e', opacity: 0.7, marginLeft: 2 }}>
            {node.estimated_hours}h
          </span>
        )}
      </div>
      {node.user_status === 'DONE' && (
        <div className="rg-node-done-badge">✓</div>
      )}
    </div>
  )
}

function Legend({ isGapMode }) {
  return (
    <div className="rg-legend">
      <div className="rg-legend-title">Legend</div>
      <div className="rg-legend-item">
        <span className="rg-level-badge rg-level-beginner" /> Beginner Topics
      </div>
      <div className="rg-legend-item">
        <span className="rg-level-badge rg-level-intermediate" /> Intermediate Topics
      </div>
      <div className="rg-legend-item">
        <span className="rg-level-badge rg-level-advanced" /> Advanced Topics
      </div>
      <div className="rg-legend-item" style={{ marginTop: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block', boxShadow: '0 0 0 2px #bbf7d0' }} />
        Completed Node
      </div>
      <div className="rg-legend-item" style={{ marginTop: 8 }}>
        <svg width="18" height="4" style={{ flexShrink: 0 }}><line x1="0" y1="2" x2="18" y2="2" stroke="#4f46e5" strokeWidth="2.5" /></svg>
        Completed Path
      </div>
      <div className="rg-legend-item">
        <svg width="18" height="4" style={{ flexShrink: 0 }}><line x1="0" y1="2" x2="18" y2="2" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 3" /></svg>
        Future Path
      </div>
      {isGapMode && (
        <>
          <div className="rg-legend-item">
            <span style={{ width: 14, height: 14, borderRadius: 3, border: '2px solid #ef4444', background: '#fef2f2', display: 'inline-block' }} />
            Missing Skill
          </div>
          <div className="rg-legend-item">
            <span style={{ width: 14, height: 14, borderRadius: 3, border: '2px solid #f59e0b', background: '#fffbeb', display: 'inline-block' }} />
            Partial Knowledge
          </div>
        </>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────

const MIN_ZOOM = 0.25
const MAX_ZOOM = 1.8
const ZOOM_STEP = 0.1

export default function RoadmapGraph({ roadmapData, onNodeClick, selectedNodeId }) {
  const wrapperRef = useRef(null)
  const [transform, setTransform] = useState({ x: 40, y: 40, scale: 0.75 })
  const panStart    = useRef(null)
  const isPanning   = useRef(false)
  const didFit      = useRef(false)

  // ── Derived data ─────────────────────────────────────────
  const { nodes, edges, phases, nodeMap, canvasW, canvasH, bounds } = useMemo(() => {
    const raw       = roadmapData || {}
    const nodesObj  = raw.nodes || {}
    const edgesArr  = raw.edges || []
    const phasesArr = raw.phases || []

    let nodeArr = Object.values(nodesObj)

    if (!nodeArr.length) {
      return { nodes: [], edges: edgesArr, phases: phasesArr, nodeMap: {}, canvasW: 800, canvasH: 600, bounds: { minX: 0, minY: 0 } }
    }

    // Auto-layout to prevent overlap
    const sortedNodes = [...nodeArr].sort((a, b) => (Number(a.position_y)||0) - (Number(b.position_y)||0));
    
    const colY = {};
    let topicSideToggle = 1;
    
    nodeArr = sortedNodes.map(n => {
       const rawX = Number(n.position_x) || 0;
       const type = (n.node_type || 'TOPIC').toUpperCase();
       
       let col = Math.round(rawX / 200); 
       if (type === 'MILESTONE') {
           col = 0;
       } else if (col === 0) {
           col = topicSideToggle;
           topicSideToggle = topicSideToggle === 1 ? -1 : 1;
       }
       
       let targetY = Number(n.position_y) || 0;
       
       if (col === 0) {
           const vals = Object.values(colY);
           const maxY = vals.length ? Math.max(...vals) : 0;
           targetY = Math.max(targetY, maxY > 0 ? maxY + 60 : 0);
           for(let c = -3; c <= 3; c++) colY[c] = targetY + 100;
       } else {
           targetY = Math.max(targetY, colY[col] || 0);
           colY[col] = targetY + 80;
       }
       
       return {
           ...n,
           calc_x: col * 280,
           calc_y: targetY
       };
    });

    const nodeMap = {}
    nodeArr.forEach(n => { nodeMap[n.id] = n })

    const xs   = nodeArr.map(n => n.calc_x)
    const ys   = nodeArr.map(n => n.calc_y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)

    const canvasW = (maxX - minX) + PADDING * 2
    const canvasH = (maxY - minY) + PADDING * 2

    return { nodes: nodeArr, edges: edgesArr, phases: phasesArr, nodeMap, canvasW, canvasH, bounds: { minX, minY } }
  }, [roadmapData])

  // ── Fit-view on first load ────────────────────────────────
  useEffect(() => {
    if (didFit.current || !wrapperRef.current || !canvasW || !nodes.length) return
    didFit.current = true

    const el  = wrapperRef.current
    const cw  = el.clientWidth  || 800
    const ch  = el.clientHeight || 600
    const pad = 60

    const scaleX = (cw - pad * 2) / canvasW
    const scaleY = (ch - pad * 2) / canvasH
    const scale  = Math.min(scaleX, scaleY, 1)

    // Centre the canvas inside the viewport
    const x = (cw - canvasW * scale) / 2
    const y = (ch - canvasH * scale) / 2

    setTransform({ x, y, scale })
  }, [canvasW, canvasH, nodes.length])

  // ── Pan ───────────────────────────────────────────────────
  const onMouseDown = useCallback(e => {
    if (e.target.closest('.rg-node') || e.target.closest('.rg-legend') || e.target.closest('.rg-controls')) return
    isPanning.current = true
    panStart.current  = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }, [])

  const onMouseMove = useCallback(e => {
    if (!isPanning.current || !panStart.current) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    panStart.current = { x: e.clientX, y: e.clientY }
    setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }))
  }, [])

  const stopPan = useCallback(() => {
    isPanning.current = false
    panStart.current  = null
  }, [])

  // ── Zoom ──────────────────────────────────────────────────
  const onWheel = useCallback(e => {
    e.preventDefault()
    const rect  = wrapperRef.current.getBoundingClientRect()
    const mx    = e.clientX - rect.left
    const my    = e.clientY - rect.top
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP

    setTransform(t => {
      const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, t.scale + delta))
      const factor   = newScale / t.scale
      return { scale: newScale, x: mx - factor * (mx - t.x), y: my - factor * (my - t.y) }
    })
  }, [])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  const zoomIn  = () => setTransform(t => ({ ...t, scale: Math.min(MAX_ZOOM, t.scale + ZOOM_STEP) }))
  const zoomOut = () => setTransform(t => ({ ...t, scale: Math.max(MIN_ZOOM, t.scale - ZOOM_STEP) }))
  const zoomFit = () => {
    didFit.current = false
    const el  = wrapperRef.current
    if (!el) return
    const cw  = el.clientWidth  || 800
    const ch  = el.clientHeight || 600
    const pad = 60
    const scaleX = (cw - pad * 2) / canvasW
    const scaleY = (ch - pad * 2) / canvasH
    const scale  = Math.min(scaleX, scaleY, 1)
    setTransform({ x: (cw - canvasW * scale) / 2, y: (ch - canvasH * scale) / 2, scale })
  }

  const isGapMode = nodes.some(n => n.gap_status)

  // Phase labels — positioned above the first node in each phase
  const phaseLabels = useMemo(() => {
    return phases.map(phase => {
      const phaseNodes = nodes.filter(n => n.phase_id === phase.id)
      if (!phaseNodes.length) return null
      const minY = Math.min(...phaseNodes.map(n => Number(n.position_y) || 0))
      const avgX = phaseNodes.reduce((s, n) => s + (Number(n.position_x) || 0), 0) / phaseNodes.length
      // Offset into canvas coords (subtract bounds.minX/Y, add PADDING)
      return {
        ...phase,
        cx: avgX - bounds.minX + PADDING,
        cy: minY - bounds.minY + PADDING - 38,
      }
    }).filter(Boolean)
  }, [phases, nodes, bounds])

  const { x, y, scale } = transform

  // Nodes have their positions offset so they sit correctly inside the canvas
  const offsetNode = n => ({
    ...n,
    position_x: n.calc_x - bounds.minX + PADDING,
    position_y: n.calc_y - bounds.minY + PADDING,
  })

  const offsettedNodes   = useMemo(() => nodes.map(offsetNode), [nodes, bounds])

  // Rebuild nodeMap with offset positions for edges
  const offsetNodeMap = useMemo(() => {
    const m = {}
    offsettedNodes.forEach(n => { m[n.id] = n })
    return m
  }, [offsettedNodes])

  // ── Empty state ───────────────────────────────────────────
  if (!nodes.length) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', color: '#9ca3af', fontSize: 15 }}>
        No roadmap nodes found. Try regenerating the roadmap.
      </div>
    )
  }

  return (
    <div
      className="rg-canvas-wrapper"
      ref={wrapperRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopPan}
      onMouseLeave={stopPan}
    >
      {/* ── Transformed canvas ─────────────────────────────── */}
      <div
        className="rg-canvas-inner"
        style={{
          transform:       `translate(${x}px, ${y}px) scale(${scale})`,
          transformOrigin: '0 0',
          width:           canvasW,
          height:          canvasH,
          position:        'absolute',
          top:             0,
          left:            0,
        }}
      >
        {/* SVG edge layer — needs explicit dimensions */}
        <EdgeLayer edges={edges} nodeMap={offsetNodeMap} width={canvasW} height={canvasH} />

        {/* Phase labels */}
        {phaseLabels.map(pl => (
          <div
            key={pl.id}
            className="rg-phase-label"
            style={{ left: pl.cx, top: pl.cy, transform: 'translateX(-50%)' }}
          >
            {pl.label}
          </div>
        ))}

        {/* Nodes */}
        {offsettedNodes.map(node => (
          <RoadmapNode
            key={node.id}
            node={node}
            selectedId={selectedNodeId}
            onClick={onNodeClick}
          />
        ))}
      </div>

      {/* Legend — fixed inside viewport */}
      <Legend isGapMode={isGapMode} />

      {/* Zoom controls */}
      <div className="rg-controls">
        <button className="rg-control-btn" onClick={zoomIn}  title="Zoom in">+</button>
        <button className="rg-control-btn" onClick={zoomOut} title="Zoom out">−</button>
        <button className="rg-control-btn" onClick={zoomFit} title="Fit view" style={{ fontSize: 11, fontWeight: 700 }}>⊡</button>
      </div>
    </div>
  )
}
