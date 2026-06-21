import { Link } from 'react-router-dom'
import { ArrowRight, Camera, Brain, MapPinned, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Landing() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-hidden relative">
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
            {t('app_title', 'Bharat Infra Sentinel')} <span className="text-sentinel-400">AI</span>
          </span>
        </div>
        <span className="hidden md:inline-block text-xs font-mono text-slate-500 tracking-wider uppercase border border-slate-200 rounded-full px-3 py-1.5">
          Bharat Academix CodeQuest 2026
        </span>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[13px] font-mono uppercase tracking-wider text-signal-400 border border-signal-500/30 bg-signal-500/10 rounded-full px-3 py-1 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-400 animate-pulse" />
            {t('predictive_civic_governance', 'Predictive Civic Governance')}
          </div>

          <h1 className="font-display font-semibold text-5xl md:text-7xl leading-[1.02] tracking-tight mb-6">
            {t('hero_title_1', 'Cities decay')}
            <br />
            <span className="text-slate-500">{t('hero_title_2', 'in ways the eye')}</span>
            <br />
            {t('hero_title_3', "can't see yet.")}
          </h1>

          <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-xl mb-10 font-light">
            {t('hero_subtitle', 'Bharat Infra Sentinel AI turns citizen photos into predictions — telling municipalities which road, drain, or streetlight fails next, before it does.')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/report"
              className="group inline-flex items-center justify-center gap-2 bg-signal-500 hover:bg-signal-600 text-white font-medium px-6 py-3.5 rounded-lg transition-colors"
            >
              <Camera className="w-4 h-4" />
              {t('report_issue', 'Report an Issue')}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-500 hover:bg-white text-slate-900 font-medium px-6 py-3.5 rounded-lg transition-colors"
            >
              <MapPinned className="w-4 h-4" />
              {t('open_dashboard', 'Open Government Dashboard')}
            </Link>
          </div>
        </div>

        {/* Process strip — order carries real meaning here (a pipeline), so numbering is justified */}
        <div className="mt-24 md:mt-32 grid grid-cols-1 md:grid-cols-4 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-100">
          {[
            { n: '01', icon: Camera, title: t('step1_title', 'Capture'), desc: t('step1_desc', 'Citizen photographs the issue — pothole, leak, garbage, dark streetlight.') },
            { n: '02', icon: Brain, title: t('step2_title', 'Detect'), desc: t('step2_desc', 'Computer vision classifies the issue type and scores its severity.') },
            { n: '03', icon: ShieldCheck, title: t('step3_title', 'Predict'), desc: t('step3_desc', 'Risk engine forecasts the probability of escalation within 30 days.') },
            { n: '04', icon: MapPinned, title: t('step4_title', 'Route'), desc: t('step4_desc', 'Issue is mapped, prioritized, and dispatched to the right department.') },
          ].map((step) => (
            <div key={step.n} className="bg-slate-50 p-6 md:p-7">
              <div className="flex items-center justify-between mb-5">
                <step.icon className="w-5 h-5 text-sentinel-400" strokeWidth={1.8} />
                <span className="font-mono text-xs text-slate-500">{step.n}</span>
              </div>
              <h3 className="font-display font-medium text-base mb-1.5">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-xs text-slate-500 font-mono">
          MVP build · Team Cod-X-Titans · Hybrid CV pipeline (pretrained detection + tuned heuristics) · Rule-based predictive risk engine
        </p>
      </main>
    </div>
  )
}
