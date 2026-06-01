import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, MarkerType } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api } from '../lib/api'
import RoadmapNodePanel from '../components/study_center/RoadmapNodePanel'
import { ChevronLeft, Loader2, Award, AlertCircle } from 'lucide-react'

// Custom Node Component
const CustomNode = ({ data }) => {
  const isComplete = data.user_status === 'DONE'
  const isMissing = data.gap_status === 'missing'
  const isPartial = data.gap_status === 'partial'
  
  const bgClass = data.node_type === 'MILESTONE' ? 'bg-indigo-900 text-white' : 'bg-white text-gray-900'
  const borderClass = isMissing ? 'border-red-500' : isPartial ? 'border-amber-500' : isComplete ? 'border-green-500' : 'border-gray-300'
  const shadowClass = data.node_type === 'MILESTONE' ? 'shadow-lg' : 'shadow-sm'
  const opacityClass = data.importance === 'OPTIONAL' ? 'opacity-80' : 'opacity-100'
  const dashClass = data.importance === 'OPTIONAL' ? 'border-dashed border-2' : data.importance === 'REQUIRED' ? 'border-solid border-2' : 'border-solid border'

  return (
    <div className={`px-4 py-3 rounded-xl min-w-[200px] ${bgClass} ${borderClass} ${shadowClass} ${opacityClass} ${dashClass}`}>
      <div className="flex justify-between items-start mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
          {data.importance}
        </span>
        {isComplete && <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
      </div>
      <div className="font-bold text-sm leading-tight mb-1">{data.title}</div>
      {data.estimated_hours && (
        <div className="text-[10px] opacity-70 font-medium">{data.estimated_hours} hrs</div>
      )}
    </div>
  )
}

const nodeTypes = {
  custom: CustomNode,
}

export default function RoadmapCanvas() {
  const { roadmapId } = useParams()
  const navigate = useNavigate()
  
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedNodeData, setSelectedNodeData] = useState(null)
  
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const loadData = useCallback(async () => {
    try {
      const res = await api.getRoadmap(roadmapId)
      setData(res)
      
      // Transform data into React Flow format
      const rData = res.roadmap_data || {}
      const rawNodes = rData.nodes || {}
      const rawEdges = rData.edges || []
      const phases = rData.phases || []
      
      const flowNodes = Object.values(rawNodes).map(node => {
        const phase = phases.find(p => p.id === node.phase_id)
        return {
          id: node.id,
          type: 'custom',
          position: { x: node.position_x || 0, y: node.position_y || 0 },
          data: { ...node, phase_label: phase ? phase.label : 'Unknown Phase' },
        }
      })
      
      const flowEdges = rawEdges.map(edge => ({
        id: edge.id,
        source: edge.from_node_id,
        target: edge.to_node_id,
        animated: edge.edge_type === 'SUGGESTED_BEFORE',
        style: { 
          strokeWidth: edge.edge_type === 'REQUIRED_BEFORE' ? 2 : 1,
          stroke: edge.edge_type === 'REQUIRED_BEFORE' ? '#4f46e5' : '#9ca3af',
          strokeDasharray: edge.edge_type === 'ALTERNATIVE_TO' ? '5,5' : 'none'
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edge.edge_type === 'REQUIRED_BEFORE' ? '#4f46e5' : '#9ca3af',
        },
      }))
      
      setNodes(flowNodes)
      setEdges(flowEdges)
    } catch (err) {
      console.error(err)
      alert('Failed to load roadmap')
    } finally {
      setLoading(false)
    }
  }, [roadmapId, setNodes, setEdges])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onNodeClick = (event, node) => {
    setSelectedNodeData(node.data)
  }

  const handleStatusChange = async (nodeId, newStatus) => {
    try {
      await api.updateNodeProgress(roadmapId, nodeId, { status: newStatus })
      
      // Update local state
      setNodes(nds => nds.map(n => {
        if (n.id === nodeId) {
          n.data = { ...n.data, user_status: newStatus }
        }
        return n
      }))
      
      if (selectedNodeData && selectedNodeData.id === nodeId) {
        setSelectedNodeData(prev => ({ ...prev, user_status: newStatus }))
      }
    } catch (err) {
      console.error(err)
      alert('Failed to update progress')
    }
  }

  const progressInfo = useMemo(() => {
    if (!nodes.length) return { percent: 0, completed: 0, total: 0 }
    const total = nodes.length
    const completed = nodes.filter(n => n.data.user_status === 'DONE').length
    return { percent: Math.round((completed / total) * 100), completed, total }
  }, [nodes])

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>
  }

  if (!data) return null

  return (
    <div className="h-[calc(100vh-64px)] w-full flex flex-col bg-gray-50 relative overflow-hidden">
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/study-prep-center/roadmaps')}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900">{data.skill_name} Mastery</h1>
            <p className="text-xs text-gray-500 capitalize">{data.roadmap_type.replace('_', ' ')} Roadmap</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Progress</span>
            <div className="flex items-center gap-3">
              <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500 ease-out"
                  style={{ width: `${progressInfo.percent}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-900 w-10 text-right">{progressInfo.percent}%</span>
            </div>
          </div>
          {progressInfo.percent === 100 && (
            <div className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold text-sm">
              <Award className="w-4 h-4" /> Mastery Achieved
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 w-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={1.5}
          attributionPosition="bottom-left"
        >
          <Background color="#e5e7eb" gap={16} />
          <Controls className="bg-white border-gray-200 shadow-sm rounded-lg overflow-hidden" />
        </ReactFlow>

        {/* Legend Overlay */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm border border-gray-200 p-4 rounded-xl shadow-sm z-10 w-64 text-sm pointer-events-none">
          <h4 className="font-bold text-gray-900 mb-3 text-xs uppercase tracking-wider">Legend</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-solid border-gray-400 bg-white" /> Required</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-dashed border-gray-400 bg-white" /> Optional</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border border-gray-400 bg-indigo-900" /> Milestone</div>
            <div className="flex items-center gap-2 mt-4"><div className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" /> Completed</div>
            {data.roadmap_type === 'SKILL_GAP' && (
              <>
                <div className="flex items-center gap-2 mt-4"><div className="w-4 h-4 rounded border border-red-500 bg-white" /> Missing from Resume</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border border-amber-500 bg-white" /> Partial Match</div>
              </>
            )}
          </div>
        </div>

        {/* Side Panel Overlay */}
        {selectedNodeData && (
          <RoadmapNodePanel 
            node={selectedNodeData} 
            onClose={() => setSelectedNodeData(null)} 
            onStatusChange={handleStatusChange}
          />
        )}
      </div>
    </div>
  )
}
