import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, ArrowLeft, RefreshCw, AlertOctagon, Clock, CheckCircle2,
  TrendingUp, MapPin, Users, Download, X, AlertTriangle, Zap, Trophy
} from 'lucide-react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, AreaChart, Area, CartesianGrid, Legend
} from 'recharts'
import { api } from '../api'
import { ISSUE_TYPE_META, SEVERITY_META, STATUS_META, timeAgo } from '../constants'
import LanguageSwitcher from '../components/LanguageSwitcher'
import DarkModeToggle from '../components/DarkModeToggle'
import { useTranslation } from 'react-i18next'

const INDIA_CENTER = [22.5, 80]

// Phase B map status colors: Red=Reported, Blue=In Progress, Green=Resolved
const MAP_STATUS_COLORS = {
  reported:    '#dc2626',  // clear accessible red
  in_progress: '#2563eb',  // clear accessible blue
  resolved:    '#16a34a',  // clear accessible green
}

// ---------------------------------------------------------------------------
// Toast system
// ---------------------------------------------------------------------------
function useToast() {
  const [toasts, setToasts] = useState([])
  const add = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])
  return { toasts, add }
}

function ToastContainer({ toasts }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium backdrop-blur-sm border transition-all pointer-events-auto
            ${t.type === 'success' ? 'bg-brand-primary/90 border-brand-medium/30 text-white' : ''}
            ${t.type === 'error' ? 'bg-red-500/90 border-red-400/30 text-white' : ''}
            ${t.type === 'info' ? 'bg-surface border-border-muted text-brand-deep dark:text-purple-100' : ''}
          `}
        >
          {t.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {t.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
          {t.type === 'info' && <Zap className="w-4 h-4 shrink-0" />}
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-brand-light/60 dark:bg-purple-900/30 rounded-lg ${className}`} />
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const [issues, setIssues] = useState([])
  const [stats, setStats] = useState(null)
  const [wardHealth, setWardHealth] = useState([])
  const [contractors, setContractors] = useState([])
  const [forecast, setForecast] = useState([])
  const [forecastDays, setForecastDays] = useState(90)
  const [forecastResolveN, setForecastResolveN] = useState(10)
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const { t, i18n } = useTranslation()
  const { toasts, add: addToast } = useToast()

  // New Department and Activity states
  const [deptStats, setDeptStats] = useState([])
  const [activities, setActivities] = useState([])

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [issuesData, statsData, wardData, contractorsData, forecastData, deptData, activityData] = await Promise.all([
        api.listIssues({ sort_by_priority: true, search: searchQuery, lang: i18n.language }),
        api.dashboardStats(),
        api.wardHealth(),
        api.listContractors(),
        api.dashboardForecast(forecastDays, forecastResolveN),
        api.getDepartmentStats(),
        api.getActivityLog(),
      ])
      setIssues(issuesData)
      setStats(statsData)
      setWardHealth(wardData)
      setContractors(contractorsData)
      setForecast(forecastData)
      setDeptStats(deptData || [])
      setActivities(activityData || [])
    } catch (err) {
      console.error(err)
      addToast('Failed to load data. Check backend connection.', 'error')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecastDays, forecastResolveN, searchQuery, i18n.language])

  useEffect(() => { loadData() }, [loadData])

  async function handleStatusChange(id, newStatus, newContractor, afterImageFile) {
    try {
      await api.updateStatus(id, newStatus, newContractor, afterImageFile)
      const label = STATUS_META[newStatus]?.label || newStatus
      addToast(`Issue #${id} marked as ${label}.`, 'success')
      setSelectedIssue(null)
      await loadData(true)
    } catch {
      addToast('Status update failed. Please try again.', 'error')
    }
  }

  const filteredIssues = filterStatus === 'all'
    ? issues
    : issues.filter(i => i.status === filterStatus)

  // ── Breach count badge ────────────────────────────────────────────────────
  const slaBreaches = issues.filter(i => i.sla_breach && i.status !== 'resolved').length

  return (
    <div className="min-h-screen bg-paper text-brand-deep dark:text-purple-100 transition-colors duration-300">
      <ToastContainer toasts={toasts} />

      <TopBar
        onRefresh={() => loadData()}
        loading={loading}
        slaBreaches={slaBreaches}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <div className="max-w-[1600px] mx-auto px-4 md:px-5 py-5 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        {/* ── Left column ── */}
        <div className="space-y-5 min-w-0">
          <StatsRow stats={stats} loading={loading} />

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
            <div className="flex flex-col gap-5">
              <MapPanel issues={issues} onSelect={setSelectedIssue} loading={loading} />
              <ForecastPanel
                data={forecast}
                days={forecastDays}
                setDays={setForecastDays}
                resolveN={forecastResolveN}
                setResolveN={setForecastResolveN}
                loading={loading}
              />
            </div>
            <div className="flex flex-col gap-5">
              <ChartsPanel stats={stats} wardHealth={wardHealth} loading={loading} />
              <ContractorsPanel contractors={contractors} loading={loading} />
              <DepartmentsPanel departments={deptStats} loading={loading} />
            </div>
          </div>
        </div>

        {/* ── Right column: priority queue & activity log ── */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-[84px] lg:max-h-[calc(100vh-104px)]">
          <PriorityQueue
            issues={filteredIssues}
            filterStatus={filterStatus}
            onFilterChange={setFilterStatus}
            onSelect={setSelectedIssue}
            onStatusChange={handleStatusChange}
            loading={loading}
            slaBreaches={slaBreaches}
          />
          <ActivityLogPanel activities={activities} loading={loading} />
        </div>
      </div>

      {selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          contractors={contractors}
          onClose={() => setSelectedIssue(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------
function TopBar({ onRefresh, loading, slaBreaches, searchQuery, setSearchQuery }) {
  const { t } = useTranslation()
  return (
    <header className="border-b border-border-muted bg-surface/95 dark:bg-surface/95 backdrop-blur sticky top-0 z-30 transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto px-4 md:px-5 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="text-slate-500 dark:text-purple-400 hover:text-brand-primary dark:hover:text-brand-medium transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheck className="w-5 h-5 text-brand-primary dark:text-brand-medium shrink-0" />
            <span className="font-display font-semibold tracking-tight truncate text-brand-deep dark:text-purple-100">Municipal Command Centre</span>
          </div>
          <span className="hidden md:inline-block text-xs font-mono text-slate-500 dark:text-purple-400 border border-border-muted rounded-full px-2.5 py-1 shrink-0 bg-surface-2 dark:bg-surface-2">
            {t('national_view', 'National View')}
          </span>
          {slaBreaches > 0 && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold bg-red-500/15 border border-red-500/25 text-red-400 rounded-full px-2.5 py-1 shrink-0 animate-pulse">
              <AlertOctagon className="w-3.5 h-3.5" /> {slaBreaches} {slaBreaches > 1 ? t('sla_breaches_plural', 'SLA breaches') : t('sla_breach_singular', 'SLA breach')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="text"
            placeholder={t('search_issues', 'Search issues...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onRefresh() }}
            className="hidden sm:block text-xs border border-border-muted rounded-lg px-3 py-2 outline-none focus:border-brand-medium bg-surface dark:bg-surface text-brand-deep dark:text-purple-100 placeholder-slate-400 dark:placeholder-purple-500"
          />
          <DarkModeToggle variant="dark" />
          <LanguageSwitcher />
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 text-xs font-medium bg-surface-2 dark:bg-surface-2 hover:bg-brand-light dark:hover:bg-brand-light/20 rounded-lg px-3 py-2 transition-colors border border-border-muted text-brand-deep dark:text-purple-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('refresh', 'Refresh')}</span>
          </button>
        </div>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Stats row
// ---------------------------------------------------------------------------
function StatsRow({ stats, loading }) {
  const { t } = useTranslation()
  if (loading && !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface dark:bg-surface border border-border-muted rounded-xl p-5">
            <Skeleton className="w-5 h-5 mb-4" />
            <Skeleton className="w-16 h-8 mb-2" />
            <Skeleton className="w-20 h-3" />
          </div>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    { label: t('reports_count', 'Reports'), value: stats.total_issues, icon: MapPin, accent: 'text-brand-primary dark:text-brand-medium' },
    { label: t('critical_label', 'Critical'), value: stats.critical_count, icon: AlertOctagon, accent: 'text-red-500' },
    { label: t('in_progress', 'In Progress'), value: stats.in_progress_issues, icon: Clock, accent: 'text-blue-500' },
    { label: t('resolved', 'Resolved'), value: stats.resolved_issues, icon: CheckCircle2, accent: 'text-emerald-500' },
    { label: t('failure_prob', 'Avg. Failure Risk'), value: `${stats.avg_failure_probability}%`, icon: TrendingUp, accent: 'text-brand-accent' },
    { label: t('ward_health', 'Health Index'), value: `${stats.health_index}`, icon: ShieldCheck, accent: healthAccent(stats.health_index) },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-surface dark:bg-surface backdrop-blur border border-border-muted rounded-xl p-5 relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:shadow-brand-primary/10 dark:hover:shadow-brand-medium/10">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-light/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <c.icon className={`w-5 h-5 ${c.accent} opacity-80`} strokeWidth={2} />
          </div>
          <div className="font-mono font-semibold text-3xl tracking-tighter mb-1 text-brand-deep dark:text-purple-100">{c.value}</div>
          <div className="text-xs text-slate-500 dark:text-purple-400 font-medium tracking-wide uppercase">{c.label}</div>
        </div>
      ))}
    </div>
  )
}

function healthAccent(v) {
  if (v >= 70) return 'text-emerald-500'
  if (v >= 40) return 'text-brand-yellow'
  return 'text-red-500'
}

// ---------------------------------------------------------------------------
// Map panel — Phase B: Red=Reported, Blue=In Progress, Green=Resolved
// ---------------------------------------------------------------------------
function MapPanel({ issues, onSelect, loading }) {
  const { t } = useTranslation()
  const mapRef = useRef(null)
  
  const createClusterCustomIcon = function (cluster) {
    const count = cluster.getChildCount()
    const markers = cluster.getAllChildMarkers()
    
    // Count by status using the issueStatus option set on each marker
    let counts = { reported: 0, in_progress: 0, resolved: 0 }
    markers.forEach(m => {
      const status = m.options?.issueStatus || (() => {
        const c = m.options?.fillColor
        if (c === MAP_STATUS_COLORS.reported)    return 'reported'
        if (c === MAP_STATUS_COLORS.in_progress) return 'in_progress'
        if (c === MAP_STATUS_COLORS.resolved)    return 'resolved'
        return null
      })()
      if (status === 'reported')    counts.reported++
      else if (status === 'in_progress') counts.in_progress++
      else if (status === 'resolved')    counts.resolved++
    })

    // Dominant status drives cluster color
    let dominantStatus = 'reported'
    let max = counts.reported
    if (counts.in_progress > max) { dominantStatus = 'in_progress'; max = counts.in_progress }
    if (counts.resolved > max)    { dominantStatus = 'resolved';    max = counts.resolved }

    // Phase B cluster colors — Red/Blue/Green
    let bgColor = 'bg-slate-400'
    let ringColor = 'border-slate-100'
    if (dominantStatus === 'reported')    { bgColor = 'bg-red-600';   ringColor = 'border-red-100' }
    if (dominantStatus === 'in_progress') { bgColor = 'bg-blue-600';  ringColor = 'border-blue-100' }
    if (dominantStatus === 'resolved')    { bgColor = 'bg-emerald-600'; ringColor = 'border-emerald-100' }

    // Dynamic sizing
    let size = 32
    if (count >= 100)  size = 40
    if (count >= 1000) size = 48

    return L.divIcon({
      html: `
        <div class="rounded-full shadow-lg border-2 ${ringColor} ${bgColor} text-white flex items-center justify-center font-bold" style="width: ${size}px; height: ${size}px; font-size: ${size > 40 ? '13px' : '11px'};">
          ${count.toLocaleString()}
        </div>
      `,
      className: 'custom-cluster-icon',
      iconSize: L.point(size, size, true),
    })
  }

  return (
    <div className="bg-surface dark:bg-surface border border-border-muted rounded-xl overflow-hidden transition-colors duration-300">
      <div className="px-5 py-3.5 border-b border-border-muted flex items-center justify-between">
        <h2 className="font-display font-medium text-sm text-brand-deep dark:text-purple-100">{t('live_issue_map', 'Live Issue Map')}</h2>
        <span className="text-xs text-slate-500 dark:text-purple-400">{issues.length} {t('reports_count_lowercase', 'reports')}</span>
      </div>
      <div className="h-[380px] md:h-[420px] relative">
        {/* Phase B Legend — Red/Blue/Green */}
        <div className="absolute bottom-4 right-4 z-[400] bg-white/95 dark:bg-surface/95 backdrop-blur border border-border-muted rounded-lg shadow-sm p-3 text-xs flex flex-col gap-2 pointer-events-auto">
          <div className="font-semibold text-slate-700 dark:text-purple-200 mb-0.5">{t('issue_status', 'Issue Status')}</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span className="text-slate-600 dark:text-purple-300">{t('status_reported', 'Open (Reported)')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <span className="text-slate-600 dark:text-purple-300">{t('status_in_progress', 'In Progress')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
            <span className="text-slate-600 dark:text-purple-300">{t('status_resolved', 'Resolved')}</span>
          </div>
        </div>
        {loading && issues.length === 0 ? (
          <div className="h-full flex items-center justify-center bg-paper dark:bg-paper">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-brand-medium border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 dark:text-purple-400">{t('loading_map', 'Loading map…')}</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={INDIA_CENTER}
            zoom={4.5}
            whenCreated={(map) => { mapRef.current = map }}
            style={{ height: '100%', width: '100%' }}
            attributionControl={false}
            preferCanvas={true}
            zoomSnap={0.25}
            zoomDelta={0.5}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

            <MarkerClusterGroup
              chunkedLoading
              iconCreateFunction={createClusterCustomIcon}
              maxClusterRadius={60}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
            >
              {issues
                .filter(issue => issue && typeof issue.latitude === 'number' && typeof issue.longitude === 'number')
                .map(issue => {
                  // Phase B: Red=Reported, Blue=In Progress, Green=Resolved
                  const statusColor = MAP_STATUS_COLORS[issue.status] || MAP_STATUS_COLORS.reported
                  const dashArray = issue.status === 'reported' ? '' : issue.status === 'in_progress' ? '5,5' : '2,4'
                  return (
                    <CircleMarker
                      key={issue.id}
                      center={[issue.latitude, issue.longitude]}
                      radius={issue.status === 'resolved' ? 5 : 7 + issue.severity_score / 20}
                      pathOptions={{
                        color: statusColor,
                        fillColor: statusColor,
                        fillOpacity: issue.status === 'resolved' ? 0.3 : 0.7,
                        weight: issue.sla_breach ? 3 : 1.5,
                        dashArray: dashArray
                      }}
                      eventHandlers={{
                        click: () => onSelect(issue),
                        add: (e) => { try { e.target.options.issueStatus = issue.status } catch (err) {} }
                      }}
                      renderer={L.canvas()}
                    >
                    <Popup>
                      <div className="text-xs">
                        <strong>{t('issue_type_' + issue.issue_type, ISSUE_TYPE_META[issue.issue_type]?.label)}</strong> · {t('severity_' + issue.severity_label.toLowerCase(), issue.severity_label)}
                        <br />
                        {t('priority_label', 'Priority:')} {issue.priority_score}
                        {issue.sla_breach && <><br /><span style={{ color: '#dc2626' }}>{t('sla_breached', '⚠ SLA Breached')}</span></>}
                      </div>
                    </Popup>
                    </CircleMarker>
                  )
                })}
            </MarkerClusterGroup>
          </MapContainer>
        )}
      </div>
    </div>
  )
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name) || ''
}

// ---------------------------------------------------------------------------
// Charts — new palette colors
// ---------------------------------------------------------------------------
// Pie chart: purple primary, pink accent, yellow, then more brand-adjacent tones
const PIE_COLORS = ['#5b21b6', '#ec4899', '#facc15', '#a855f7', '#2563eb', '#64748b']

function ChartsPanel({ stats, wardHealth, loading }) {
  const { t } = useTranslation()
  if (loading && !stats) {
    return (
      <div className="space-y-5">
        <div className="bg-surface dark:bg-surface border border-border-muted rounded-xl p-5">
          <Skeleton className="w-32 h-4 mb-4" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="bg-surface dark:bg-surface border border-border-muted rounded-xl p-5">
          <Skeleton className="w-32 h-4 mb-4" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    )
  }

  if (!stats) return null

  const typeData = Object.entries(stats.by_type).map(([name, value]) => ({
    name: ISSUE_TYPE_META[name]?.label || name,
    value,
  }))

  return (
    <div className="space-y-5">
      <div className="bg-surface dark:bg-surface border border-border-muted rounded-xl p-5 transition-colors duration-300">
        <h2 className="font-display font-medium text-sm mb-3 text-brand-deep dark:text-purple-100">{t('issues_by_type', 'Issues by Type')}</h2>
        {typeData.length === 0 ? (
          <EmptyChart label={t('no_issues_yet', 'No issues yet')} />
        ) : (
          <>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={60} paddingAngle={2}>
                    {typeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
              {typeData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-purple-400">
                  <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-surface dark:bg-surface border border-border-muted rounded-xl p-5 transition-colors duration-300">
        <h2 className="font-display font-medium text-sm mb-3 text-brand-deep dark:text-purple-100">{t('ward_health', 'Ward Health Index')}</h2>
        {wardHealth.length === 0 ? (
          <EmptyChart label={t('no_ward_data', 'No ward data')} />
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={wardHealth.map(w => ({ name: w.ward.split(' - ')[1] || w.ward, value: w.health_index }))}
                layout="vertical"
                margin={{ left: 0 }}
              >
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#a78bfa', fontSize: 11 }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {wardHealth.map((w, i) => (
                    <Cell key={i} fill={w.health_index >= 70 ? '#5b21b6' : w.health_index >= 40 ? '#facc15' : '#dc2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Forecast
// ---------------------------------------------------------------------------
function ForecastPanel({ data, days, setDays, resolveN, setResolveN, loading }) {
  const { t } = useTranslation()
  return (
    <div className="bg-surface dark:bg-surface border border-border-muted rounded-xl p-5 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-5">
        <div>
          <h2 className="font-display font-medium text-sm text-brand-deep dark:text-purple-100">{t('infra_health_forecast', 'Infrastructure Health Forecast')}</h2>
          <p className="text-xs text-slate-500 dark:text-purple-400 mt-1">{t('projected_index', 'Projected index over {days} days').replace('{days}', days)}</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-purple-300">
            <span className="hidden sm:inline">{t('intervention', 'Intervention:')}</span>
            <select
              value={resolveN}
              onChange={e => setResolveN(Number(e.target.value))}
              className="bg-surface-2 dark:bg-surface-2 border border-border-muted rounded px-2 py-1 outline-none focus:border-brand-medium text-brand-deep dark:text-purple-200"
            >
              <option value={0}>{t('do_nothing', 'Do nothing')}</option>
              <option value={5}>{t('resolve_top_5', 'Resolve top 5')}</option>
              <option value={10}>{t('resolve_top_10', 'Resolve top 10')}</option>
              <option value={20}>{t('resolve_top_20', 'Resolve top 20')}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-purple-300">
            <span>{t('days_label', 'Days:')}</span>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="bg-surface-2 dark:bg-surface-2 border border-border-muted rounded px-2 py-1 outline-none focus:border-brand-medium text-brand-deep dark:text-purple-200"
            >
              <option value={30}>30</option>
              <option value={60}>60</option>
              <option value={90}>90</option>
            </select>
          </label>
        </div>
      </div>

      {loading && data.length === 0 ? (
        <Skeleton className="h-48 w-full" />
      ) : data.length === 0 ? (
        <EmptyChart label={t('no_forecast_data', 'No forecast data available')} />
      ) : (
        <div className="h-48 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#facc15" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOptimized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3b1f6e" vertical={false} />
              <XAxis dataKey="day" tickFormatter={v => `Day ${v}`} stroke="#a78bfa" tick={{ fill: '#a78bfa' }} />
              <YAxis domain={[0, 100]} stroke="#a78bfa" tick={{ fill: '#a78bfa' }} />
              <RechartsTooltip
                contentStyle={tooltipStyle}
                labelFormatter={v => `Day ${v}`}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', color: '#a78bfa' }} />
              <Area type="monotone" dataKey="current"   name={t('current_trajectory', 'Current Trajectory')} stroke="#facc15" fillOpacity={1} fill="url(#colorCurrent)" />
              <Area type="monotone" dataKey="optimized" name={t('if_top_resolved', 'If Top {resolveN} Resolved').replace('{resolveN}', resolveN)} stroke="#a855f7" fillOpacity={1} fill="url(#colorOptimized)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contractors — medal styling for top 3
// ---------------------------------------------------------------------------
const MEDAL = ['🥇', '🥈', '🥉']
const MEDAL_BG = [
  'bg-gradient-to-r from-brand-yellow/20 to-transparent border-brand-yellow/30',
  'bg-gradient-to-r from-slate-300/10 to-transparent border-slate-300/20 dark:border-slate-600/30',
  'bg-gradient-to-r from-orange-700/10 to-transparent border-orange-700/20',
]

function ContractorsPanel({ contractors, loading }) {
  const { t } = useTranslation()
  if (loading && contractors.length === 0) {
    return (
      <div className="bg-surface dark:bg-surface border border-border-muted rounded-xl p-5">
        <Skeleton className="w-40 h-4 mb-4" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full mb-3" />)}
      </div>
    )
  }

  if (!contractors || contractors.length === 0) return null

  return (
    <div className="bg-surface dark:bg-surface border border-border-muted rounded-xl p-5 transition-colors duration-300">
      <h2 className="font-display font-medium text-sm mb-4 flex items-center gap-2 text-brand-deep dark:text-purple-100">
        <Trophy className="w-4 h-4 text-brand-yellow" /> {t('contractor_leaderboard', 'Contractor Leaderboard')}
      </h2>
      <div className="space-y-3">
        {contractors.map((c, i) => {
          const pct = c.issues_assigned > 0 ? (c.issues_resolved / c.issues_assigned) * 100 : 0
          const isTop3 = i < 3
          return (
            <div
              key={c.id}
              className={`group rounded-lg p-2.5 border transition-all duration-200 hover:shadow-sm ${
                isTop3
                  ? `${MEDAL_BG[i]} hover:shadow-brand-primary/10`
                  : 'border-transparent hover:bg-surface-2 dark:hover:bg-surface-2'
              }`}
            >
              <div className="flex justify-between items-center text-sm mb-1.5">
                <div className="flex items-center gap-2.5">
                  {isTop3 ? (
                    <span className="text-base leading-none">{MEDAL[i]}</span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400 dark:text-purple-500 bg-surface-2 dark:bg-surface-2 px-1.5 rounded min-w-[22px] text-center">#{i + 1}</span>
                  )}
                  <div className="text-slate-700 dark:text-purple-200 font-medium truncate max-w-[130px] group-hover:text-brand-primary dark:group-hover:text-brand-medium transition-colors">{c.name}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-400 dark:text-purple-500 font-medium tracking-wide">
                    {c.issues_resolved}/{c.issues_assigned}
                  </span>
                  <span
                    className="text-sm font-mono font-bold"
                    style={{ color: i === 0 ? '#facc15' : i === 1 ? '#94a3b8' : i === 2 ? '#ea580c' : '#a855f7' }}
                  >
                    {Math.round(c.performance_score)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-surface-2 dark:bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: i === 0
                      ? 'linear-gradient(90deg, #facc15, #fde047)'
                      : i === 1
                      ? 'linear-gradient(90deg, #94a3b8, #cbd5e1)'
                      : i === 2
                      ? 'linear-gradient(90deg, #ea580c, #f97316)'
                      : 'linear-gradient(90deg, #7c3aed, #a855f7)',
                  }}
                />
              </div>
              {isTop3 && (
                <div className="flex justify-between text-[9px] text-slate-400 dark:text-purple-500 mt-1 font-mono">
                  <span>{Math.round(pct)}% resolution rate</span>
                  <span>Score: {Math.round(c.performance_score)}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Priority queue
// ---------------------------------------------------------------------------
function PriorityQueue({ issues, filterStatus, onFilterChange, onSelect, onStatusChange, loading, slaBreaches }) {
  const { t } = useTranslation()
  return (
    <div className="bg-surface dark:bg-surface border border-border-muted rounded-xl flex flex-col flex-1 min-h-0 transition-colors duration-300">
      <div className="px-5 py-3.5 border-b border-border-muted flex justify-between items-start gap-2">
        <div className="min-w-0">
          <h2 className="font-display font-medium text-sm mb-3 text-brand-deep dark:text-purple-100">
            {t('priority_queue', 'Priority Queue')}
            {slaBreaches > 0 && (
              <span className="ml-2 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-1.5 py-0.5">
                {slaBreaches} {t('breached', 'breached')}
              </span>
            )}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {['all', 'reported', 'in_progress', 'resolved'].map(s => (
              <button
                key={s}
                onClick={() => onFilterChange(s)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  filterStatus === s
                    ? 'bg-brand-primary text-white font-medium shadow-sm shadow-brand-primary/30'
                    : 'bg-surface-2 dark:bg-surface-2 text-slate-500 dark:text-purple-400 hover:text-brand-primary dark:hover:text-brand-medium border border-border-muted'
                }`}
              >
                {s === 'all' ? t('all', 'All') : t('status_' + s, STATUS_META[s].label)}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => api.downloadCSV('all')}
          className="shrink-0 text-xs text-slate-600 dark:text-purple-400 hover:text-brand-primary dark:hover:text-brand-medium bg-surface-2 dark:bg-surface-2 hover:bg-brand-light dark:hover:bg-brand-light/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors mt-0.5 border border-border-muted"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('export', 'Export')}</span>
        </button>
      </div>

      <div className="overflow-y-auto scroll-thin flex-1 divide-y divide-border-muted">
        {loading && issues.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        ) : issues.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <MapPin className="w-8 h-8 text-brand-light dark:text-purple-800 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-purple-400 mb-1">{t('no_issues_found', 'No issues found')}</p>
            <p className="text-xs text-slate-300 dark:text-purple-700">{t('submit_citizen_report', 'Submit a citizen report.')}</p>
          </div>
        ) : (
          issues.map(issue => (
            <IssueRow key={issue.id} issue={issue} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  )
}

function IssueRow({ issue, onSelect }) {
  const { t } = useTranslation()
  const typeMeta = ISSUE_TYPE_META[issue.issue_type] || ISSUE_TYPE_META.other
  const sevMeta = SEVERITY_META[issue.severity_label] || SEVERITY_META.Low
  const statusMeta = STATUS_META[issue.status]

  return (
    <button
      onClick={() => onSelect(issue)}
      className={`w-full text-left px-5 py-3.5 hover:bg-surface-2 dark:hover:bg-surface-2 transition-colors ${
        issue.sla_breach && issue.status !== 'resolved' ? 'border-l-2 border-red-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span>{typeMeta.icon}</span>
          <span className="font-medium text-sm truncate text-brand-deep dark:text-purple-100">{t('issue_type_' + issue.issue_type, typeMeta.label)}</span>
        </div>
        <span className="text-xs font-mono text-slate-400 dark:text-purple-500 shrink-0">#{issue.id}</span>
      </div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: sevMeta.color, background: `${sevMeta.color}1a` }}>
          {t('severity_' + issue.severity_label.toLowerCase(), issue.severity_label)}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-purple-400 truncate">{issue.ward}</span>
        {issue.report_count > 1 && (
          <span className="text-[10px] bg-surface-2 dark:bg-surface-2 text-slate-600 dark:text-purple-400 px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-border-muted">
            <Users className="w-3 h-3" /> {issue.report_count}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusMeta.color }} />
          <span className="text-xs text-slate-500 dark:text-purple-400">{t('status_' + issue.status, statusMeta.label)}</span>
        </div>
        <div className="flex items-center gap-2">
          {issue.status !== 'resolved' && issue.days_until_sla !== null && (
            <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${
              issue.sla_breach
                ? 'bg-red-500/10 text-red-400'
                : 'bg-brand-primary/10 text-brand-primary dark:text-brand-medium'
            }`}>
              {issue.sla_breach
                ? t('days_overdue_tag', '⚠ {days}d overdue').replace('{days}', Math.abs(issue.days_until_sla))
                : t('days_left_tag', '{days}d left').replace('{days}', issue.days_until_sla)}
            </span>
          )}
          <span className="text-xs text-slate-400 dark:text-purple-500">{timeAgo(issue.created_at, t)}</span>
        </div>
      </div>
      <div className="mt-2 h-1 bg-surface-2 dark:bg-surface-2 rounded-full overflow-hidden">
        <div className="h-full bg-brand-primary rounded-full" style={{ width: `${issue.priority_score}%` }} />
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Issue detail modal
// ---------------------------------------------------------------------------
function IssueDetailModal({ issue, contractors, onClose, onStatusChange }) {
  const { t } = useTranslation()
  const typeMeta = ISSUE_TYPE_META[issue.issue_type] || ISSUE_TYPE_META.other
  const sevMeta = SEVERITY_META[issue.severity_label] || SEVERITY_META.Low
  const [selectedContractor, setSelectedContractor] = useState(issue.contractor || '')
  const [afterImageFile, setAfterImageFile] = useState(null)
  const [updating, setUpdating] = useState(false)
  const fileInputRef = useRef(null)

  async function handleUpdate(newStatus) {
    setUpdating(true)
    await onStatusChange(issue.id, newStatus, selectedContractor, newStatus === 'resolved' ? afterImageFile : null)
    setUpdating(false)
  }

  // Close on Escape
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
        className="bg-surface dark:bg-surface border border-border-muted rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scroll-thin shadow-2xl shadow-brand-primary/20"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{typeMeta.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold text-lg text-brand-deep dark:text-purple-100">{t('issue_type_' + issue.issue_type, typeMeta.label)}</h3>
                  {issue.report_count > 1 && (
                    <span className="text-xs bg-surface-2 dark:bg-surface-2 text-slate-600 dark:text-purple-400 px-2 py-0.5 rounded-md flex items-center gap-1 border border-border-muted">
                      <Users className="w-3.5 h-3.5" /> {issue.report_count} {t('reports_count', 'Reports')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-purple-400">#{issue.id} · {issue.ward}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 dark:text-purple-400 hover:text-brand-primary dark:hover:text-brand-medium p-1 rounded-lg hover:bg-surface-2 dark:hover:bg-surface-2 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Images */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-purple-400 font-medium uppercase tracking-wider">{t('before', 'Before')}</span>
              <img src={issue.image_path} alt="Before" className="w-full h-40 object-cover rounded-xl border border-border-muted" />
            </div>
            {issue.after_image_path ? (
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-purple-400 font-medium uppercase tracking-wider">{t('after', 'After')}</span>
                <img src={issue.after_image_path} alt="After" className="w-full h-40 object-cover rounded-xl border border-border-muted" />
              </div>
            ) : (
              <div
                className="flex items-center justify-center border-2 border-dashed border-border-muted hover:border-brand-medium rounded-xl h-40 mt-[18px] cursor-pointer transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {afterImageFile ? (
                  <div className="text-xs text-slate-600 dark:text-purple-300 text-center px-2">
                    <CheckCircle2 className="w-6 h-6 text-brand-accent mx-auto mb-1" />
                    {afterImageFile.name}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-purple-400 text-center px-2">
                    <Download className="w-5 h-5 mx-auto mb-1 opacity-50 rotate-180" />
                    {t('click_attach_after_photo', 'Click to attach after photo')}
                  </div>
                )}
              </div>
            )}
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={e => e.target.files?.[0] && setAfterImageFile(e.target.files[0])} className="hidden" />

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <Metric label={t('severity', 'Severity')} value={t('severity_' + issue.severity_label.toLowerCase(), issue.severity_label)} color={sevMeta.color} />
            <Metric label={t('severity_score', 'Severity Score')} value={`${issue.severity_score}/100`} />
            <Metric label={t('30d_risk', '30-day Risk')} value={`${issue.failure_probability_30d}%`} color="#ec4899" />
            <Metric label={t('priority_score', 'Priority Score')} value={`${issue.priority_score}/100`} />
          </div>

          {/* SLA status */}
          {issue.status !== 'resolved' && issue.days_until_sla !== null && (
            <div className={`text-sm p-3 rounded-xl border ${
              issue.sla_breach
                ? 'bg-red-500/5 border-red-500/20 text-red-400'
                : 'bg-brand-primary/5 border-brand-primary/20 text-brand-primary dark:text-brand-medium'
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
            <Row label={t('department', 'Department')} value={issue.assigned_department} />
            <Row label={t('address', 'Address')} value={issue.address || '—'} />
            <div className="flex justify-between gap-4 items-center">
              <span className="text-slate-500 dark:text-purple-400 shrink-0">{t('contractor', 'Contractor')}</span>
              <select
                value={selectedContractor}
                onChange={e => setSelectedContractor(e.target.value)}
                className="bg-surface-2 dark:bg-surface-2 border border-border-muted text-slate-600 dark:text-purple-300 text-xs rounded px-2 py-1 outline-none focus:border-brand-medium"
              >
                <option value="">{t('unassigned', 'Unassigned')}</option>
                {contractors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <Row label={t('reported_time', 'Reported')} value={timeAgo(issue.created_at, t)} />
            {issue.reporter_note && <Row label={t('citizen_note', 'Citizen note')} value={issue.reporter_note} />}
          </div>

          {/* Status controls */}
          <div className="border-t border-border-muted pt-4">
            <p className="text-xs text-slate-500 dark:text-purple-400 mb-2">{t('update_status', 'Update status')}</p>
            <div className="flex gap-2">
              {['reported', 'in_progress', 'resolved'].map(s => (
                <button
                  key={s}
                  onClick={() => handleUpdate(s)}
                  disabled={updating}
                  className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50 ${
                    issue.status === s
                      ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/30'
                      : 'bg-surface-2 dark:bg-surface-2 text-slate-500 dark:text-purple-400 hover:text-brand-primary dark:hover:text-brand-medium hover:bg-brand-light dark:hover:bg-brand-light/20 border border-border-muted'
                  }`}
                >
                  {updating && issue.status !== s ? (
                    <span className="inline-block w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : t('status_' + s, STATUS_META[s].label)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reusable small components
// ---------------------------------------------------------------------------
function Metric({ label, value, color }) {
  return (
    <div className="bg-surface-2 dark:bg-surface-2 rounded-lg p-3 border border-border-muted">
      <div className="text-[11px] text-slate-500 dark:text-purple-400 mb-1">{label}</div>
      <div className="font-mono font-semibold text-brand-deep dark:text-purple-100" style={color ? { color } : {}}>{value}</div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500 dark:text-purple-400 shrink-0">{label}</span>
      <span className="text-right text-slate-600 dark:text-purple-300 break-words">{value}</span>
    </div>
  )
}

function EmptyChart({ label }) {
  return (
    <div className="h-32 flex items-center justify-center text-xs text-slate-400 dark:text-purple-500">{label}</div>
  )
}

const tooltipStyle = {
  background: '#1a0a2e',
  border: '1px solid #3b1f6e',
  borderRadius: 8,
  fontSize: 12,
  color: '#e9d5ff',
}

// ---------------------------------------------------------------------------
// Department Performance Panel
// ---------------------------------------------------------------------------
function DepartmentsPanel({ departments, loading }) {
  const { t } = useTranslation()

  if (loading && departments.length === 0) {
    return (
      <div className="bg-surface dark:bg-surface border border-border-muted rounded-xl p-5">
        <Skeleton className="w-40 h-4 mb-4" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full mb-3 animate-pulse" />)}
      </div>
    )
  }

  // Sort departments by SLA breach count desc, then total issues desc
  const sortedDepts = [...departments].sort((a, b) => {
    if (b.sla_breach_count !== a.sla_breach_count) {
      return b.sla_breach_count - a.sla_breach_count
    }
    return b.total_issues - a.total_issues
  })

  return (
    <div className="bg-surface dark:bg-surface border border-border-muted rounded-xl p-5 transition-colors duration-300">
      <h2 className="font-display font-medium text-sm mb-4 text-brand-deep dark:text-purple-100">
        Department Performance
      </h2>
      <div className="space-y-4">
        {sortedDepts.map(dept => {
          const total = dept.total_issues || 1
          const pctOpen = (dept.open_count / total) * 100
          const pctProgress = (dept.in_progress_count / total) * 100
          const pctResolved = (dept.resolved_count / total) * 100

          return (
            <div key={dept.name} className="group rounded-lg p-2.5 border border-border-muted bg-surface-2/20 dark:bg-surface-2/5 hover:bg-surface-2/45 transition-colors">
              <div className="flex justify-between items-start text-xs mb-2 gap-2">
                <div className="font-semibold text-slate-700 dark:text-purple-200 leading-snug truncate" title={dept.name}>
                  {dept.name}
                </div>
                {dept.sla_breach_count > 0 && (
                  <span className="text-[10px] font-bold text-red-500 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                    {dept.sla_breach_count} breach{dept.sla_breach_count > 1 ? 'es' : ''}
                  </span>
                )}
              </div>

              {/* Stacked status bar */}
              <div className="h-2 bg-surface-2 dark:bg-surface-2 rounded-full overflow-hidden flex mb-2">
                {dept.open_count > 0 && <div style={{ width: `${pctOpen}%` }} className="bg-red-500 dark:bg-red-600 h-full" title={`Open: ${dept.open_count}`} />}
                {dept.in_progress_count > 0 && <div style={{ width: `${pctProgress}%` }} className="bg-blue-500 dark:bg-blue-600 h-full" title={`In Progress: ${dept.in_progress_count}`} />}
                {dept.resolved_count > 0 && <div style={{ width: `${pctResolved}%` }} className="bg-emerald-500 dark:bg-emerald-600 h-full" title={`Resolved: ${dept.resolved_count}`} />}
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-purple-400 font-mono">
                <span>
                  O: {dept.open_count} · IP: {dept.in_progress_count} · R: {dept.resolved_count}
                </span>
                <span>
                  Avg SLA: <span className="font-bold text-brand-primary dark:text-brand-medium">{dept.avg_resolution_time}d</span>
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Helper to compile activity log strings
function getLogMessage(log, t) {
  const typeMeta = ISSUE_TYPE_META[log.issue_type] || ISSUE_TYPE_META.other
  const icon = typeMeta.icon || '⚠️'
  const wardText = log.ward ? ` in ${log.ward}` : ''
  
  if (log.action === 'status_changed') {
    const oldStatusLabel = STATUS_META[log.old_value]?.label || log.old_value
    const newStatusLabel = STATUS_META[log.new_value]?.label || log.new_value
    return (
      <span>
        {icon} <strong>Issue #{log.issue_id}</strong> status changed from <span className="font-semibold text-slate-600 dark:text-purple-300">{oldStatusLabel}</span> to <span className="font-semibold text-slate-800 dark:text-purple-100">{newStatusLabel}</span>{wardText}.
      </span>
    )
  } else if (log.action === 'contractor_assigned') {
    return (
      <span>
        {icon} <strong>Issue #{log.issue_id}</strong> assigned to contractor <span className="font-semibold text-brand-primary dark:text-brand-medium">{log.new_value}</span>{wardText} (previously: {log.old_value}).
      </span>
    )
  }
  return `Issue #${log.issue_id} updated.`
}

// ---------------------------------------------------------------------------
// Activity Log Feed Panel
// ---------------------------------------------------------------------------
function ActivityLogPanel({ activities, loading }) {
  const { t } = useTranslation()

  if (loading && activities.length === 0) {
    return (
      <div className="bg-surface dark:bg-surface border border-border-muted rounded-xl p-5 h-[250px] flex flex-col">
        <Skeleton className="w-32 h-4 mb-4" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full mb-2 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="bg-surface dark:bg-surface border border-border-muted rounded-xl flex flex-col h-[250px] transition-colors duration-300">
      <div className="px-5 py-3 border-b border-border-muted">
        <h2 className="font-display font-medium text-xs text-brand-deep dark:text-purple-100 uppercase tracking-wider">
          System Audit Feed
        </h2>
      </div>

      <div className="overflow-y-auto scroll-thin flex-1 divide-y divide-border-muted">
        {activities.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Clock className="w-6 h-6 text-slate-300 dark:text-purple-900 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-purple-400 mb-1">No recent system activity</p>
            <p className="text-[9px] text-slate-400 dark:text-purple-600 leading-normal">
              Audit logs will display updates when issue statuses or contractors are modified.
            </p>
          </div>
        ) : (
          activities.map(log => (
            <div key={log.id} className="px-5 py-2.5 text-[11px] text-slate-600 dark:text-purple-300 leading-normal hover:bg-surface-2/10 transition-colors">
              <div className="mb-0.5">{getLogMessage(log, t)}</div>
              <div className="text-[9px] text-slate-400 dark:text-purple-500 font-mono">
                {timeAgo(log.timestamp, t)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}