import Card from '../components/ui/Card'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { profile } = useAuth()

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-muted">Name</label>
            <p className="text-sm">{profile?.displayName || '—'}</p>
          </div>
          <div>
            <label className="text-xs text-text-muted">Email</label>
            <p className="text-sm">{profile?.email || '—'}</p>
          </div>
          <div>
            <label className="text-xs text-text-muted">Plan</label>
            <p className="text-sm capitalize">{profile?.plan || 'free'}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
