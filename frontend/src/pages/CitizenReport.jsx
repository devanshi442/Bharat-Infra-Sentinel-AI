import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Camera, Upload, Loader2, CheckCircle2, MapPin, AlertTriangle, Mic, MicOff, Languages } from 'lucide-react'
import { api } from '../api'
import { ISSUE_TYPE_META, SEVERITY_META } from '../constants'

import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'

const mapLangToBCP47 = (lang) => {
  const map = {
    hi: 'hi-IN', bn: 'bn-IN', mr: 'mr-IN', te: 'te-IN', ta: 'ta-IN',
    gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN', en: 'en-IN'
  }
  return map[lang] || 'en-IN';
}

export default function CitizenReport() {
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
  const recognitionRef = useRef(null) // store active recognition instance

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
        originalLanguage: i18n.language || 'en'
      })
      if (res.offline) {
        setResult({ offline: true, issue_type: 'unknown', severity_label: 'Pending', severity_score: 0 })
      } else {
        setResult(res)
        // persist original note so we can re-translate on language change
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
  }

  function toggleVoiceInput() {
    // If already recording, stop it
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

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-slate-50/10 bg-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-900/50 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-display font-semibold text-lg text-slate-900">{t('title')}</h1>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {status === 'done' && result ? (
          <ResultCard result={result} onReset={reset} />
        ) : (
          <div className="space-y-6">
            {/* Step 1: Photo */}
            <section className="bg-white rounded-2xl border border-slate-50/10 p-6">
              <h2 className="font-display font-medium text-slate-900 mb-1">{t('step1')}</h2>
              <p className="text-sm text-slate-900/50 mb-4">{t('step1Desc')}</p>

              {preview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-50/10">
                  <img src={preview} alt="Selected issue" className="w-full h-64 object-cover" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-3 right-3 bg-white/90 backdrop-blur text-slate-900 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white transition-colors shadow-sm"
                  >
                    {t('changePhoto')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 rounded-xl border-2 border-dashed border-slate-50/15 hover:border-signal-400 hover:bg-signal-50 transition-colors flex flex-col items-center justify-center gap-2 text-slate-900/40"
                >
                  <Camera className="w-7 h-7" strokeWidth={1.5} />
                  <span className="text-sm font-medium">{t('tapToUpload')}</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
            </section>

            {/* Step 2: Location */}
            <section className="bg-white rounded-2xl border border-slate-50/10 p-6">
              <h2 className="font-display font-medium text-slate-900 mb-1">{t('step2')}</h2>
              <p className="text-sm text-slate-900/50 mb-4">{t('step2Desc')}</p>

              {location ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm text-sentinel-600 font-medium bg-sentinel-50 border border-sentinel-400/30 rounded-lg px-3 py-2.5 flex-1">
                    <MapPin className="w-4 h-4 shrink-0" />
                    Location captured ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                  </div>
                  <button
                    onClick={() => setLocation(null)}
                    className="text-xs text-slate-900/40 hover:text-slate-900/70 border border-slate-50/10 rounded-lg px-3 py-2.5 transition-colors whitespace-nowrap"
                  >
                    Reset
                  </button>
                </div>
              ) : (
                <button
                  onClick={detectLocation}
                  disabled={status === 'locating'}
                  className="w-full flex items-center justify-center gap-2 border border-slate-50/15 hover:border-signal-400 text-slate-900 font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
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
                className="mt-3 w-full text-sm border border-slate-50/15 rounded-lg px-3 py-2.5 focus:border-signal-400 outline-none"
              />
            </section>

            {/* Step 3: Note */}
            <section className="bg-white rounded-2xl border border-slate-50/10 p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display font-medium text-slate-900">
                  {t('step3')} <span className="text-slate-900/40 font-normal">{t('optional')}</span>
                </h2>
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-2 rounded-full transition-colors ${isRecording
                      ? 'bg-red-100 text-red-500'
                      : 'bg-slate-50/5 text-slate-200 hover:bg-slate-50/10'
                    }`}
                  title={isRecording ? 'Stop recording' : 'Start voice input'}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
              {isRecording && (
                <div className="flex items-center gap-2 text-xs text-red-500 mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {t('listening')}
                </div>
              )}
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={t('anythingElse')}
                rows={3}
                className={`w-full text-sm border rounded-lg px-3 py-2.5 outline-none resize-none transition-colors ${isRecording ? 'border-red-300 bg-red-50/30' : 'border-slate-50/15 focus:border-signal-400'
                  }`}
              />
            </section>

            {/* Error message */}
            {status === 'error' && errorMsg && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 bg-signal-500 hover:bg-signal-600 disabled:bg-slate-50/15 disabled:cursor-not-allowed disabled:text-slate-900/30 text-white font-medium px-6 py-4 rounded-xl transition-colors"
            >
              {status === 'submitting' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t('analyzing')}</>
              ) : (
                <><Upload className="w-4 h-4" /> {t('submit')}</>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

function ResultCard({ result, onReset }) {
  const typeMeta = ISSUE_TYPE_META[result.issue_type] || ISSUE_TYPE_META.other
  const sevMeta = SEVERITY_META[result.severity_label] || SEVERITY_META.Low
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-50/10 overflow-hidden">
        <div className={`border-b px-6 py-4 flex items-center gap-2.5 ${result.offline ? 'bg-amber-50 border-amber-200' : 'bg-sentinel-50 border-sentinel-400/20'}`}>
          <CheckCircle2 className={`w-5 h-5 ${result.offline ? 'text-amber-600' : 'text-sentinel-600'}`} />
          <span className={`font-medium ${result.offline ? 'text-amber-800' : 'text-sentinel-700'}`}>
            {result.offline ? t('saved_offline') : t('report_submitted')}
          </span>
        </div>

        <div className="p-6 space-y-5">
          {result.image_path && (
            <img src={result.image_path} alt="" className="w-full h-56 object-cover rounded-xl" />
          )}

          {!result.offline && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{typeMeta.icon}</span>
                  <div>
                    <div className="font-display font-semibold text-slate-900">{typeMeta.label}</div>
                    <div className="text-xs text-slate-900/40">{Math.round(result.confidence * 100)}% {t('detection_confidence', 'detection confidence')}</div>
                  </div>
                </div>
                <span
                  className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ color: sevMeta.color, background: sevMeta.bg, border: `1px solid ${sevMeta.ring}` }}
                >
                  {result.severity_label} {t('severity', 'Severity')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50/[0.03] rounded-xl p-4">
                  <div className="text-xs text-slate-900/50 mb-1">{t('failure_risk_label')}</div>
                  <div className="font-display font-semibold text-2xl text-slate-900">{result.failure_probability_30d}%</div>
                </div>
                <div className="bg-slate-50/[0.03] rounded-xl p-4">
                  <div className="text-xs text-slate-900/50 mb-1">{t('routed_to')}</div>
                  <div className="font-medium text-sm text-slate-900 leading-snug pt-1.5">{result.assigned_department_translated || result.assigned_department}</div>
                </div>
              </div>

              <p className="text-xs text-slate-900/40 leading-relaxed border-t border-slate-50/5 pt-4">
                {t('report_visible_paragraph').replace('{id}', result.id).replace('{score}', result.priority_score)}
              </p>
              {result.reporter_note_translated && (
                <p className="text-sm text-slate-700 mt-2">{result.reporter_note_translated}</p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 bg-white hover:bg-slate-100 text-slate-900 font-medium px-6 py-3.5 rounded-xl transition-colors"
        >
          Report Another Issue
        </button>
        <Link
          to="/dashboard"
          className="flex-1 text-center border border-slate-50/15 hover:border-white/30 text-slate-900 font-medium px-6 py-3.5 rounded-xl transition-colors"
        >
          View Dashboard
        </Link>
      </div>
    </div>
  )
}