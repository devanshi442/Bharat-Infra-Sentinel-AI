import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Camera, Upload, Loader2, CheckCircle2, MapPin, AlertTriangle, Mic, Languages } from 'lucide-react'
import { api } from '../api'
import { ISSUE_TYPE_META, SEVERITY_META } from '../constants'

const TRANSLATIONS = {
  'en': {
    title: 'Report a Civic Issue',
    step1: '1. Add a photo',
    step1Desc: 'Pothole, garbage, waterlogging, broken streetlight, blocked drain.',
    changePhoto: 'Change photo',
    tapToUpload: 'Tap to take or upload a photo',
    step2: '2. Confirm location',
    step2Desc: 'Used to map the issue and route it to the right ward office.',
    locating: 'Detecting...',
    useLocation: 'Use my current location',
    landmark: 'Landmark or street name (optional)',
    step3: '3. Add a note',
    optional: '(optional)',
    listening: 'Listening...',
    anythingElse: 'Anything else the department should know...',
    submit: 'Submit Report',
    analyzing: 'Analyzing with AI...',
    voiceNotSupported: 'Voice input is not supported in your browser.'
  },
  'hi': {
    title: 'नागरिक समस्या दर्ज करें',
    step1: '1. फोटो जोड़ें',
    step1Desc: 'गड्ढा, कचरा, जलभराव, टूटी स्ट्रीटलाइट, बंद नाली।',
    changePhoto: 'फोटो बदलें',
    tapToUpload: 'फोटो खींचने या अपलोड करने के लिए टैप करें',
    step2: '2. स्थान की पुष्टि करें',
    step2Desc: 'समस्या को मैप करने और सही वार्ड कार्यालय में भेजने के लिए उपयोग किया जाता है।',
    locating: 'पता लगाया जा रहा है...',
    useLocation: 'मेरे वर्तमान स्थान का उपयोग करें',
    landmark: 'लैंडमार्क या सड़क का नाम (वैकल्पिक)',
    step3: '3. एक नोट जोड़ें',
    optional: '(वैकल्पिक)',
    listening: 'सुन रहा हूँ...',
    anythingElse: 'विभाग को कुछ और जानना चाहिए...',
    submit: 'रिपोर्ट जमा करें',
    analyzing: 'एआई के साथ विश्लेषण कर रहा है...',
    voiceNotSupported: 'आपके ब्राउज़र में वॉयस इनपुट समर्थित नहीं है।'
  },
  'pa': {
    title: 'ਨਾਗਰਿਕ ਸਮੱਸਿਆ ਦਰਜ ਕਰੋ',
    step1: '1. ਫੋਟੋ ਸ਼ਾਮਲ ਕਰੋ',
    step1Desc: 'ਟੋਏ, ਕੂੜਾ, ਪਾਣੀ ਭਰਨਾ, ਟੁੱਟੀ ਸਟ੍ਰੀਟ ਲਾਈਟ, ਬੰਦ ਡਰੇਨ।',
    changePhoto: 'ਫੋਟੋ ਬਦਲੋ',
    tapToUpload: 'ਫੋਟੋ ਖਿੱਚਣ ਜਾਂ ਅਪਲੋਡ ਕਰਨ ਲਈ ਟੈਪ ਕਰੋ',
    step2: '2. ਸਥਾਨ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ',
    step2Desc: 'ਸਮੱਸਿਆ ਨੂੰ ਮੈਪ ਕਰਨ ਅਤੇ ਸਹੀ ਵਾਰਡ ਦਫਤਰ ਨੂੰ ਭੇਜਣ ਲਈ ਵਰਤਿਆ ਜਾਂਦਾ ਹੈ।',
    locating: 'ਪਤਾ ਲਗਾਇਆ ਜਾ ਰਿਹਾ ਹੈ...',
    useLocation: 'ਮੇਰੇ ਮੌਜੂਦਾ ਸਥਾਨ ਦੀ ਵਰਤੋਂ ਕਰੋ',
    landmark: 'ਲੈਂਡਮਾਰਕ ਜਾਂ ਗਲੀ ਦਾ ਨਾਮ (ਵਿਕਲਪਿਕ)',
    step3: '3. ਇੱਕ ਨੋਟ ਸ਼ਾਮਲ ਕਰੋ',
    optional: '(ਵਿਕਲਪਿਕ)',
    listening: 'ਸੁਣ ਰਿਹਾ ਹਾਂ...',
    anythingElse: 'ਕੁਝ ਹੋਰ ਜੋ ਵਿਭਾਗ ਨੂੰ ਪਤਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ...',
    submit: 'ਰਿਪੋਰਟ ਦਰਜ ਕਰੋ',
    analyzing: 'AI ਨਾਲ ਵਿਸ਼ਲੇਸ਼ਣ ਕਰ ਰਿਹਾ ਹੈ...',
    voiceNotSupported: 'ਤੁਹਾਡੇ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਵੌਇਸ ਇਨਪੁਟ ਸਮਰਥਿਤ ਨਹੀਂ ਹੈ।'
  }
}

