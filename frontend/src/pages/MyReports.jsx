import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { ISSUE_TYPE_META, SEVERITY_META, STATUS_META, timeAgo } from '../constants'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Clock, X, Loader2, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react'
import DarkModeToggle from '../components/DarkModeToggle'

// Initials helper
function getInitials(name) {
  if (!name) return 'C'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// Mask phone number
function maskPhone(phone) {
  if (!phone) return ''
  const str = phone.trim()
  if (str.length >= 10) {
    return str.slice(0, 5) + '*****' + str.slice(-2)
  }
  return str.slice(0, Math.max(1, Math.floor(str.length / 2))) + '***' + str.slice(-1)
}

export default function MyReports() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  // Citizen auth states
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('citizen-token'))
  const [citizenName, setCitizenName] = useState(localStorage.getItem('citizen-name') || '')
  const [citizenPhone, setCitizenPhone] = useState(localStorage.getItem('citizen-phone') || '')
  
  // Login flow states
  const [loginStep, setLoginStep] = useState(1) // 1 = Request, 2 = Verify
  const [otpValue, setOtpValue] = useState('')
  const [demoOtp, setDemoOtp] = useState(null)
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  // Filtering state
  const [filterStatus, setFilterStatus] = useState('all')

  // Selected issue for detail view modal
  const [selectedIssue, setSelectedIssue] = useState(null)

  // Session expired notification
  const [sessionExpired, setSessionExpired] = useState(false)
  useEffect(() => {
    if (sessionStorage.getItem('citizen_session_expired') === 'true') {
      setSessionExpired(true)
      sessionStorage.removeItem('citizen_session_expired')
    }
  }, [])

  // Load issues when logged in
  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false)
      return
    }

    let mounted = true
    setLoading(true)
    async function load() {
      try {
        const res = await api.getMyReports()
        if (mounted) setIssues(res || [])
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [isLoggedIn])

  // Login methods
  async function handleRequestOtp() {
    if (!citizenName.trim() || !citizenPhone.trim()) return
    setLoggingIn(true)
    setLoginError('')
    try {
      const res = await api.requestOtp(citizenName, citizenPhone)
      setDemoOtp(res?.otp)
      setLoginStep(2)
    } catch (e) {
      console.error(e)
      setLoginError('Failed to request OTP. Please try again.')
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleVerifyOtp() {
    if (!otpValue.trim()) return
    setLoggingIn(true)
    setLoginError('')
    try {
      const res = await api.verifyOtp(citizenPhone, otpValue)
      if (res && res.token) {
        setIsLoggedIn(true)
        setLoginStep(1)
        setOtpValue('')
        setDemoOtp(null)
      } else {
        setLoginError('Invalid verification code.')
      }
    } catch (e) {
      console.error(e)
      setLoginError('Verification failed. Check the OTP and try again.')
    } finally {
      setLoggingIn(false)
    }
  }

  function handleLogout() {
    api.logoutCitizen()
    setIsLoggedIn(false)
    setIssues([])
    setCitizenName('')
    setCitizenPhone('')
  }

  // Filter issues
  const filteredIssues = filterStatus === 'all'
    ? issues
    : issues.filter(i => i.status === filterStatus)

  return (
    <div className="min-h-screen bg-paper text-slate-800 dark:text-purple-100 transition-colors duration-300">
      <header className="border-b border-border-muted bg-surface sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/report" className="text-brand-primary/55 dark:text-brand-medium/70 hover:text-brand-deep dark:hover:text-purple-200 flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t('back', 'Back')}
          </Link>
          <h1 className="font-display font-semibold text-lg text-brand-deep dark:text-purple-100">{t('my_reports', 'My Reports')}</h1>
          <div className="flex items-center gap-3">
            <DarkModeToggle variant="dark" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-3" />
            <div className="text-sm text-slate-500 dark:text-purple-400">{t('loading', 'Loading…')}</div>
          </div>
        ) : !isLoggedIn ? (
          /* OTP Login Card when logged out */
          <div className="bg-surface border border-border-muted rounded-2xl p-6 shadow-sm max-w-md mx-auto transition-colors duration-300">
            {sessionExpired && (
              <div className="bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs rounded-xl p-3 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Your session has expired. Please log in again.</span>
              </div>
            )}
            <h2 className="text-xl font-display font-semibold text-brand-deep dark:text-purple-100 mb-2">Track Your Reports</h2>
            <p className="text-sm text-slate-500 dark:text-purple-400 mb-6">Login with your name and phone number to see the status of issues you have reported.</p>
            
            {loginStep === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-purple-400 uppercase tracking-wider mb-2">Your Name</label>
                  <input
                    value={citizenName}
                    onChange={e => setCitizenName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full text-sm border border-border-muted rounded-xl px-4 py-3 outline-none focus:border-brand-accent bg-surface dark:bg-surface text-brand-deep dark:text-purple-100 placeholder-slate-400 dark:placeholder-purple-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-purple-400 uppercase tracking-wider mb-2">Phone Number</label>
                  <input
                    value={citizenPhone}
                    onChange={e => setCitizenPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full text-sm border border-border-muted rounded-xl px-4 py-3 outline-none focus:border-brand-accent bg-surface dark:bg-surface text-brand-deep dark:text-purple-100 placeholder-slate-400 dark:placeholder-purple-500 transition-colors"
                  />
                </div>
                {loginError && (
                  <div className="text-xs text-red-500 dark:text-red-400">{loginError}</div>
                )}
                <button
                  onClick={handleRequestOtp}
                  disabled={!citizenName.trim() || !citizenPhone.trim() || loggingIn}
                  className="w-full bg-brand-accent hover:bg-brand-accent/90 disabled:bg-surface-2 dark:disabled:bg-surface-2 disabled:text-slate-400 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {loggingIn && <Loader2 className="w-4 h-4 animate-spin" />}
                  Request OTP
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-purple-400 uppercase tracking-wider mb-2">Enter Verification Code</label>
                  <input
                    value={otpValue}
                    onChange={e => setOtpValue(e.target.value)}
                    placeholder="Enter OTP"
                    className="w-full text-sm border border-border-muted rounded-xl px-4 py-3 outline-none focus:border-brand-accent bg-surface dark:bg-surface text-brand-deep dark:text-purple-100 placeholder-slate-400 dark:placeholder-purple-500 transition-colors"
                  />
                </div>
                {demoOtp && (
                  <div className="bg-surface-2 border border-border-muted rounded-lg p-3 text-center transition-colors">
                    <p className="text-xs text-slate-500 dark:text-purple-300">
                      Demo OTP: <span className="font-mono font-bold text-slate-800 dark:text-purple-100 ml-1">{demoOtp}</span>
                    </p>
                  </div>
                )}
                {loginError && (
                  <div className="text-xs text-red-500 dark:text-red-400">{loginError}</div>
                )}
                <button
                  onClick={handleVerifyOtp}
                  disabled={!otpValue.trim() || loggingIn}
                  className="w-full bg-brand-accent hover:bg-brand-accent/90 disabled:bg-surface-2 dark:disabled:bg-surface-2 disabled:text-slate-400 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {loggingIn && <Loader2 className="w-4 h-4 animate-spin" />}
                  Verify & Log In
                </button>
                <button
                  onClick={() => { setLoginStep(1); setLoginError(''); setOtpValue('') }}
                  className="w-full text-xs text-slate-500 dark:text-purple-400 hover:text-slate-700 dark:hover:text-purple-200 underline text-center"
                >
                  Change Name/Phone
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Logged In View */
          <div className="space-y-6">
            {/* Richer Profile */}
            <div className="bg-surface border border-border-muted rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 transition-colors duration-300">
              <div className="flex items-center gap-4 self-start md:self-center">
                <div className="w-14 h-14 rounded-full bg-brand-primary text-white flex items-center justify-center font-display font-bold text-lg shadow-inner shrink-0">
                  {getInitials(citizenName)}
                </div>
                <div>
                  <div className="text-base font-semibold text-brand-deep dark:text-purple-100">{citizenName}</div>
                  <div className="text-xs text-slate-500 dark:text-purple-400">{maskPhone(citizenPhone)}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-6 w-full md:w-auto text-center border-y border-border-muted md:border-y-0 py-4 md:py-0">
                <div>
                  <div className="text-xl font-semibold text-brand-deep dark:text-purple-100">{issues.length}</div>
                  <div className="text-[10px] text-slate-500 dark:text-purple-400 uppercase font-medium">Total</div>
                </div>
                <div className="border-x border-border-muted px-2">
                  <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                    {issues.filter(i => i.status === 'resolved').length}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-purple-400 uppercase font-medium">Resolved</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                    {issues.filter(i => i.status === 'reported' || i.status === 'in_progress').length}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-purple-400 uppercase font-medium">Open</div>
                </div>
              </div>
              
              <button 
                onClick={handleLogout}
                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-semibold border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg px-3 py-2 transition-colors self-end md:self-center"
              >
                {t('logout', 'Logout')}
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-border-muted pb-4">
              {['all', 'reported', 'in_progress', 'resolved'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`text-xs px-3.5 py-1.5 rounded-full transition-colors border ${
                    filterStatus === s
                      ? 'bg-brand-primary text-white border-brand-primary font-medium shadow-sm'
                      : 'bg-surface border-border-muted text-slate-500 dark:text-purple-400 hover:text-brand-primary dark:hover:text-brand-medium'
                  }`}
                >
                  {s === 'all' ? t('all', 'All') : t('status_' + s, STATUS_META[s]?.label || s)}
                </button>
              ))}
            </div>

            {/* Issues List */}
            {filteredIssues.length === 0 ? (
              /* Empty State */
              <div className="bg-surface border border-border-muted rounded-2xl p-12 text-center shadow-sm transition-colors duration-300">
                <MapPin className="w-10 h-10 text-slate-300 dark:text-purple-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700 dark:text-purple-200 mb-1">
                  {filterStatus === 'all' ? 'No reports found' : `No reports marked as "${STATUS_META[filterStatus]?.label || filterStatus}"`}
                </p>
                <p className="text-xs text-slate-400 dark:text-purple-400 mb-6">
                  {filterStatus === 'all' 
                    ? 'You have not submitted any civic infrastructure reports yet.' 
                    : `You don't have any reported issues currently in this status.`}
                </p>
                {filterStatus === 'all' && (
                  <Link to="/report" className="bg-brand-accent hover:bg-brand-accent/90 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors inline-block">
                    Report an Issue
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredIssues.map(issue => {
                  const type = ISSUE_TYPE_META[issue.issue_type] || ISSUE_TYPE_META.other
                  const sev = SEVERITY_META[issue.severity_label] || SEVERITY_META.Low
                  const status = STATUS_META[issue.status] || STATUS_META.reported
                  return (
                    <div 
                      key={issue.id} 
                      onClick={() => setSelectedIssue(issue)}
                      className="bg-surface border border-border-muted rounded-xl p-4 flex gap-4 cursor-pointer hover:border-brand-primary/50 dark:hover:border-brand-medium/50 hover:shadow-sm transition-all duration-200"
                    >
                      <img src={issue.image_path} alt="thumb" className="w-24 h-20 object-cover rounded-md border border-border-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-slate-800 dark:text-purple-100 truncate">{t('issue_type_' + issue.issue_type, type.label)}</div>
                          <div className="text-xs font-semibold px-2 py-0.5 rounded shrink-0" style={{ color: status.color, background: `${status.color}10` }}>
                            {t('status_' + issue.status, status.label)}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-purple-400 mt-1 truncate">
                          {issue.address || issue.city || ''} • {timeAgo(issue.created_at, t)}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: sev.color, background: `${sev.color}10` }}>
                            {t('severity_' + issue.severity_label.toLowerCase(), issue.severity_label)}
                          </span>
                          {issue.status !== 'resolved' && issue.days_until_sla !== null && (
                            <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${
                              issue.sla_breach 
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' 
                                : 'bg-surface-2 dark:bg-surface-2/20 text-slate-650 dark:text-purple-300 border-border-muted'
                            }`}>
                              {issue.sla_breach 
                                ? t('days_overdue_tag', '⚠ {days}d overdue').replace('{days}', Math.abs(issue.days_until_sla))
                                : t('days_left_tag', '{days}d left').replace('{days}', issue.days_until_sla)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Citizen Detailed Report Modal */}
      {selectedIssue && (
        <CitizenIssueDetailModal 
          issue={selectedIssue} 
          onClose={() => setSelectedIssue(null)} 
        />
      )}
    </div>
  )
}

/* Detailed modal component inside the same file for clean structure */
function CitizenIssueDetailModal({ issue, onClose }) {
  const { t } = useTranslation()
  const typeMeta = ISSUE_TYPE_META[issue.issue_type] || ISSUE_TYPE_META.other
  const sevMeta = SEVERITY_META[issue.severity_label] || SEVERITY_META.Low
  const statusMeta = STATUS_META[issue.status] || STATUS_META.reported

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border-muted rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scroll-thin shadow-2xl transition-colors duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{typeMeta.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold text-lg text-brand-deep dark:text-purple-100">
                    {t('issue_type_' + issue.issue_type, typeMeta.label)}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ color: statusMeta.color, background: `${statusMeta.color}15` }}>
                    {t('status_' + issue.status, statusMeta.label)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-purple-400">#{issue.id} · {issue.ward || issue.city || ''}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-brand-primary dark:text-purple-400 dark:hover:text-brand-medium p-1.5 rounded-lg hover:bg-surface-2 dark:hover:bg-surface-2 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Images */}
          <div className={`grid gap-4 ${issue.after_image_path || issue.status === 'resolved' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-purple-400 font-medium uppercase tracking-wider">{t('before', 'Before')}</span>
              <img src={issue.image_path} alt="Before" className="w-full h-48 object-cover rounded-xl border border-border-muted" />
            </div>
            {issue.after_image_path ? (
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-purple-400 font-medium uppercase tracking-wider">{t('after', 'After')}</span>
                <img src={issue.after_image_path} alt="After" className="w-full h-48 object-cover rounded-xl border border-border-muted" />
              </div>
            ) : issue.status === 'resolved' ? (
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-purple-400 font-medium uppercase tracking-wider">{t('after', 'After')}</span>
                <div className="flex items-center justify-center border border-border-muted bg-surface-2 dark:bg-surface-2/20 rounded-xl h-48 text-xs text-slate-400 dark:text-purple-400 text-center px-4">
                  {t('resolved_no_photo', 'Issue resolved (no after photo attached)')}
                </div>
              </div>
            ) : null}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-2 dark:bg-surface-2/10 rounded-lg p-3 border border-border-muted">
              <div className="text-[11px] text-slate-500 dark:text-purple-400 mb-1">{t('severity', 'Severity')}</div>
              <div className="font-mono font-semibold" style={{ color: sevMeta.color }}>
                {t('severity_' + issue.severity_label.toLowerCase(), issue.severity_label)}
              </div>
            </div>
            <div className="bg-surface-2 dark:bg-surface-2/10 rounded-lg p-3 border border-border-muted">
              <div className="text-[11px] text-slate-500 dark:text-purple-400 mb-1">{t('severity_score', 'Severity Score')}</div>
              <div className="font-mono font-semibold text-slate-800 dark:text-purple-200">{issue.severity_score}/100</div>
            </div>
          </div>

          {/* SLA status (only if unresolved) */}
          {issue.status !== 'resolved' && issue.days_until_sla !== null && (
            <div className={`text-sm p-3 rounded-xl border ${
              issue.sla_breach
                ? 'bg-red-500/10 border-red-500/20 text-red-650 dark:text-red-405'
                : 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary dark:text-brand-medium'
            }`}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{t('sla_status', 'SLA Status:')} </span>
                <span>{issue.sla_breach
                  ? t('sla_breached_days', 'Breached {days} days ago').replace('{days}', Math.abs(issue.days_until_sla))
                  : t('sla_remaining_days', '{days} days remaining').replace('{days}', issue.days_until_sla)
                }</span>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="text-sm space-y-2 border-t border-border-muted pt-4">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-purple-400">{t('department', 'Department')}</span>
              <span className="text-right text-slate-850 dark:text-purple-200 font-medium">{issue.assigned_department || '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-purple-400">{t('address', 'Address')}</span>
              <span className="text-right text-slate-850 dark:text-purple-200 break-words">{issue.address || '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-purple-400">{t('reported_time', 'Reported')}</span>
              <span className="text-right text-slate-850 dark:text-purple-200">{timeAgo(issue.created_at, t)}</span>
            </div>
            {issue.reporter_note && (
              <div className="border-t border-border-muted pt-2 mt-2">
                <div className="text-xs text-slate-500 dark:text-purple-400 mb-1">{t('citizen_note', 'Citizen note')}</div>
                <div className="text-slate-700 dark:text-purple-200 bg-surface-2 dark:bg-surface-2/15 rounded-lg p-3 text-sm italic">{issue.reporter_note}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
