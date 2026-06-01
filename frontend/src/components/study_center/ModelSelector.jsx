import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Coins, Sparkles, AlertCircle } from 'lucide-react'

export default function ModelSelector({ selectedModel, onModelChange, onModelsLoaded, disabled = false }) {
  const [models, setModels] = useState({})
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    Promise.all([
      api.getStudyModels(),
      api.getBillingStatus()
    ])
      .then(([modelsData, billingData]) => {
        setModels(modelsData)
        setBalance(billingData.total_coins || 0)
        
        if (onModelsLoaded) {
          onModelsLoaded(modelsData)
        }
        
        if (!selectedModel) {
          const defaultKey = Object.keys(modelsData).find(k => modelsData[k].is_default) || Object.keys(modelsData)[0]
          if (defaultKey) onModelChange(defaultKey)
        }
      })
      .catch(err => console.error("Failed to load models/balance:", err))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="animate-pulse bg-slate-100 h-32 rounded-2xl"></div>
  }

  return (
    <div className="space-y-4">
      <label className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
        <Sparkles className="w-4 h-4 text-indigo-600" />
        Select AI Engine
      </label>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(models).map(([key, model]) => {
          const isSelected = selectedModel === key
          const isAffordable = balance >= model.coin_cost
          const isDisabled = disabled || !isAffordable

          return (
            <button
              key={key}
              type="button"
              disabled={isDisabled}
              onClick={() => onModelChange(key)}
              className={`text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50/50 shadow-[0_8px_30px_rgb(55,48,163,0.12)] transform -translate-y-1'
                  : isDisabled
                  ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                  : 'border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1 bg-white'
              }`}
            >
              {/* Premium Glow effect on hover */}
              {!isDisabled && !isSelected && (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              {isSelected && (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-indigo-500/0 to-transparent" />
              )}

              <div className="relative z-10 flex justify-between items-start mb-3">
                <div>
                  <h4 className={`font-bold text-lg ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                    {model.display_name}
                  </h4>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{model.provider}</span>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ${
                  isSelected ? 'bg-indigo-600 text-white shadow-indigo-600/30' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Coins className="w-3.5 h-3.5" />
                  {model.coin_cost}
                </div>
              </div>
              
              <p className={`relative z-10 text-sm font-medium ${isSelected ? 'text-indigo-800/80' : 'text-slate-600'}`}>
                {model.description}
              </p>

              {!isAffordable && (
                <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-[2px] z-20 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-rose-600 bg-white px-4 py-2 rounded-xl shadow-lg border border-rose-100 font-bold text-sm tracking-wide">
                    <AlertCircle className="w-4 h-4" />
                    Insufficient Coins
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
      
      {balance > 0 && selectedModel && models[selectedModel] && balance < models[selectedModel].coin_cost * 2 && (
        <p className="text-xs text-amber-600 font-semibold flex items-center gap-1.5 mt-2 bg-amber-50 inline-flex px-3 py-1.5 rounded-lg border border-amber-200/50">
          <AlertCircle className="w-3.5 h-3.5" />
          Running low on coins. You have {balance} remaining.
        </p>
      )}
    </div>
  )
}
