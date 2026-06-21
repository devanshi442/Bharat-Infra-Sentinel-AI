import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, ArrowLeft, RefreshCw, AlertOctagon, Clock, CheckCircle2,
  TrendingUp, MapPin, Users, Download, X, AlertTriangle, Zap
} from 'lucide-react'
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, AreaChart, Area, CartesianGrid, Legend
} from 'recharts'
import { api } from '../api'
import { ISSUE_TYPE_META, SEVERITY_META, STATUS_META, timeAgo } from '../constants'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useTranslation } from 'react-i18next'

const INDIA_CENTER = [22.5, 80]  // Adjusted to better frame India

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
            ${t.type === 'success' ? 'bg-sentinel-500/90 border-sentinel-400/30 text-white' : ''}
            ${t.type === 'error' ? 'bg-red-500/90 border-red-400/30 text-white' : ''}
            ${t.type === 'info' ? 'bg-slate-100/95 border-slate-200 text-slate-700' : ''}
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
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />
}

// Removed computeBuckets as we now use react-leaflet-cluster

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

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [issuesData, statsData, wardData, contractorsData, forecastData] = await Promise.all([
        api.listIssues({ sort_by_priority: true, search: searchQuery, lang: i18n.language }),
        api.dashboardStats(),
        api.wardHealth(),
        api.listContractors(),
        api.dashboardForecast(forecastDays, forecastResolveN),
      ])
      setIssues(issuesData)
      setStats(statsData)
      setWardHealth(wardData)
      setContractors(contractorsData)
      setForecast(forecastData)
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
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
            </div>
          </div>
        </div>

        {/* ── Right column: priority queue ── */}
        <PriorityQueue
          issues={filteredIssues}
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
          onSelect={setSelectedIssue}
          onStatusChange={handleStatusChange}
          loading={loading}
          slaBreaches={slaBreaches}
        />
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
    <header className="border-b border-slate-100 bg-slate-50/95 backdrop-blur sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto px-4 md:px-5 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="text-slate-500 hover:text-slate-900 transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-5 h-5 text-sentinel-400 shrink-0" />
            <span className="font-display font-semibold tracking-tight truncate">Municipal Command Centre</span>
          </div>
          <span className="hidden md:inline-block text-xs font-mono text-slate-500 border border-slate-200 rounded-full px-2.5 py-1 shrink-0">
            National View
          </span>
          {slaBreaches > 0 && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold bg-red-500/15 border border-red-500/25 text-red-400 rounded-full px-2.5 py-1 shrink-0 animate-pulse">
              <AlertOctagon className="w-3.5 h-3.5" /> {slaBreaches} SLA breach{slaBreaches > 1 ? 'es' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="text"
            placeholder={t('search_issues', 'Search issues...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onRefresh();
              }
            }}
            className="hidden sm:block text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-signal-400 bg-white"
          />
          <LanguageSwitcher />
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
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
  if (loading && !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white/80 border border-slate-100 rounded-xl p-5">
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
    { label: 'Total Issues', value: stats.total_issues, icon: MapPin, accent: 'text-slate-900' },
    { label: 'Critical', value: stats.critical_count, icon: AlertOctagon, accent: 'text-red-400' },
    { label: 'In Progress', value: stats.in_progress_issues, icon: Clock, accent: 'text-signal-400' },
    { label: 'Resolved', value: stats.resolved_issues, icon: CheckCircle2, accent: 'text-sentinel-400' },
    { label: 'Avg. Failure Risk', value: `${stats.avg_failure_probability}%`, icon: TrendingUp, accent: 'text-signal-400' },
    { label: 'Health Index', value: `${stats.health_index}`, icon: ShieldCheck, accent: healthAccent(stats.health_index) },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-white/80 backdrop-blur border border-slate-100 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <c.icon className={`w-5 h-5 ${c.accent} opacity-80`} strokeWidth={2} />
          </div>
          <div className="font-display font-semibold text-3xl tracking-tighter mb-1 text-slate-900">{c.value}</div>
          <div className="text-xs text-slate-500 font-medium tracking-wide uppercase">{c.label}</div>
        </div>
      ))}
    </div>
  )
}

