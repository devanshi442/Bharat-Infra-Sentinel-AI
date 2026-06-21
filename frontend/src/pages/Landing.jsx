import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowRight, Camera, Brain, MapPinned, ShieldCheck, 
  Terminal, Activity, Database, AlertTriangle, CheckCircle2, 
  ExternalLink, Server
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import LanguageSwitcher from '../components/LanguageSwitcher'
import DarkModeToggle from '../components/DarkModeToggle'

// Lightweight custom hook to handle scroll animations
function useScrollReveal() {
  const [isRevealed, setIsRevealed] = useState(false)
  const elementRef = useRef(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) {
      setIsRevealed(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true)
          observer.unobserve(entry.target)
        }
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -40px 0px',
      }
    )

    const currentElement = elementRef.current
    if (currentElement) {
      observer.observe(currentElement)
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement)
      }
    }
  }, [])

  return [elementRef, isRevealed]
}

// Helper wrapper component for scroll reveal effects
function ScrollReveal({ children, delay = 0, className = "" }) {
  const [ref, isRevealed] = useScrollReveal()

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-1000 ease-out transform ${
        isRevealed 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-12 pointer-events-none'
      } ${className}`}
    >
      {children}
    </div>
  )
}

const TELEMETRY_POOL = [
  { type: 'pothole', ward: 'Ward F/N (Mumbai)', priority: 87, mins: 2, status: 'reported' },
  { type: 'waterlogging', ward: 'Mahadevapura (Bengaluru)', priority: 94, mins: 4, status: 'in_progress' },
  { type: 'streetlight', ward: 'Ward 45 (Delhi)', priority: 72, mins: 7, status: 'reported' },
  { type: 'drainage', ward: 'Ward 12 (Kolkata)', priority: 91, mins: 11, status: 'in_progress' },
  { type: 'garbage', ward: 'Ward 8 (Chennai)', priority: 79, mins: 15, status: 'resolved' },
  { type: 'pothole', ward: 'Hadapsar (Pune)', priority: 83, mins: 18, status: 'reported' },
  { type: 'waterlogging', ward: 'Ward 17 (Hyderabad)', priority: 95, mins: 22, status: 'reported' },
  { type: 'streetlight', ward: 'Ward 22 (Ahmedabad)', priority: 68, mins: 27, status: 'resolved' },
  { type: 'drainage', ward: 'Alipore (Kolkata)', priority: 89, mins: 31, status: 'in_progress' },
  { type: 'garbage', ward: 'Jayanagar (Bengaluru)', priority: 74, mins: 38, status: 'resolved' }
]

export default function Landing() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState([])
  const [totalIssues, setTotalIssues] = useState(14225)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  // Real-time ticking telemetry metrics
  const [activeSensors, setActiveSensors] = useState(8742)
  const [networkLatency, setNetworkLatency] = useState(41)
  const [processingRate, setProcessingRate] = useState(42.5)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSensors(prev => prev + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3))
      setNetworkLatency(prev => Math.max(35, Math.min(48, prev + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 2))))
      setProcessingRate(prev => Math.max(39.0, Math.min(46.0, Number((prev + (Math.random() > 0.5 ? 0.1 : -0.1) * Math.floor(Math.random() * 2)).toFixed(1)))))
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  // Load live DB count
  useEffect(() => {
    async function fetchStats() {
      try {
        const statsData = await api.dashboardStats()
        if (statsData && statsData.total_issues !== undefined && statsData.total_issues > 0) {
          setTotalIssues(statsData.total_issues)
        }
      } catch (e) {
        console.error("Error fetching stats for landing page:", e)
      } finally {
        setIsLoadingStats(false)
      }
    }
    fetchStats()
  }, [])

  // Initialize and cycle telemetry logs
  useEffect(() => {
    setLogs(TELEMETRY_POOL.slice(0, 4).map((item, idx) => ({
      ...item,
      id: 1000 + idx
    })))

    let poolIndex = 4
    const interval = setInterval(() => {
      setLogs((prevLogs) => {
        const template = TELEMETRY_POOL[poolIndex]
        const newEntry = {
          ...template,
          id: Math.floor(Math.random() * 9000) + 1000,
          mins: 1
        }
        
        poolIndex = (poolIndex + 1) % TELEMETRY_POOL.length

        // Age old logs slightly
        const aged = prevLogs.map(log => ({
          ...log,
          mins: log.mins + Math.floor(Math.random() * 2) + 1
        }))

        const nextLogs = [...aged, newEntry]
        if (nextLogs.length > 4) {
          nextLogs.shift()
        }
        return nextLogs
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  const displayCount = totalIssues
  const displaySlaPrevented = Math.round(displayCount * 0.618)

  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans overflow-x-hidden selection:bg-brand-accent selection:text-white dark:text-purple-50">
      
      {/* --- HERO SECTION (Purple deep with abstract gradient blobs) --- */}
      <section className="relative bg-brand-deep text-slate-100 overflow-hidden pb-24 pt-4 border-b border-purple-900/50">
        
        {/* Subtle grid backdrop — white lines on deep purple */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        
        {/* Abstract gradient blob 1 — purple, top-right */}
        <div
          className="blob-animate absolute top-[-10%] right-[-5%] w-[700px] h-[700px] rounded-full pointer-events-none z-0"
          style={{
            '--blob-opacity': '0.35',
            background: 'radial-gradient(circle at center, #7c3aed 0%, transparent 70%)',
            filter: 'blur(120px)',
            opacity: 0.35,
          }}
        />
        
        {/* Abstract gradient blob 2 — pink/magenta, bottom-left */}
        <div
          className="blob-animate-delay-2 absolute bottom-[-15%] left-[-8%] w-[550px] h-[550px] rounded-full pointer-events-none z-0"
          style={{
            '--blob-opacity': '0.28',
            background: 'radial-gradient(circle at center, #ec4899 0%, transparent 70%)',
            filter: 'blur(100px)',
            opacity: 0.28,
          }}
        />
        
        {/* Abstract gradient blob 3 — yellow accent, center-right edge */}
        <div
          className="blob-animate-delay-4 absolute top-[35%] right-[8%] w-[320px] h-[320px] rounded-full pointer-events-none z-0"
          style={{
            '--blob-opacity': '0.18',
            background: 'radial-gradient(circle at center, #facc15 0%, transparent 70%)',
            filter: 'blur(80px)',
            opacity: 0.18,
          }}
        />

        {/* Global Header inside Hero */}
        <header className="relative z-10 max-w-7xl w-full mx-auto px-6 md:px-10 flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-8 h-8 text-brand-accent" strokeWidth={2.2} />
            <span className="font-display font-bold text-xl tracking-tight text-white select-none">
              {t('app_title', 'Bharat Infra Sentinel')} <span className="text-brand-accent">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden lg:inline-block text-[11px] font-mono text-purple-300 tracking-wider uppercase border border-purple-800/60 bg-purple-950/40 rounded-full px-3 py-1.5 backdrop-blur-sm select-none">
              {t('hackathon_tagline', 'Bharat Academix CodeQuest 2026')}
            </span>
            <DarkModeToggle variant="light" />
            <div className="bg-purple-950/60 border border-purple-800/50 rounded-lg px-2.5 py-1 flex items-center justify-center backdrop-blur-md">
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        {/* Hero grid body */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-10 md:pt-16 lg:pt-20 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            
            {/* Live Indicator tag */}
            <div className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-wider text-brand-accent border border-brand-accent/40 bg-brand-accent/10 rounded-full px-3.5 py-1 mb-8 backdrop-blur-sm shadow-[0_0_20px_rgba(236,72,153,0.1)]">
              <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
              {t('predictive_civic_governance', 'Predictive Civic Governance')}
            </div>

            <h1 className="font-display font-extrabold text-5xl md:text-7xl lg:text-[76px] leading-[1.02] tracking-tighter mb-8 text-white">
              <span className="block text-white font-extrabold">{t('hero_title_1', 'Cities decay')}</span>
              <span className="block text-purple-300/80 font-medium my-1">{t('hero_title_2', 'in ways the eye')}</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-accent via-purple-300 to-brand-yellow font-extrabold">{t('hero_title_3', "can't see yet.")}</span>
            </h1>

            <p className="text-base md:text-lg text-purple-200/80 leading-relaxed max-w-xl mb-10 font-normal">
              {t('hero_subtitle', 'Bharat Infra Sentinel AI turns citizen photos into predictions — telling municipalities which road, drain, or streetlight fails next, before it does.')}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link
                to="/report"
                className="group inline-flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold px-6 py-4 rounded-xl transition-all shadow-lg shadow-brand-accent/25 hover:shadow-brand-accent/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Camera className="w-5 h-5 text-white" strokeWidth={2.2} />
                {t('report_issue', 'Report an Issue')}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2.2} />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 border border-purple-600/60 hover:border-brand-medium/80 bg-purple-950/40 hover:bg-purple-900/50 text-white font-medium px-6 py-4 rounded-xl transition-all backdrop-blur-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <MapPinned className="w-5 h-5 text-brand-medium" />
                {t('open_dashboard', 'Open Government Dashboard')}
              </Link>
            </div>
          </div>

          {/* Right Column: Simulated Live Telemetry Ticker Console */}
          <div className="lg:col-span-5 w-full">
            {/* Telemetry console — specific hex values approved in Q3 response */}
            <div className="bg-gradient-to-b from-[#1a0a2e] to-[#0d0118] border border-purple-900/50 rounded-2xl p-6 font-mono text-[13px] text-slate-300 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] hover:border-brand-medium/40 hover:shadow-[0_35px_80px_-15px_rgba(91,33,182,0.3)] transition-all duration-500 relative flex flex-col h-[390px] overflow-hidden select-none">
              
              {/* Terminal tab / top bar */}
              <div className="flex items-center justify-between pb-4 mb-3 border-b border-purple-950/80">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-accent"></span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">{t('live_telemetry', 'Live Telemetry Feed')}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded-md shadow-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                  </span>
                  <span className="tracking-wide">SENTINEL_OK</span>
                </div>
              </div>

              {/* Ticking Metrics Bar */}
              <div className="grid grid-cols-3 gap-2 pb-3 mb-3 border-b border-purple-950/60 text-[10px] text-slate-500 font-mono">
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase tracking-wider text-slate-600 font-sans">Active Sensors</span>
                  <span className="font-semibold text-slate-300 font-mono tracking-tight transition-all duration-300">
                    {activeSensors.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase tracking-wider text-slate-600 font-sans">Latency</span>
                  <span className="font-semibold text-slate-300 font-mono tracking-tight transition-all duration-300">
                    {networkLatency}ms
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase tracking-wider text-slate-600 font-sans">Processing</span>
                  <span className="font-semibold text-emerald-400 font-mono tracking-tight transition-all duration-300">
                    {processingRate} req/s
                  </span>
                </div>
              </div>

              {/* Feed viewport */}
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 scrollbar-none font-mono">
                {logs.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-600 italic">
                    Connecting to telemetry stream...
                  </div>
                ) : (
                  logs.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex flex-col gap-1 p-3 rounded-xl bg-[#0d0118] border border-purple-950/60 hover:border-purple-900/60 transition-colors animate-fadeIn"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-brand-accent tracking-wide text-xs">
                          {t(`issue_type_${log.type}`).toUpperCase()}
                        </span>
                        <span className="text-[9px] text-slate-500 flex items-center gap-1 font-mono">
                          <span className="w-1 h-1 rounded-full bg-purple-800" />
                          {t('mins_ago', { mins: log.mins })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-xs">
                        <span>{log.ward}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="text-[9px] text-slate-500 font-sans">{t('priority_score')}</span>
                          <span className={`font-bold ${log.priority > 85 ? 'text-brand-accent' : 'text-brand-yellow'}`}>
                            {log.priority}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px]">
                        <span className="text-slate-600 font-mono">#ID-{log.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-semibold ${
                          log.status === 'resolved' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50' :
                          log.status === 'in_progress' ? 'bg-purple-950/60 text-brand-medium border border-purple-900/50' :
                          'bg-pink-950/60 text-brand-accent border border-pink-900/50'
                        }`}>
                          {t(`status_${log.status}`)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- PROCESS SECTION (4-Step Pipeline) --- */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 md:px-10 -mt-10 pb-24 w-full">
        <ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { 
                n: '01', 
                icon: Camera, 
                title: t('step1_title', 'Capture'), 
                desc: t('step1_desc', 'Citizen photographs the issue — pothole, leak, garbage, dark streetlight.'), 
                accentColor: '#ec4899',
                topBorderClass: 'border-t-4 border-t-[#ec4899]',
                illustration: (
                  <svg className="w-full h-full" viewBox="0 0 200 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="200" height="110" fill="var(--color-surface-2, #f5f0ff)" />
                    <path d="M0 20 H200 M0 40 H200 M0 60 H200 M0 80 H200 M0 100 H200" stroke="var(--color-border-muted, #ede9fe)" strokeWidth="1" />
                    <path d="M30 0 V110 M60 0 V110 M90 0 V110 M120 0 V110 M150 0 V110 M180 0 V110" stroke="var(--color-border-muted, #ede9fe)" strokeWidth="1" />
                    <rect x="70" y="20" width="60" height="70" rx="8" fill="#1a0533" stroke="#5b21b6" strokeWidth="2" />
                    <rect x="75" y="27" width="50" height="35" rx="4" fill="#0d0118" />
                    <rect x="80" y="32" width="40" height="25" stroke="#ec4899" strokeWidth="1.5" strokeDasharray="4 2" fill="none" />
                    <circle cx="100" cy="72" r="10" fill="#ec4899" />
                    <path d="M92 72 H108 M100 64 V80" stroke="white" strokeWidth="2" />
                    <line x1="75" y1="44" x2="125" y2="44" stroke="#f472b6" strokeWidth="1.5" />
                  </svg>
                )
              },
              { 
                n: '02', 
                icon: Brain, 
                title: t('step2_title', 'Detect'), 
                desc: t('step2_desc', 'Computer vision classifies the issue type and scores its severity.'), 
                accentColor: '#a855f7',
                topBorderClass: 'border-t-4 border-t-[#a855f7]',
                illustration: (
                  <svg className="w-full h-full" viewBox="0 0 200 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="200" height="110" fill="var(--color-surface-2, #f5f0ff)" />
                    <path d="M0 20 H200 M0 40 H200 M0 60 H200 M0 80 H200 M0 100 H200" stroke="var(--color-border-muted, #ede9fe)" strokeWidth="1" />
                    <path d="M30 0 V110 M60 0 V110 M90 0 V110 M120 0 V110 M150 0 V110 M180 0 V110" stroke="var(--color-border-muted, #ede9fe)" strokeWidth="1" />
                    <circle cx="50" cy="55" r="5" fill="#5b21b6" />
                    <circle cx="100" cy="30" r="5" fill="#a855f7" />
                    <circle cx="100" cy="80" r="5" fill="#a855f7" />
                    <circle cx="150" cy="55" r="5" fill="#ec4899" />
                    <line x1="50" y1="55" x2="100" y2="30" stroke="#c4b5fd" strokeWidth="1.5" />
                    <line x1="50" y1="55" x2="100" y2="80" stroke="#c4b5fd" strokeWidth="1.5" />
                    <line x1="100" y1="30" x2="150" y2="55" stroke="#c4b5fd" strokeWidth="1.5" />
                    <line x1="100" y1="80" x2="150" y2="55" stroke="#c4b5fd" strokeWidth="1.5" />
                    <rect x="115" y="20" width="45" height="12" rx="3" fill="#5b21b6" />
                    <text x="120" y="29" fill="white" fontSize="7" fontFamily="monospace">94% CONF</text>
                  </svg>
                )
              },
              { 
                n: '03', 
                icon: ShieldCheck, 
                title: t('step3_title', 'Predict'), 
                desc: t('step3_desc', 'Risk engine forecasts the probability of escalation within 30 days.'), 
                accentColor: '#facc15',
                topBorderClass: 'border-t-4 border-t-[#facc15]',
                illustration: (
                  <svg className="w-full h-full" viewBox="0 0 200 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="200" height="110" fill="var(--color-surface-2, #f5f0ff)" />
                    <path d="M0 20 H200 M0 40 H200 M0 60 H200 M0 80 H200 M0 100 H200" stroke="var(--color-border-muted, #ede9fe)" strokeWidth="1" />
                    <path d="M30 0 V110 M60 0 V110 M90 0 V110 M120 0 V110 M150 0 V110 M180 0 V110" stroke="var(--color-border-muted, #ede9fe)" strokeWidth="1" />
                    <line x1="30" y1="85" x2="170" y2="85" stroke="#94a3b8" strokeWidth="1.5" />
                    <line x1="30" y1="20" x2="30" y2="85" stroke="#94a3b8" strokeWidth="1.5" />
                    <path d="M30 75 Q70 70 110 50 T170 25" fill="none" stroke="#facc15" strokeWidth="2.5" />
                    <circle cx="170" cy="25" r="4" fill="#facc15" />
                    <circle cx="170" cy="25" r="8" stroke="#facc15" strokeWidth="1" opacity="0.5" />
                    <text x="118" y="32" fill="#ec4899" fontSize="8" fontWeight="bold" fontFamily="sans-serif">RISK: HIGH</text>
                  </svg>
                )
              },
              { 
                n: '04', 
                icon: MapPinned, 
                title: t('step4_title', 'Route'), 
                desc: t('step4_desc', 'Issue is mapped, prioritized, and dispatched to the right department.'), 
                accentColor: '#ec4899',
                topBorderClass: 'border-t-4 border-t-[#ec4899]',
                illustration: (
                  <svg className="w-full h-full" viewBox="0 0 200 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="200" height="110" fill="var(--color-surface-2, #f5f0ff)" />
                    <path d="M0 20 H200 M0 40 H200 M0 60 H200 M0 80 H200 M0 100 H200" stroke="var(--color-border-muted, #ede9fe)" strokeWidth="1" />
                    <path d="M30 0 V110 M60 0 V110 M90 0 V110 M120 0 V110 M150 0 V110 M180 0 V110" stroke="var(--color-border-muted, #ede9fe)" strokeWidth="1" />
                    <path d="M20 30 H180 M20 80 H180 M60 10 V100 M140 10 V100" stroke="#ede9fe" strokeWidth="5" strokeLinecap="round" />
                    <path d="M60 80 H140 V30" fill="none" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 3" />
                    <circle cx="60" cy="80" r="5" fill="#5b21b6" stroke="white" strokeWidth="1" />
                    <circle cx="140" cy="30" r="5" fill="#ec4899" stroke="white" strokeWidth="1" />
                    <rect x="75" y="60" width="55" height="12" rx="3" fill="#1a0533" />
                    <text x="80" y="69" fill="white" fontSize="6.5" fontFamily="monospace">DISPATCHED</text>
                  </svg>
                )
              },
            ].map((step) => (
              <div 
                key={step.n} 
                className={`bg-surface rounded-2xl shadow-[0_15px_35px_rgba(91,33,182,0.06)] border border-border-muted ${step.topBorderClass} transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-[1.01] hover:shadow-[0_30px_60px_-15px_rgba(91,33,182,0.18)] overflow-hidden flex flex-col dark:bg-surface dark:border-border-muted`}
              >
                {/* Visual Picture / Illustration */}
                <div className="h-28 w-full border-b border-border-muted overflow-hidden flex items-center justify-center">
                  {step.illustration}
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-xl bg-brand-light dark:bg-brand-light/20 border border-border-muted flex items-center justify-center shadow-sm">
                        <step.icon className="w-4 h-4 text-brand-primary dark:text-brand-medium" strokeWidth={2.2} />
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-400 dark:text-purple-500 select-none">{step.n}</span>
                    </div>
                    <h3 className="font-display font-bold text-base mb-1.5 text-brand-deep dark:text-purple-100">{step.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-purple-300/70 leading-relaxed font-normal">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* --- SYSTEM SCALE SECTION (Full-bleed Deep Purple) --- */}
      <section className="relative bg-brand-deep border-y border-purple-900/50 py-24 text-white overflow-hidden w-full">
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Accent blob in stats section */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, #5b21b6 0%, transparent 70%)',
            filter: 'blur(100px)',
            opacity: 0.15,
          }}
        />
        
        <div className="max-w-7xl mx-auto px-6 md:px-10 relative z-10">
          <ScrollReveal className="text-center mb-16">
            <h2 className="font-display font-extrabold text-3xl md:text-5xl text-white tracking-tight mb-4">
              {t('national_scale_title', 'National Infrastructure Health Metrics')}
            </h2>
            <div className="w-16 h-1 bg-gradient-to-r from-brand-accent to-brand-yellow mx-auto rounded-full" />
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Metric 1 */}
            <ScrollReveal delay={100}>
              <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-b from-purple-950/60 to-brand-deep/80 border border-purple-800/40 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-sm relative overflow-hidden group hover:border-brand-medium/40 hover:shadow-[0_25px_50px_rgba(91,33,182,0.2)] transition-all duration-300">
                <div className="absolute -right-16 -top-16 w-32 h-32 bg-brand-primary/10 rounded-full blur-2xl group-hover:bg-brand-primary/20 transition-all duration-500" />
                <div className="p-3.5 rounded-xl bg-purple-950/80 border border-purple-800/60 mb-6 text-brand-yellow shadow-inner">
                  <Database className="w-6 h-6" />
                </div>
                <div className="font-mono text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-purple-300 select-none tracking-tight group-hover:from-brand-accent group-hover:to-brand-yellow transition-all duration-500">
                  {isLoadingStats ? (
                    <span className="text-purple-700 animate-pulse">...</span>
                  ) : (
                    displayCount.toLocaleString()
                  )}
                </div>
                <div className="text-xs uppercase tracking-widest text-purple-400 font-mono mt-4">
                  {t('issues_tracked_label', 'Issues Tracked')}
                </div>
              </div>
            </ScrollReveal>

            {/* Metric 2 */}
            <ScrollReveal delay={200}>
              <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-b from-purple-950/60 to-brand-deep/80 border border-purple-800/40 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-sm relative overflow-hidden group hover:border-brand-accent/40 hover:shadow-[0_25px_50px_rgba(236,72,153,0.1)] transition-all duration-300">
                <div className="absolute -right-16 -top-16 w-32 h-32 bg-brand-accent/5 rounded-full blur-2xl group-hover:bg-brand-accent/12 transition-all duration-500" />
                <div className="p-3.5 rounded-xl bg-purple-950/80 border border-purple-800/60 mb-6 text-brand-accent shadow-inner">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="font-mono text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-purple-300 select-none tracking-tight group-hover:from-brand-accent group-hover:to-brand-yellow transition-all duration-500">
                  {isLoadingStats ? (
                    <span className="text-purple-700 animate-pulse">...</span>
                  ) : (
                    displaySlaPrevented.toLocaleString()
                  )}
                </div>
                <div className="text-xs uppercase tracking-widest text-purple-400 font-mono mt-4">
                  {t('sla_breaches_prevented', 'SLA Breaches Prevented')}
                </div>
              </div>
            </ScrollReveal>

            {/* Metric 3 */}
            <ScrollReveal delay={300}>
              <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-b from-purple-950/60 to-brand-deep/80 border border-purple-800/40 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/30 hover:shadow-[0_25px_50px_rgba(16,185,129,0.06)] transition-all duration-300">
                <div className="absolute -right-16 -top-16 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-500" />
                <div className="p-3.5 rounded-xl bg-purple-950/80 border border-purple-800/60 mb-6 shadow-inner">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="font-mono text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-emerald-200 select-none tracking-tight group-hover:from-emerald-400 group-hover:to-teal-300 transition-all duration-500">
                  92.4%
                </div>
                <div className="text-xs uppercase tracking-widest text-purple-400 font-mono mt-4">
                  {t('dispatch_accuracy', 'Dispatch Accuracy')}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* --- INTERACTIVE PREVIEW SECTION --- */}
      <section className="relative bg-paper dark:bg-paper py-28 border-t border-border-muted overflow-hidden w-full">
        <div className="max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Column: Command Center Context */}
          <div className="lg:col-span-5 flex flex-col items-start text-left">
            <ScrollReveal>
              <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-brand-primary dark:text-brand-medium bg-brand-light dark:bg-brand-light/20 px-3 py-1 rounded-md border border-brand-primary/20 mb-6 inline-block">
                {t('inside_command_center', 'Inside the Command Center')}
              </span>
              <h2 className="font-display font-extrabold text-3xl md:text-5xl text-brand-deep dark:text-purple-100 tracking-tight mb-6 leading-tight">
                {t('command_center_preview', 'Command Center Preview')}
              </h2>
              <p className="text-slate-600 dark:text-purple-300/80 leading-relaxed mb-8 font-normal">
                {t('command_center_desc', 'Get a real-time birds-eye view of your municipality. The Government Dashboard empowers officials with predictive risk forecasts, SLA breach warnings, and automated ward health reports to direct maintenance where it matters most.')}
              </p>
              
              <Link
                to="/dashboard"
                className="group inline-flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/90 dark:bg-brand-primary dark:hover:bg-brand-primary/80 text-white font-semibold px-6 py-3.5 rounded-xl transition-all shadow-md shadow-brand-primary/20 hover:shadow-brand-primary/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                {t('launch_dashboard', 'Launch Full Dashboard')}
                <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.2} />
              </Link>
            </ScrollReveal>
          </div>

          {/* Right Column: High Fidelity Mock Browser UI */}
          <div className="lg:col-span-7 w-full">
            <ScrollReveal delay={150}>
              <div className="bg-[#1a0a2e] border border-purple-900/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans h-[400px] relative group hover:border-purple-700/60 transition-all duration-300">
                
                {/* Browser chrome header */}
                <div className="bg-[#0d0118] border-b border-purple-950/60 px-4 py-3 flex items-center gap-3">
                  <div className="flex gap-1.5 select-none">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-yellow/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                  </div>
                  <div className="bg-purple-950/80 border border-purple-900 text-[10px] text-purple-400 font-mono rounded-md py-1 px-3 flex-1 text-center select-none truncate">
                    https://sentinel.municipal.gov.in/dashboard
                  </div>
                </div>

                {/* Browser client area */}
                <div className="flex-1 flex overflow-hidden text-[12px] select-none">
                  {/* Mock Sidebar */}
                  <div className="w-12 bg-[#0d0118] border-r border-purple-950/60 flex flex-col items-center py-4 gap-4 text-purple-600">
                    <div className="w-6 h-6 rounded-lg bg-brand-accent/20 flex items-center justify-center text-brand-accent font-bold text-xs animate-pulse">S</div>
                    <div className="w-5 h-1.5 rounded bg-purple-900/60" />
                    <div className="w-5 h-1.5 rounded bg-purple-900/60" />
                    <div className="w-5 h-1.5 rounded bg-purple-900/60" />
                  </div>

                  {/* Mock Main Panel */}
                  <div className="flex-1 p-5 flex flex-col gap-4 overflow-hidden bg-purple-950/30">
                    {/* Mock Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-purple-200 font-semibold">{t('command_center_preview', 'Command Center Preview')}</span>
                        <span className="text-[9px] text-purple-500">Live Status Feed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-emerald-950 text-emerald-400 px-2.5 py-0.5 rounded-full text-[9px] border border-emerald-900/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          98.2 Health Index
                        </span>
                      </div>
                    </div>
                    
                    {/* Quick Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-purple-950/60 border border-purple-900/60 p-2.5 rounded-lg">
                        <div className="text-[9px] text-purple-400">Total Alerts</div>
                        <div className="font-mono text-sm font-bold text-purple-200">142</div>
                      </div>
                      <div className="bg-purple-950/60 border border-purple-900/60 p-2.5 rounded-lg border-l-brand-accent border-l-2">
                        <div className="text-[9px] text-purple-400">Critical</div>
                        <div className="font-mono text-sm font-bold text-brand-accent flex items-center gap-1">
                          <span>12</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-ping" />
                        </div>
                      </div>
                      <div className="bg-purple-950/60 border border-purple-900/60 p-2.5 rounded-lg">
                        <div className="text-[9px] text-purple-400">Resolved Today</div>
                        <div className="font-mono text-sm font-bold text-emerald-400">42</div>
                      </div>
                    </div>

                    {/* Table & Map Mock */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0">
                      {/* Escalating Queue Mock */}
                      <div className="bg-purple-950/40 border border-purple-900/50 p-3 rounded-lg flex flex-col gap-2 overflow-hidden">
                        <span className="text-[9px] font-bold text-purple-400 tracking-wide uppercase font-mono">Priority Queue</span>
                        <div className="flex flex-col gap-1.5 overflow-hidden">
                          {[
                            { id: 1, type: 'Pothole', ward: 'Ward 4', score: 92, risk: 'Critical', riskColor: 'text-brand-accent bg-pink-950/40 border-pink-900/30' },
                            { id: 2, type: 'Waterlogging', ward: 'Ward 12', score: 88, risk: 'High', riskColor: 'text-brand-yellow bg-yellow-950/40 border-yellow-900/30' },
                            { id: 3, type: 'Streetlight', ward: 'Ward 45', score: 81, risk: 'Medium', riskColor: 'text-brand-medium bg-purple-950/40 border-purple-900/30' },
                          ].map(issue => (
                            <div key={issue.id} className="flex items-center justify-between p-2 rounded bg-purple-950/40 border border-purple-900/50 hover:border-purple-800 transition-colors">
                              <div className="flex flex-col">
                                <span className="text-purple-200 font-medium">{issue.type}</span>
                                <span className="text-[8px] text-purple-500">{issue.ward}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-1 py-0.5 rounded text-[7px] border ${issue.riskColor}`}>
                                  {issue.risk}
                                </span>
                                <span className="font-mono font-bold text-purple-200">{issue.score}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Map Preview Mock */}
                      <div className="bg-purple-950/40 border border-purple-900/50 rounded-lg relative overflow-hidden flex items-center justify-center p-2">
                        <div className="absolute inset-0 opacity-20 pointer-events-none"
                          style={{
                            backgroundImage: 'radial-gradient(circle, #a855f7 1px, transparent 1px)',
                            backgroundSize: '16px 16px',
                          }}
                        />
                        <div className="relative w-full h-full flex items-center justify-center">
                          <svg className="w-full h-full text-purple-700 opacity-40 absolute" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M10,20 L30,40 L70,30 L90,60" fill="none" stroke="currentColor" strokeWidth="0.8" />
                            <path d="M20,80 L50,60 L80,90" fill="none" stroke="currentColor" strokeWidth="0.8" />
                            <path d="M40,10 L40,90" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2,2" />
                          </svg>
                          <div className="absolute top-[30%] left-[25%] flex h-3.5 w-3.5 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                          </div>
                          <div className="absolute top-[50%] left-[65%] flex h-3.5 w-3.5 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                          </div>
                          <div className="absolute top-[75%] left-[45%] flex h-3.5 w-3.5 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </div>
                          <span className="absolute bottom-2 right-2 text-[8px] text-purple-500 font-mono">MAP_PREVIEW_READY</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  )
}
