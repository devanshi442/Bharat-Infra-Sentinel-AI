import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Camera, Upload, Loader2, CheckCircle2, MapPin, AlertTriangle, Mic, MicOff, Languages, X, Clock } from 'lucide-react'
import { api } from '../api'
import { ISSUE_TYPE_META, SEVERITY_META, STATUS_META, timeAgo } from '../constants'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
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

const mapLangToBCP47 = (lang) => {
  const map = {
    hi: 'hi-IN', bn: 'bn-IN', mr: 'mr-IN', te: 'te-IN', ta: 'ta-IN',
    gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN', en: 'en-IN'
  }
  return map[lang] || 'en-IN';
}

export default function CitizenReport() {
  // Citizen auth state (demo OTP)
  const [citizenName, setCitizenName] = useState(localStorage.getItem('citizen-name') || '')
  const [citizenPhone, setCitizenPhone] = useState(localStorage.getItem('citizen-phone') || '')
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('citizen-token'))
  const [loginStep, setLoginStep] = useState(1) // 1=request, 2=verify
  const [otpValue, setOtpValue] = useState('')
  const [demoOtp, setDemoOtp] = useState(null)
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  
  // Tabs and History states
  const [activeTab, setActiveTab] = useState('new_report')
  const [issues, setIssues] = useState([])
  const [loadingIssues, setLoadingIssues] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
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
      setLoadingIssues(false)
      return
    }

    let mounted = true
    setLoadingIssues(true)
    async function load() {
      try {
        const res = await api.getMyReports()
        if (mounted) setIssues(res || [])
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoadingIssues(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [isLoggedIn])

  // Form states
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [location, setLocation] = useState(null)
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [originalNote, setOriginalNote] = useState('')
  const [translatedNote, setTranslatedNote] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [status, setStatus] = useState('idle') // idle | locating | submitting | done | error
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const { t, i18n } = useTranslation()
  const fileInputRef = useRef(null)
  const recognitionRef = useRef(null)

  function handleFileSelect(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function detectLocation() {
    setStatus('locating')
    if (!navigator.geolocation) {
      setLocation({ lat: 30.901, lng: 75.8573 })
      setStatus('idle')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('idle')
      },
      () => {
        // Demo fallback: Ludhiana coordinates (pilot city)
        setLocation({ lat: 30.901, lng: 75.8573 })
        setStatus('idle')
      },
      { timeout: 5000 }
    )
  }

  async function handleSubmit() {
    if (!file) { setErrorMsg(t('photoRequired')); setStatus('error'); return }
    if (!location) { setErrorMsg(t('locationRequired')); setStatus('error'); return }
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await api.uploadIssue({
        file,
        latitude: location.lat,
        longitude: location.lng,
        address: address.trim() || undefined,
        reporterNote: note.trim() || undefined,
        reporterPhone: isLoggedIn ? localStorage.getItem('citizen-phone') : undefined,
        originalLanguage: i18n.language || 'en'
      })
      if (res.offline) {
        setResult({ offline: true, issue_type: 'unknown', severity_label: 'Pending', severity_score: 0 })
      } else {
        setResult(res)
        // Refresh history list silently in background
        const resHistory = await api.getMyReports()
        setIssues(resHistory || [])
        setOriginalNote(note)
      }
      setStatus('done')
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  function reset() {
    setFile(null); setPreview(null); setLocation(null)
    setAddress(''); setNote(''); setOriginalNote(''); setTranslatedNote(''); setResult(null); setStatus('idle')
    setActiveTab('my_reports') // Go to history tab to track new item
  }

  function toggleVoiceInput() {
    if (isRecording) {
      recognitionRef.current?.stop()
      recognitionRef.current = null
      setIsRecording(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setErrorMsg(t('voiceNotSupported'))
      setStatus('error')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = mapLangToBCP47(i18n.language)

    recognition.onstart = () => setIsRecording(true)
    recognition.onresult = event => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript + ' '
        }
      }
      if (transcript.trim()) {
        setNote(prev => (prev ? prev.trimEnd() + ' ' : '') + transcript.trim())
      }
    }
    recognition.onerror = () => { recognitionRef.current = null; setIsRecording(false) }
    recognition.onend = () => { recognitionRef.current = null; setIsRecording(false) }

    recognitionRef.current = recognition
    recognition.start()
  }

  const canSubmit = file && location && status !== 'submitting'

  // When the UI language changes, translate dynamic citizen-facing content
  useEffect(() => {
    let mounted = true
    const target = i18n.language || 'en'
    async function doTranslate() {
      try {
        if (originalNote) {
          const r = await api.translate(originalNote, target)
          if (mounted && r && r.translatedText) {
            setNote(r.translatedText)
            setTranslatedNote(r.translatedText)
          }
        }

        if (result) {
          if (result.reporter_note) {
            const r2 = await api.translate(result.reporter_note, target)
            if (mounted && r2 && r2.translatedText) setResult(prev => prev ? { ...prev, reporter_note_translated: r2.translatedText } : prev)
          }
          if (result.assigned_department) {
            const r3 = await api.translate(result.assigned_department, target)
            if (mounted && r3 && r3.translatedText) setResult(prev => prev ? { ...prev, assigned_department_translated: r3.translatedText } : prev)
          }
        }
      } catch (e) {
        console.debug('Translation error', e)
      }
    }
    doTranslate()
    return () => { mounted = false }
  }, [i18n.language])

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
    setActiveTab('new_report')
  }

  const filteredIssues = filterStatus === 'all'
    ? issues
    : issues.filter(i => i.status === filterStatus)

  return (
    <div className="min-h-screen bg-paper text-slate-900 dark:text-purple-100 transition-colors duration-300">
      <header className="border-b border-slate-200 dark:border-border-muted bg-white dark:bg-surface sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-brand-primary/55 hover:text-brand-deep dark:hover:text-purple-250 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-display font-semibold text-lg text-brand-deep dark:text-purple-100">{t('title')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <DarkModeToggle variant="dark" />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {!isLoggedIn ? (
          /* Gated View: Citizen login card only */
          <div className="bg-white dark:bg-surface border border-slate-200 dark:border-border-muted rounded-2xl p-8 shadow-sm max-w-md mx-auto transition-colors duration-300">
            {sessionExpired && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 text-xs rounded-xl p-3 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Your session has expired. Please log in again.</span>
              </div>
            )}
            <h2 className="text-xl font-display font-semibold text-brand-deep dark:text-purple-100 mb-2">Track & Report Issues</h2>
            <p className="text-sm text-slate-500 dark:text-purple-400 mb-6">Login with your name and phone number to file new reports and view history.</p>
            
            {loginStep === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-purple-400 tracking-wider mb-2">Your Name</label>
                  <input
                    value={citizenName}
                    onChange={e => setCitizenName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full text-sm border border-slate-200 dark:border-border-muted rounded-xl px-4 py-3 outline-none focus:border-brand-medium bg-white dark:bg-surface-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-purple-650 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-purple-400 tracking-wider mb-2">Phone Number</label>
                  <input
                    value={citizenPhone}
                    onChange={e => setCitizenPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full text-sm border border-slate-200 dark:border-border-muted rounded-xl px-4 py-3 outline-none focus:border-brand-medium bg-white dark:bg-surface-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-purple-650 transition-colors"
                  />
                </div>
                {loginError && (
                  <div className="text-xs text-red-500 dark:text-red-400">{loginError}</div>
                )}
                <button
                  onClick={handleRequestOtp}
                  disabled={!citizenName.trim() || !citizenPhone.trim() || loggingIn}
                  className="w-full bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-accent/15"
                >
                  {loggingIn && <Loader2 className="w-4 h-4 animate-spin" />}
                  Request OTP
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-purple-400 tracking-wider mb-2">Enter Verification Code</label>
                  <input
                    value={otpValue}
                    onChange={e => setOtpValue(e.target.value)}
                    placeholder="Enter OTP"
                    className="w-full text-sm border border-slate-200 dark:border-border-muted rounded-xl px-4 py-3 outline-none focus:border-brand-medium bg-white dark:bg-surface-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-purple-650 transition-colors"
                  />
                </div>
                {demoOtp && (
                  <div className="bg-surface-2 dark:bg-surface-2/15 border border-border-muted rounded-lg p-3 text-center transition-colors">
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
                  className="w-full bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-accent/15"
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
          /* Unified Portal View */
          <div className="space-y-6 animate-fadeIn">
            {/* Richer Profile */}
            <div className="bg-white dark:bg-surface border border-slate-200 dark:border-border-muted rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 transition-colors duration-300">
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
                  <div className="text-xl font-semibold text-brand-deep dark:text-purple-150">{issues.length}</div>
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

            {/* Tab Navigation */}
            <div className="flex gap-4 border-b border-slate-200 dark:border-border-muted pb-4">
              <button
                onClick={() => setActiveTab('new_report')}
                className={`pb-2 font-display text-sm font-semibold border-b-2 transition-all px-1 ${
                  activeTab === 'new_report'
                    ? 'border-brand-primary text-brand-primary dark:border-brand-medium dark:text-brand-medium'
                    : 'border-transparent text-slate-400 dark:text-purple-500 hover:text-slate-600 dark:hover:text-purple-300'
                }`}
              >
                {t('new_report_tab', 'New Report')}
              </button>
              <button
                onClick={() => setActiveTab('my_reports')}
                className={`pb-2 font-display text-sm font-semibold border-b-2 transition-all px-1 ${
                  activeTab === 'my_reports'
                    ? 'border-brand-primary text-brand-primary dark:border-brand-medium dark:text-brand-medium'
                    : 'border-transparent text-slate-400 dark:text-purple-500 hover:text-slate-600 dark:hover:text-purple-300'
                }`}
              >
                {t('my_reports_tab', 'My Reports')} ({issues.length})
              </button>
            </div>

            {activeTab === 'new_report' ? (
              /* New Report Form Section */
              status === 'done' && result ? (
                <ResultCard result={result} onReset={reset} />
              ) : (
                <div className="space-y-6">
                  {/* Step 1: Photo */}
                  <section className="bg-white dark:bg-surface rounded-2xl border border-slate-200 dark:border-border-muted p-6 transition-colors duration-300">
                    <h2 className="font-display font-medium text-slate-900 dark:text-purple-100 mb-1">{t('step1')}</h2>
                    <p className="text-sm text-slate-550 dark:text-purple-400 mb-4">{t('step1Desc')}</p>

                    {preview ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-border-muted">
                        <img src={preview} alt="Selected issue" className="w-full h-64 object-cover" />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-3 right-3 bg-white/90 dark:bg-surface/90 backdrop-blur text-slate-900 dark:text-purple-100 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white dark:hover:bg-surface transition-colors shadow-sm border border-slate-200 dark:border-border-muted"
                        >
                          {t('changePhoto')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-48 rounded-xl border-2 border-dashed border-slate-200 dark:border-border-muted hover:border-brand-accent dark:hover:border-brand-accent hover:bg-brand-light/35 dark:hover:bg-brand-light/10 transition-colors flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-purple-500"
                      >
                        <Camera className="w-7 h-7" strokeWidth={1.5} />
                        <span className="text-sm font-medium">{t('tapToUpload')}</span>
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
                  </section>

                  {/* Step 2: Location */}
                  <section className="bg-white dark:bg-surface rounded-2xl border border-slate-200 dark:border-border-muted p-6 transition-colors duration-300">
                    <h2 className="font-display font-medium text-slate-900 dark:text-purple-100 mb-1">{t('step2')}</h2>
                    <p className="text-sm text-slate-550 dark:text-purple-400 mb-4">{t('step2Desc')}</p>

                    {location ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm text-brand-medium dark:text-brand-medium font-medium bg-brand-light dark:bg-brand-light/20 border border-brand-medium/30 dark:border-brand-medium/20 rounded-lg px-3 py-2.5 flex-1">
                          <MapPin className="w-4 h-4 shrink-0" />
                          {t('location_captured', 'Location captured')} ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                        </div>
                        <button
                          onClick={() => setLocation(null)}
                          className="text-xs text-slate-500 dark:text-purple-400 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-border-muted rounded-lg px-3 py-2.5 transition-colors whitespace-nowrap"
                        >
                          {t('reset', 'Reset')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={detectLocation}
                        disabled={status === 'locating'}
                        className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-border-muted hover:border-brand-accent dark:hover:border-brand-accent text-slate-700 dark:text-purple-200 hover:bg-slate-50 dark:hover:bg-surface-2 font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {status === 'locating'
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <MapPin className="w-4 h-4" />
                        }
                        {status === 'locating' ? t('locating') : t('useLocation')}
                      </button>
                    )}

                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder={t('landmark')}
                      className="mt-3 w-full text-sm border border-slate-200 dark:border-border-muted bg-white dark:bg-surface-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-purple-650 rounded-lg px-3 py-2.5 focus:border-brand-accent dark:focus:border-brand-accent outline-none transition-colors"
                    />
                  </section>

                  {/* Step 3: Note */}
                  <section className="bg-white dark:bg-surface rounded-2xl border border-slate-200 dark:border-border-muted p-6 transition-colors duration-300">
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="font-display font-medium text-slate-900 dark:text-purple-100">
                        {t('step3')} <span className="text-slate-500 dark:text-purple-400 font-normal">{t('optional')}</span>
                      </h2>
                      <button
                        type="button"
                        onClick={toggleVoiceInput}
                        className={`p-2 rounded-full transition-colors ${isRecording
                            ? 'bg-red-100 dark:bg-red-950/40 text-red-500'
                            : 'bg-slate-100 dark:bg-surface-2 text-slate-500 dark:text-purple-400 hover:bg-slate-200 dark:hover:bg-border-muted'
                          }`}
                        title={isRecording ? 'Stop recording' : 'Start voice input'}
                      >
                        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 animate-pulse" />}
                      </button>
                    </div>
                    {isRecording && (
                      <div className="flex items-center gap-2 text-xs text-red-500 dark:text-red-400 mb-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400 animate-pulse" />
                        {t('listening')}
                      </div>
                    )}
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder={t('anythingElse')}
                      rows={3}
                      className={`w-full text-sm border rounded-lg px-3 py-2.5 outline-none resize-none transition-colors ${isRecording ? 'border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10 text-slate-900 dark:text-white' : 'border-slate-200 dark:border-border-muted bg-white dark:bg-surface-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-purple-650 focus:border-brand-accent dark:focus:border-brand-accent'
                        }`}
                    />
                  </section>

                  {/* Error message */}
                  {status === 'error' && errorMsg && (
                    <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      {errorMsg}
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="w-full flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accent/90 disabled:bg-slate-100 dark:disabled:bg-surface border border-transparent disabled:border-slate-200 dark:disabled:border-border-muted disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-500 text-white font-medium px-6 py-4 rounded-xl transition-colors shadow-lg shadow-brand-accent/15"
                  >
                    {status === 'submitting' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> {t('analyzing')}</>
                    ) : (
                      <><Upload className="w-4 h-4" /> {t('submit')}</>
                    )}
                  </button>
                </div>
              )
            ) : (
              /* My Reports History List Section */
              <div className="space-y-4 animate-fadeIn">
                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-1.5">
                  {['all', 'reported', 'in_progress', 'resolved'].map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`text-xs px-3.5 py-1.5 rounded-full transition-colors border ${
                        filterStatus === s
                          ? 'bg-brand-primary text-white border-brand-primary font-medium shadow-sm'
                          : 'bg-white dark:bg-surface border-slate-200 dark:border-border-muted text-slate-500 dark:text-purple-400 hover:text-brand-primary dark:hover:text-brand-medium'
                      }`}
                    >
                      {s === 'all' ? t('all', 'All') : t('status_' + s, STATUS_META[s]?.label || s)}
                    </button>
                  ))}
                </div>

                {/* Issues List */}
                {loadingIssues ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-3" />
                    <div className="text-sm text-slate-500 dark:text-purple-400">{t('loading', 'Loading…')}</div>
                  </div>
                ) : filteredIssues.length === 0 ? (
                  <div className="bg-white dark:bg-surface border border-slate-200 dark:border-border-muted rounded-2xl p-12 text-center shadow-sm transition-colors duration-300">
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
                      <button onClick={() => setActiveTab('new_report')} className="bg-brand-accent hover:bg-brand-accent/90 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors inline-block">
                        Report an Issue
                      </button>
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
                          className="bg-white dark:bg-surface border border-slate-200 dark:border-border-muted rounded-xl p-4 flex gap-4 cursor-pointer hover:border-brand-primary/50 dark:hover:border-brand-medium/50 hover:shadow-sm transition-all duration-200"
                        >
                          <img src={issue.image_path} alt="thumb" className="w-24 h-20 object-cover rounded-md border border-slate-200 dark:border-border-muted shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold text-slate-855 dark:text-purple-100 truncate">{t('issue_type_' + issue.issue_type, type.label)}</div>
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
                                    ? 'bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/20' 
                                    : 'bg-slate-100 dark:bg-surface-2 text-slate-650 dark:text-purple-300 border-slate-200 dark:border-border-muted'
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
        className="bg-white dark:bg-surface border border-slate-200 dark:border-border-muted rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scroll-thin shadow-2xl transition-colors duration-300"
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
                <p className="text-xs text-slate-500 dark:text-purple-400 font-mono">#{issue.id} · {issue.ward || issue.city || ''}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-brand-primary dark:text-purple-400 dark:hover:text-brand-medium p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-2 transition-colors">
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
                <div className="flex items-center justify-center border border-border-muted bg-slate-50 dark:bg-surface-2 rounded-xl h-48 text-xs text-slate-400 dark:text-purple-400 text-center px-4">
                  {t('resolved_no_photo', 'Issue resolved (no after photo attached)')}
                </div>
              </div>
            ) : null}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-surface-2 rounded-lg p-3 border border-slate-200 dark:border-border-muted">
              <div className="text-[11px] text-slate-500 dark:text-purple-400 mb-1">{t('severity', 'Severity')}</div>
              <div className="font-mono font-semibold" style={{ color: sevMeta.color }}>
                {t('severity_' + issue.severity_label.toLowerCase(), issue.severity_label)}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-surface-2 rounded-lg p-3 border border-slate-200 dark:border-border-muted">
              <div className="text-[11px] text-slate-500 dark:text-purple-400 mb-1">{t('severity_score', 'Severity Score')}</div>
              <div className="font-mono font-semibold text-slate-800 dark:text-purple-200">{issue.severity_score}/100</div>
            </div>
          </div>

          {/* SLA status (only if unresolved) */}
          {issue.status !== 'resolved' && issue.days_until_sla !== null && (
            <div className={`text-sm p-3 rounded-xl border ${
              issue.sla_breach
                ? 'bg-red-500/10 border-red-500/20 text-red-650 dark:text-red-400'
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
                <div className="text-slate-700 dark:text-purple-200 bg-slate-50 dark:bg-surface-2 rounded-lg p-3 text-sm italic">{issue.reporter_note}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}