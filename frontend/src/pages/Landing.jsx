import { Link } from 'react-router-dom'
import { ArrowRight, Camera, Brain, MapPinned, ShieldCheck } from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink-950 text-white overflow-hidden relative">
      {/* Ambient grid backdrop — evokes GIS/satellite mapping without being literal */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-signal-500/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sentinel-500/10 rounded-full blur-[160px] pointer-events-none" />

      <header className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-sentinel-400" strokeWidth={2.2} />
          <span className="font-display font-semibold text-lg tracking-tight">
            Bharat Infra Sentinel <span className="text-sentinel-400">AI</span>
          </span>
        </div>
        <span className="hidden md:inline-block text-xs font-mono text-ink-600 tracking-wider uppercase border border-ink-700 rounded-full px-3 py-1.5">
          Bharat Academix CodeQuest 2026
        </span>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[13px] font-mono uppercase tracking-wider text-signal-400 border border-signal-500/30 bg-signal-500/10 rounded-full px-3 py-1 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-400 animate-pulse" />
            Predictive Civic Governance
          </div>

          <h1 className="font-display font-semibold text-5xl md:text-7xl leading-[1.02] tracking-tight mb-6">
            Cities decay
            <br />
            <span className="text-ink-600">in ways the eye</span>
            <br />
            can't see yet.
          </h1>

          <p className="text-lg md:text-xl text-ink-600 leading-relaxed max-w-xl mb-10 font-light">
            Bharat Infra Sentinel AI turns citizen photos into predictions —
            telling municipalities which road, drain, or streetlight fails
            next, before it does.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/report"
              className="group inline-flex items-center justify-center gap-2 bg-signal-500 hover:bg-signal-600 text-white font-medium px-6 py-3.5 rounded-lg transition-colors"
            >
              <Camera className="w-4 h-4" />
              Report an Issue
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 border border-ink-700 hover:border-ink-600 hover:bg-ink-900 text-white font-medium px-6 py-3.5 rounded-lg transition-colors"
            >
              <MapPinned className="w-4 h-4" />
              Open Government Dashboard
            </Link>
          </div>
        </div>

        {/* Process strip — order carries real meaning here (a pipeline), so numbering is justified */}
        <div className="mt-24 md:mt-32 grid grid-cols-1 md:grid-cols-4 gap-px bg-ink-800 rounded-2xl overflow-hidden border border-ink-800">
          {[
            { n: '01', icon: Camera, title: 'Capture', desc: 'Citizen photographs the issue — pothole, leak, garbage, dark streetlight.' },
            { n: '02', icon: Brain, title: 'Detect', desc: 'Computer vision classifies the issue type and scores its severity.' },
            { n: '03', icon: ShieldCheck, title: 'Predict', desc: 'Risk engine forecasts the probability of escalation within 30 days.' },
            { n: '04', icon: MapPinned, title: 'Route', desc: 'Issue is mapped, prioritized, and dispatched to the right department.' },
          ].map((step) => (
            <div key={step.n} className="bg-ink-950 p-6 md:p-7">
              <div className="flex items-center justify-between mb-5">
                <step.icon className="w-5 h-5 text-sentinel-400" strokeWidth={1.8} />
                <span className="font-mono text-xs text-ink-600">{step.n}</span>
              </div>
              <h3 className="font-display font-medium text-base mb-1.5">{step.title}</h3>
              <p className="text-sm text-ink-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-xs text-ink-600 font-mono">
          MVP build · Team Cod-X-Titans · Hybrid CV pipeline (pretrained detection + tuned heuristics) · Rule-based predictive risk engine
        </p>
      </main>
    </div>
  )
}
