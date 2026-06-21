import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Loader2, AlertTriangle } from 'lucide-react'
import { api } from '../api'

export default function Login() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('demo')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-signal-500/10 rounded-full blur-3xl opacity-50 mix-blend-screen" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[800px] h-[800px] bg-sentinel-500/10 rounded-full blur-3xl opacity-50 mix-blend-screen" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-signal-500/5 mb-2">
            <ShieldCheck className="w-10 h-10 text-signal-400" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-display font-bold text-slate-900 tracking-tight">
          Govt Command Centre
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 font-medium tracking-wide uppercase">
          Municipal Infrastructure Monitor
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[420px] relative z-10">
        <div className="bg-white/60 backdrop-blur-xl border border-slate-100/80 py-8 px-4 shadow-2xl shadow-black/50 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Official ID
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-signal-400 focus:ring-1 focus:ring-signal-400 transition-all outline-none"
                  placeholder="Enter your assigned ID"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Security Key
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-signal-400 focus:ring-1 focus:ring-signal-400 transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {status === 'error' && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <p className="font-medium">{errorMsg}</p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-signal-500/20 text-sm font-semibold text-white bg-gradient-to-b from-signal-400 to-signal-500 hover:from-signal-500 hover:to-signal-600 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Access Dashboard'}
              </button>
            </div>
          </form>
          <div className="mt-8 pt-6 border-t border-slate-100/80">
            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 text-center">
              <p className="text-xs text-slate-600">
                Demo access: <span className="text-slate-900 font-mono bg-slate-100 px-1.5 py-0.5 rounded">admin</span> / <span className="text-slate-900 font-mono bg-slate-100 px-1.5 py-0.5 rounded">demo</span>
              </p>
            </div>
          </div>
        </div>
        
        <p className="text-center text-[10px] text-slate-500 mt-8 font-medium tracking-widest uppercase">
          Secured by Bharat Infra Sentinel AI
        </p>
      </div>
    </div>
  )
}
