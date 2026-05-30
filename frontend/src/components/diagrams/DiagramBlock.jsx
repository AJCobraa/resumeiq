import React from 'react'

export default function DiagramBlock({ component }) {
  // We can eventually lazy-load real ReactFlow diagrams here.
  // For now, this serves as a stylized placeholder.
  
  return (
    <div className="my-10 border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-indigo-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-indigo-900 mb-1">Interactive Diagram</h3>
      <p className="text-sm text-indigo-600/70 font-mono bg-white px-3 py-1 rounded-full border border-indigo-100 shadow-sm mt-2">
        &lt;{component} /&gt;
      </p>
      <p className="text-xs text-text-muted mt-4 max-w-sm">
        This is a placeholder for the interactive ReactFlow diagram. The engineering team will implement the specific node/edge logic for this component.
      </p>
    </div>
  )
}