function healthAccent(v) {
  if (v >= 70) return 'text-sentinel-400'
  if (v >= 40) return 'text-signal-400'
  return 'text-red-400'
}

// ---------------------------------------------------------------------------
// Map panel
// ---------------------------------------------------------------------------
function MapPanel({ issues, onSelect, loading }) {
  const mapRef = useRef(null)
  
  const createClusterCustomIcon = function (cluster) {
    const count = cluster.getChildCount();
    const markers = cluster.getAllChildMarkers();
    
    let counts = { reported: 0, in_progress: 0, resolved: 0 };
    markers.forEach(m => {
      const color = m.options.fillColor;
      if (color === '#e11d48') counts.reported++;
      else if (color === '#f59e0b') counts.in_progress++;
      else if (color === '#059669') counts.resolved++;
    });

    let dominantStatus = 'reported';
    let max = counts.reported;
    if (counts.in_progress > max) { dominantStatus = 'in_progress'; max = counts.in_progress; }
    if (counts.resolved > max) { dominantStatus = 'resolved'; max = counts.resolved; }

    let bgColor = 'bg-slate-400';
    if (dominantStatus === 'reported') bgColor = 'bg-rose-600';
    if (dominantStatus === 'in_progress') bgColor = 'bg-amber-500';
    if (dominantStatus === 'resolved') bgColor = 'bg-emerald-600';

    // CSS conic gradient for a clean, non-noisy pie chart ring around the cluster
    const pctR = (counts.reported / count) * 100;
    const pctI = (counts.in_progress / count) * 100;
    const pctRes = (counts.resolved / count) * 100;
    
    const gradient = `conic-gradient(
      #e11d48 0% ${pctR}%,
      #f59e0b ${pctR}% ${pctR + pctI}%,
      #059669 ${pctR + pctI}% 100%
    )`;

    // Dynamic sizing
    let size = 32;
    if (count >= 100) size = 40;
    if (count >= 1000) size = 48;

    return L.divIcon({
      html: `
        <div class="rounded-full shadow-lg flex items-center justify-center relative" style="width: ${size}px; height: ${size}px; background: ${gradient};">
          <div class="${bgColor} text-white rounded-full flex items-center justify-center font-bold" style="width: ${size - 6}px; height: ${size - 6}px; font-size: ${size > 40 ? '13px' : '11px'};">
            ${count.toLocaleString()}
          </div>
        </div>
      `,
      className: 'custom-cluster-icon',
      iconSize: L.point(size, size, true),
    });
  }

  

  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-display font-medium text-sm">Live Issue Map</h2>
        <span className="text-xs text-slate-500">{issues.length} reports</span>
      </div>
      <div className="h-[380px] md:h-[420px] relative">
        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-[400] bg-white/90 backdrop-blur border border-slate-200 rounded-lg shadow-sm p-3 text-xs flex flex-col gap-2 pointer-events-auto">
          <div className="font-semibold text-slate-700 mb-0.5">Issue Status</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-600 border border-rose-600"></div>
            <span className="text-slate-600">Open (Reported)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 border border-amber-500" style={{ borderStyle: 'dashed' }}></div>
            <span className="text-slate-600">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-600 border border-emerald-600" style={{ borderStyle: 'dotted' }}></div>
            <span className="text-slate-600">Resolved</span>
          </div>
        </div>
        {loading && issues.length === 0 ? (
          <div className="h-full flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-signal-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">Loading map…</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={INDIA_CENTER}
            zoom={4.5}
            whenCreated={(map) => { mapRef.current = map; }}
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
              {issues.map(issue => {
                const statusColor = issue.status === 'reported' ? '#e11d48' : issue.status === 'in_progress' ? '#f59e0b' : '#059669'
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
                    eventHandlers={{ click: () => onSelect(issue) }}
                    renderer={L.canvas()}
                  >
                    <Popup>
                      <div className="text-xs">
                        <strong>{ISSUE_TYPE_META[issue.issue_type]?.label}</strong> · {issue.severity_label}
                        <br />
                        Priority: {issue.priority_score}
                        {issue.sla_breach && <><br /><span style={{ color: '#dc2626' }}>⚠ SLA Breached</span></>}
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

// Map event listener, AggregatedMarkers, and computeBucketsMemo removed

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name) || ''
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------
const PIE_COLORS = ['#f4670e', '#2dd4a7', '#2563eb', '#eab308', '#0f9a78', '#64748b']

function ChartsPanel({ stats, wardHealth, loading }) {
  if (loading && !stats) {
    return (
      <div className="space-y-5">
        <div className="bg-white border border-slate-100 rounded-xl p-5">
          <Skeleton className="w-32 h-4 mb-4" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-5">
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
      <div className="bg-white border border-slate-100 rounded-xl p-5">
        <h2 className="font-display font-medium text-sm mb-3">Issues by Type</h2>
        {typeData.length === 0 ? (
          <EmptyChart label="No issues yet" />
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
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-white border border-slate-100 rounded-xl p-5">
        <h2 className="font-display font-medium text-sm mb-3">Ward Health Index</h2>
        {wardHealth.length === 0 ? (
          <EmptyChart label="No ward data" />
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={wardHealth.map(w => ({ name: w.ward.split(' - ')[1] || w.ward, value: w.health_index }))}
                layout="vertical"
                margin={{ left: 0 }}
              >
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#5d6b8a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {wardHealth.map((w, i) => (
                    <Cell key={i} fill={w.health_index >= 70 ? '#14b890' : w.health_index >= 40 ? '#f4670e' : '#dc2626'} />
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
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-5">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-5">
        <div>
          <h2 className="font-display font-medium text-sm">Infrastructure Health Forecast</h2>
          <p className="text-xs text-slate-500 mt-1">Projected index over {days} days</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <span className="hidden sm:inline">Intervention:</span>
            <select
              value={resolveN}
              onChange={e => setResolveN(Number(e.target.value))}
              className="bg-slate-50 border border-slate-100 rounded px-2 py-1 outline-none focus:border-signal-400"
            >
              <option value={0}>Do nothing</option>
              <option value={5}>Resolve top 5</option>
              <option value={10}>Resolve top 10</option>
              <option value={20}>Resolve top 20</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <span>Days:</span>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="bg-slate-50 border border-slate-100 rounded px-2 py-1 outline-none focus:border-signal-400"
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
        <EmptyChart label="No forecast data available" />
      ) : (
        <div className="h-48 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f4670e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f4670e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOptimized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b890" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b890" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3855" vertical={false} />
              <XAxis dataKey="day" tickFormatter={v => `Day ${v}`} stroke="#5d6b8a" tick={{ fill: '#5d6b8a' }} />
              <YAxis domain={[0, 100]} stroke="#5d6b8a" tick={{ fill: '#5d6b8a' }} />
              <RechartsTooltip
                contentStyle={tooltipStyle}
                labelFormatter={v => `Day ${v}`}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', color: '#5d6b8a' }} />
              <Area type="monotone" dataKey="current" name="Current Trajectory" stroke="#f4670e" fillOpacity={1} fill="url(#colorCurrent)" />
              <Area type="monotone" dataKey="optimized" name={`If Top ${resolveN} Resolved`} stroke="#14b890" fillOpacity={1} fill="url(#colorOptimized)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contractors
// ---------------------------------------------------------------------------
function ContractorsPanel({ contractors, loading }) {
  if (loading && contractors.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl p-5">
        <Skeleton className="w-40 h-4 mb-4" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full mb-3" />)}
      </div>
    )
  }

  if (!contractors || contractors.length === 0) return null

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-5">
      <h2 className="font-display font-medium text-sm mb-4 flex items-center gap-2 text-slate-900">
        <Users className="w-4 h-4 text-slate-500" /> Contractor Leaderboard
      </h2>
      <div className="space-y-4">
        {contractors.map((c, i) => {
          const pct = c.issues_assigned > 0 ? (c.issues_resolved / c.issues_assigned) * 100 : 0
          return (
            <div key={c.id} className="group">
              <div className="flex justify-between items-center text-sm mb-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 rounded">#{i + 1}</span>
                  <div className="text-slate-600 font-medium truncate max-w-[140px] group-hover:text-slate-900 transition-colors">{c.name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">{c.issues_resolved}/{c.issues_assigned}</span>
                  <span className="text-signal-400 font-display font-semibold">{Math.round(c.performance_score)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-signal-500 to-signal-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
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
    <div className="bg-white border border-slate-100 rounded-xl flex flex-col max-h-[600px] lg:max-h-[calc(100vh-104px)] lg:sticky lg:top-[84px]">
      <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-start gap-2">
        <div className="min-w-0">
          <h2 className="font-display font-medium text-sm mb-3">
            {t('priority_queue', 'Priority Queue')}
            {slaBreaches > 0 && (
              <span className="ml-2 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-1.5 py-0.5">
                {slaBreaches} breached
              </span>
            )}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {['all', 'reported', 'in_progress', 'resolved'].map(s => (
              <button
                key={s}
                onClick={() => onFilterChange(s)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${filterStatus === s ? 'bg-signal-500 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900'
                  }`}
              >
                {s === 'all' ? 'All' : STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => api.downloadCSV('all')}
          className="shrink-0 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors mt-0.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>

      <div className="overflow-y-auto scroll-thin flex-1 divide-y divide-slate-100">
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
            <MapPin className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-1">No issues found</p>
            <p className="text-xs text-slate-200">Submit a citizen report.</p>
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
  const typeMeta = ISSUE_TYPE_META[issue.issue_type] || ISSUE_TYPE_META.other
  const sevMeta = SEVERITY_META[issue.severity_label] || SEVERITY_META.Low
  const statusMeta = STATUS_META[issue.status]

  return (
    <button
      onClick={() => onSelect(issue)}
      className={`w-full text-left px-5 py-3.5 hover:bg-slate-100/50 transition-colors ${issue.sla_breach && issue.status !== 'resolved' ? 'border-l-2 border-red-500' : ''
        }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span>{typeMeta.icon}</span>
          <span className="font-medium text-sm truncate">{typeMeta.label}</span>
        </div>
        <span className="text-xs font-mono text-slate-500 shrink-0">#{issue.id}</span>
      </div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: sevMeta.color, background: `${sevMeta.color}1a` }}>
          {issue.severity_label}
        </span>
        <span className="text-[10px] text-slate-500 truncate">{issue.ward}</span>
        {issue.report_count > 1 && (
          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md flex items-center gap-1">
            <Users className="w-3 h-3" /> {issue.report_count}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusMeta.color }} />
          <span className="text-xs text-slate-500">{statusMeta.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {issue.status !== 'resolved' && issue.days_until_sla !== null && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${issue.sla_breach ? 'bg-red-500/10 text-red-400' : 'bg-sentinel-500/10 text-sentinel-400'
              }`}>
              {issue.sla_breach ? `⚠ ${Math.abs(issue.days_until_sla)}d overdue` : `${issue.days_until_sla}d left`}
            </span>
          )}
          <span className="text-xs text-slate-500">{timeAgo(issue.created_at)}</span>
        </div>
      </div>
      <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-signal-500 rounded-full" style={{ width: `${issue.priority_score}%` }} />
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Issue detail modal
// ---------------------------------------------------------------------------
function IssueDetailModal({ issue, contractors, onClose, onStatusChange }) {
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
        className="bg-white border border-slate-100 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scroll-thin"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{typeMeta.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold text-lg">{typeMeta.label}</h3>
                  {issue.report_count > 1 && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {issue.report_count} Reports
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">#{issue.id} · {issue.ward}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Images */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Before</span>
              <img src={issue.image_path} alt="Before" className="w-full h-40 object-cover rounded-xl border border-slate-100" />
            </div>
            {issue.after_image_path ? (
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">After</span>
                <img src={issue.after_image_path} alt="After" className="w-full h-40 object-cover rounded-xl border border-slate-100" />
              </div>
            ) : (
              <div
                className="flex items-center justify-center border-2 border-dashed border-slate-100 hover:border-slate-500 rounded-xl h-40 mt-[18px] cursor-pointer transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {afterImageFile ? (
                  <div className="text-xs text-slate-600 text-center px-2">
                    <CheckCircle2 className="w-6 h-6 text-signal-400 mx-auto mb-1" />
                    {afterImageFile.name}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 text-center px-2">
                    <Download className="w-5 h-5 mx-auto mb-1 opacity-50 rotate-180" />
                    Click to attach after photo
                  </div>
                )}
              </div>
            )}
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={e => e.target.files?.[0] && setAfterImageFile(e.target.files[0])} className="hidden" />

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Severity" value={issue.severity_label} color={sevMeta.color} />
            <Metric label="Severity Score" value={`${issue.severity_score}/100`} />
            <Metric label="30-day Risk" value={`${issue.failure_probability_30d}%`} color="#f4670e" />
            <Metric label="Priority Score" value={`${issue.priority_score}/100`} />
          </div>

          {/* SLA status */}
          {issue.status !== 'resolved' && issue.days_until_sla !== null && (
            <div className={`text-sm p-3 rounded-xl border ${issue.sla_breach
                ? 'bg-red-500/5 border-red-500/20 text-red-400'
                : 'bg-sentinel-500/5 border-sentinel-500/20 text-sentinel-400'
              }`}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium">SLA Status: </span>
                <span>{issue.sla_breach
                  ? `Breached ${Math.abs(issue.days_until_sla)} day${Math.abs(issue.days_until_sla) !== 1 ? 's' : ''} ago`
                  : `${issue.days_until_sla} day${issue.days_until_sla !== 1 ? 's' : ''} remaining`
                }</span>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="text-sm space-y-2 border-t border-slate-100 pt-4">
            <Row label="Department" value={issue.assigned_department} />
            <Row label="Address" value={issue.address || '—'} />
            <div className="flex justify-between gap-4 items-center">
              <span className="text-slate-500 shrink-0">Contractor</span>
              <select
                value={selectedContractor}
                onChange={e => setSelectedContractor(e.target.value)}
                className="bg-slate-50 border border-slate-100 text-slate-600 text-xs rounded px-2 py-1 outline-none focus:border-signal-400"
              >
                <option value="">Unassigned</option>
                {contractors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <Row label="Reported" value={timeAgo(issue.created_at)} />
            {issue.reporter_note && <Row label="Citizen note" value={issue.reporter_note} />}
          </div>

          {/* Status controls */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500 mb-2">Update status</p>
            <div className="flex gap-2">
              {['reported', 'in_progress', 'resolved'].map(s => (
                <button
                  key={s}
                  onClick={() => handleUpdate(s)}
                  disabled={updating}
                  className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50 ${issue.status === s
                      ? 'bg-signal-500 text-white'
                      : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                >
                  {updating && issue.status !== s ? (
                    <span className="inline-block w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : STATUS_META[s].label}
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
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-[11px] text-slate-500 mb-1">{label}</div>
      <div className="font-display font-semibold" style={color ? { color } : {}}>{value}</div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-right text-slate-600 break-words">{value}</span>
    </div>
  )
}

function EmptyChart({ label }) {
  return (
    <div className="h-32 flex items-center justify-center text-xs text-slate-500">{label}</div>
  )
}

const tooltipStyle = {
  background: '#161d2c',
  border: '1px solid #2d3855',
  borderRadius: 8,
  fontSize: 12,
  color: '#fff',
}