export default function CitizenReport() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [location, setLocation] = useState(null)
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [status, setStatus] = useState('idle') // idle | locating | submitting | done | error
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [lang, setLang] = useState('en')
  const fileInputRef = useRef(null)
  
  const t = TRANSLATIONS[lang]

  function handleFileSelect(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function detectLocation() {
    setStatus('locating')
    if (!navigator.geolocation) {
      // Fallback for demo environments without geolocation permission
      setLocation({ lat: 30.901, lng: 75.8573 })
      setStatus('idle')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('idle')
      },
      () => {
        // Demo fallback: Ludhiana coordinates (pilot city from pitch deck)
        setLocation({ lat: 30.901, lng: 75.8573 })
        setStatus('idle')
      },
      { timeout: 5000 }
    )
  }

  async function handleSubmit() {
    if (!file || !location) return
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await api.uploadIssue({
        file,
        latitude: location.lat,
        longitude: location.lng,
        address,
        reporterNote: note,
      })
      if (res.offline) {
        setResult({
          offline: true,
          issue_type: 'unknown',
          severity_label: 'Pending',
          severity_score: 0,
        })
      } else {
        setResult(res)
      }
      setStatus('done')
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setLocation(null)
    setAddress('')
    setNote('')
    setResult(null)
    setStatus('idle')
  }

  function toggleVoiceInput() {
    if (isRecording) {
      setIsRecording(false)
      // Stop is handled by the instance if stored, but simpler to let it timeout or we can just rely on the UI state
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setErrorMsg(t.voiceNotSupported)
      setStatus('error')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    
    // Set locale based on selected language
    if (lang === 'hi') recognition.lang = 'hi-IN'
    else if (lang === 'pa') recognition.lang = 'pa-IN'
    else recognition.lang = 'en-IN'

    recognition.onstart = () => setIsRecording(true)
    
    recognition.onresult = (event) => {
      let currentTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript
      }
      if (currentTranscript) {
        setNote(prev => prev ? prev + ' ' + currentTranscript : currentTranscript)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error)
      setIsRecording(false)
    }

    recognition.onend = () => setIsRecording(false)
    recognition.start()
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-ink-950/10 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-ink-900/50 hover:text-ink-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-display font-semibold text-lg text-ink-900">{t.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-ink-900/50" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="text-sm border border-ink-950/15 rounded-md px-2 py-1 outline-none focus:border-signal-400 bg-white"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="pa">ਪੰਜਾਬੀ</option>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {status === 'done' && result ? (
          <ResultCard result={result} onReset={reset} />
        ) : (
          <div className="space-y-6">
            {/* Step 1: Photo */}
            <section className="bg-white rounded-2xl border border-ink-950/10 p-6">
              <h2 className="font-display font-medium text-ink-900 mb-1">{t.step1}</h2>
              <p className="text-sm text-ink-900/50 mb-4">{t.step1Desc}</p>

              {preview ? (
                <div className="relative rounded-xl overflow-hidden border border-ink-950/10">
                  <img src={preview} alt="Selected issue" className="w-full h-64 object-cover" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-3 right-3 bg-white/90 backdrop-blur text-ink-900 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
                  >
                    {t.changePhoto}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 rounded-xl border-2 border-dashed border-ink-950/15 hover:border-signal-400 hover:bg-signal-50 transition-colors flex flex-col items-center justify-center gap-2 text-ink-900/40"
                >
                  <Camera className="w-7 h-7" strokeWidth={1.5} />
                  <span className="text-sm font-medium">{t.tapToUpload}</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </section>

            {/* Step 2: Location */}
            <section className="bg-white rounded-2xl border border-ink-950/10 p-6">
              <h2 className="font-display font-medium text-ink-900 mb-1">{t.step2}</h2>
              <p className="text-sm text-ink-900/50 mb-4">{t.step2Desc}</p>

              {location ? (
                <div className="flex items-center gap-2 text-sm text-sentinel-600 font-medium bg-sentinel-50 border border-sentinel-400/30 rounded-lg px-3 py-2.5">
                  <MapPin className="w-4 h-4" />
                  Location captured ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                </div>
              ) : (
                <button
                  onClick={detectLocation}
                  disabled={status === 'locating'}
                  className="w-full flex items-center justify-center gap-2 border border-ink-950/15 hover:border-signal-400 text-ink-900 font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {status === 'locating' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  {status === 'locating' ? t.locating : t.useLocation}
                </button>
              )}

              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t.landmark}
                className="mt-3 w-full text-sm border border-ink-950/15 rounded-lg px-3 py-2.5 focus:border-signal-400 outline-none"
              />
            </section>

            {/* Step 3: Note */}
            <section className="bg-white rounded-2xl border border-ink-950/10 p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display font-medium text-ink-900">{t.step3} <span className="text-ink-900/40 font-normal">{t.optional}</span></h2>
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-2 rounded-full transition-colors ${
                    isRecording ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                  }`}
                  title="Use voice input"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={isRecording ? t.listening : t.anythingElse}
                rows={3}
                className={`w-full text-sm border rounded-lg px-3 py-2.5 outline-none resize-none transition-colors ${
                  isRecording ? 'border-red-400 bg-red-50/30' : 'border-ink-950/15 focus:border-signal-400'
                }`}
              />
            </section>

            {status === 'error' && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!file || !location || status === 'submitting'}
              className="w-full flex items-center justify-center gap-2 bg-signal-500 hover:bg-signal-600 disabled:bg-ink-950/15 disabled:cursor-not-allowed text-white font-medium px-6 py-4 rounded-xl transition-colors"
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {t.analyzing}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> {t.submit}
                </>
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

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-ink-950/10 overflow-hidden">
        <div className={`border-b px-6 py-4 flex items-center gap-2.5 ${result.offline ? 'bg-amber-50 border-amber-200' : 'bg-sentinel-50 border-sentinel-400/20'}`}>
          <CheckCircle2 className={`w-5 h-5 ${result.offline ? 'text-amber-600' : 'text-sentinel-600'}`} />
          <span className={`font-medium ${result.offline ? 'text-amber-800' : 'text-sentinel-700'}`}>
            {result.offline ? 'Saved offline. Will sync when connected.' : 'Report submitted & analyzed'}
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
                    <div className="font-display font-semibold text-ink-900">{typeMeta.label}</div>
                    <div className="text-xs text-ink-900/40">{Math.round(result.confidence * 100)}% detection confidence</div>
                  </div>
                </div>
                <span
                  className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ color: sevMeta.color, background: sevMeta.bg, border: `1px solid ${sevMeta.ring}` }}
                >
                  {result.severity_label} Severity
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-ink-950/[0.03] rounded-xl p-4">
                  <div className="text-xs text-ink-900/50 mb-1">30-day escalation risk</div>
                  <div className="font-display font-semibold text-2xl text-ink-900">{result.failure_probability_30d}%</div>
                </div>
                <div className="bg-ink-950/[0.03] rounded-xl p-4">
                  <div className="text-xs text-ink-900/50 mb-1">Routed to</div>
                  <div className="font-medium text-sm text-ink-900 leading-snug pt-1.5">{result.assigned_department}</div>
                </div>
              </div>

              <p className="text-xs text-ink-900/40 leading-relaxed border-t border-ink-950/5 pt-4">
                Your report (#{result.id}) is now visible on the municipal dashboard, ranked by priority score{' '}
                <strong className="text-ink-900/60">{result.priority_score}</strong>. You'll be notified as the ward office acts on it.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 bg-ink-900 hover:bg-ink-800 text-white font-medium px-6 py-3.5 rounded-xl transition-colors"
        >
          Report Another Issue
        </button>
        <Link
          to="/dashboard"
          className="flex-1 text-center border border-ink-950/15 hover:border-ink-900/30 text-ink-900 font-medium px-6 py-3.5 rounded-xl transition-colors"
        >
          View Dashboard
        </Link>
      </div>
    </div>
  )
}
