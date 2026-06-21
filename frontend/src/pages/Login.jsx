import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Loader2, AlertTriangle } from 'lucide-react'
import { api } from '../api'
import { useTranslation } from 'react-i18next'
import DarkModeToggle from '../components/DarkModeToggle'

export default function Login() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('demo')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()
  const { t } = useTranslation()

  async function handleLogin(e) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await api.login(username, password)
      if (res.token) {
        localStorage.setItem('demo-token', res.token)
        navigate('/dashboard')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid credentials')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-paper flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300">
      {/* Dark mode toggle — top right */}
      <div className="absolute top-4 right-4 z-20">
        <DarkModeToggle variant="dark" />
      </div>

      {/* Decorative Background — purple/pink blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle at center, #5b21b6 0%, transparent 70%)', filter: 'blur(100px)', opacity: 0.12 }} />
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle at center, #ec4899 0%, transparent 70%)', filter: 'blur(90px)', opacity: 0.10 }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(168,85,247,0.06) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="p-3 bg-surface dark:bg-surface border border-border-muted rounded-2xl shadow-xl shadow-brand-primary/10 mb-2">
            <ShieldCheck className="w-10 h-10 text-brand-accent" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-display font-bold text-brand-deep dark:text-purple-100 tracking-tight">
          {t('govt_command_centre', 'Govt Command Centre')}
        </h2>
        <p className="mt-2 text-center text-sm text-brand-primary dark:text-brand-medium font-medium tracking-wide uppercase">
          {t('municipal_infra_monitor', 'Municipal Infrastructure Monitor')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[420px] relative z-10">
        <div className="bg-surface/80 dark:bg-surface/80 backdrop-blur-xl border border-border-muted py-8 px-4 shadow-2xl shadow-brand-primary/10 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                {t('official_id', 'Official ID')}
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-surface-2 dark:bg-surface-2 border border-border-muted rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-purple-650 focus:border-brand-medium focus:ring-1 focus:ring-brand-medium transition-all outline-none"
                  placeholder={t('enter_assigned_id', 'Enter your assigned ID')}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                {t('security_key', 'Security Key')}
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-surface-2 dark:bg-surface-2 border border-border-muted rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-purple-650 focus:border-brand-medium focus:ring-1 focus:ring-brand-medium transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {status === 'error' && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <p className="font-medium">{errorMsg}</p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-brand-primary/20 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : t('access_dashboard', 'Access Dashboard')}
              </button>
            </div>
          </form>
          <div className="mt-8 pt-6 border-t border-border-muted">
            <div className="bg-brand-light dark:bg-brand-light/20 rounded-lg p-3 border border-border-muted text-center">
              <p className="text-xs text-brand-primary dark:text-brand-medium">
                {t('demo_access', 'Demo access:')} <span className="text-brand-deep dark:text-purple-200 font-mono bg-surface dark:bg-surface border border-border-muted px-1.5 py-0.5 rounded">admin</span> / <span className="text-brand-deep dark:text-purple-200 font-mono bg-surface dark:bg-surface border border-border-muted px-1.5 py-0.5 rounded">demo</span>
              </p>
            </div>
          </div>
        </div>
        
        <p className="text-center text-[10px] text-slate-400 dark:text-purple-600 mt-8 font-medium tracking-widest uppercase">
          {t('secured_by_app', 'Secured by Bharat Infra Sentinel AI')}
        </p>
      </div>
    </div>
  )
}
