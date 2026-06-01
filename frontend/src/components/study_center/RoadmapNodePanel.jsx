import { X, CheckCircle, Circle, PlayCircle, BookOpen, FileText, GraduationCap, ExternalLink } from 'lucide-react'

export default function RoadmapNodePanel({ node, onClose, onStatusChange }) {
  if (!node) return null

  const { title, phase_label, node_type, importance, description, estimated_hours, resources = [], user_status } = node

  const getTypeIcon = (type) => {
    switch (type) {
      case 'VIDEO': return <PlayCircle className="w-4 h-4 text-red-500" />
      case 'DOCUMENTATION': return <FileText className="w-4 h-4 text-blue-500" />
      case 'COURSE': return <GraduationCap className="w-4 h-4 text-purple-500" />
      default: return <BookOpen className="w-4 h-4 text-green-500" />
    }
  }

  const freeResources = resources.filter(r => !r.is_paid)
  const paidResources = resources.filter(r => r.is_paid)

  const isComplete = user_status === 'DONE'

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[400px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="flex justify-between items-start p-6 border-b border-gray-100 bg-gray-50/50">
        <div>
          <div className="flex gap-2 mb-2">
            <span className="text-xs font-bold px-2 py-1 rounded bg-gray-200 text-gray-700 uppercase tracking-wider">{phase_label}</span>
            <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${
              importance === 'REQUIRED' ? 'bg-red-100 text-red-700' :
              importance === 'RECOMMENDED' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {importance}
            </span>
            <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700 uppercase tracking-wider">{node_type}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">{title}</h2>
          {estimated_hours && (
            <p className="text-sm text-gray-500 mt-1 font-medium">~{estimated_hours} hours estimated</p>
          )}
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 bg-white rounded-full border shadow-sm hover:shadow">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">About this topic</h3>
          <p className="text-gray-700 leading-relaxed">{description}</p>
        </div>

        {freeResources.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Free Resources</h3>
            <div className="space-y-2">
              {freeResources.map((res, idx) => (
                <a key={idx} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-300 hover:bg-primary-50 transition-colors group">
                  <div className="mt-0.5">{getTypeIcon(res.type)}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm group-hover:text-primary-700 flex items-center gap-1">
                      {res.title}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h4>
                    <p className="text-xs text-gray-500">{res.platform}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {paidResources.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Premium Resources</h3>
            <div className="space-y-2">
              {paidResources.map((res, idx) => (
                <a key={idx} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-300 hover:bg-primary-50 transition-colors group">
                  <div className="mt-0.5">{getTypeIcon(res.type)}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm group-hover:text-primary-700 flex items-center gap-1">
                      {res.title}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h4>
                    <p className="text-xs text-gray-500">{res.platform}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">Paid</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-100 bg-white">
        <button
          onClick={() => onStatusChange(node.id, isComplete ? 'NOT_STARTED' : 'DONE')}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-colors ${
            isComplete 
              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {isComplete ? (
            <><CheckCircle className="w-5 h-5" /> Marked as Complete</>
          ) : (
            <><Circle className="w-5 h-5" /> Mark Complete</>
          )}
        </button>
      </div>
    </div>
  )
}
