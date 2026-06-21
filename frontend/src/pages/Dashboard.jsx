import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, ArrowLeft, RefreshCw, AlertOctagon, Clock, CheckCircle2,
  TrendingUp, MapPin, Users, Download
} from 'lucide-react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid, Legend } from 'recharts'
import { api } from '../api'
import { ISSUE_TYPE_META, SEVERITY_META, STATUS_META, timeAgo } from '../constants'

const LUDHIANA_CENTER = [30.901, 75.8573]

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

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [issuesData, statsData, wardData, contractorsData, forecastData] = await Promise.all([
        api.listIssues({ sort_by_priority: true }),
        api.dashboardStats(),
        api.wardHealth(),
        api.listContractors(),
        api.dashboardForecast(forecastDays, forecastResolveN)
      ])
      setIssues(issuesData)
      setStats(statsData)
      setWardHealth(wardData)
      setContractors(contractorsData)
      setForecast(forecastData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData, forecastDays, forecastResolveN])

  async function handleSeed() {
    await api.seedDemoData()
    loadData()
  }

  async function handleStatusChange(id, newStatus, newContractor) {
    await api.updateStatus(id, newStatus, newContractor)
    loadData()
  }

  const filteredIssues = filterStatus === 'all' ? issues : issues.filter((i) => i.status === filterStatus)

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <TopBar onRefresh={loadData} onSeed={handleSeed} loading={loading} />

      <div className="max-w-[1600px] mx-auto px-5 py-5 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        <div className="space-y-5 min-w-0">
          <StatsRow stats={stats} />

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
            <div className="flex flex-col gap-5">
              <MapPanel issues={issues} onSelect={setSelectedIssue} />
              <ForecastPanel 
                data={forecast} 
                days={forecastDays} 
                setDays={setForecastDays} 
                resolveN={forecastResolveN} 
                setResolveN={setForecastResolveN} 
              />
            </div>
            <div className="flex flex-col gap-5">
              <ChartsPanel stats={stats} wardHealth={wardHealth} />
              <ContractorsPanel contractors={contractors} />
            </div>
          </div>
        </div>

        <PriorityQueue
          issues={filteredIssues}
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
          onSelect={setSelectedIssue}
          onStatusChange={handleStatusChange}
        />
      </div>

      {selectedIssue && (
        <IssueDetailModal issue={selectedIssue} contractors={contractors} onClose={() => setSelectedIssue(null)} onStatusChange={handleStatusChange} />
      )}
    </div>
  )
}

function TopBar({ onRefresh, onSeed, loading }) {
  return (
    <header className="border-b border-ink-800 bg-ink-950/95 backdrop-blur sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto px-5 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-ink-600 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sentinel-400" />
            <span className="font-display font-semibold tracking-tight">Municipal Command Centre</span>
          </div>
          <span className="hidden md:inline-block text-xs font-mono text-ink-600 border border-ink-700 rounded-full px-2.5 py-1">
            Ludhiana Pilot
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSeed}
            className="text-xs font-medium text-ink-600 hover:text-white border border-ink-700 hover:border-ink-600 rounded-lg px-3 py-2 transition-colors"
            title="Populate sample data for demo purposes"
          >
            Load Demo Data
          </button>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 text-xs font-medium bg-ink-800 hover:bg-ink-700 rounded-lg px-3 py-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
    </header>
  )
}

function StatsRow({ stats }) {
  if (!stats) return null
  const cards = [
    { label: 'Total Issues', value: stats.total_issues, icon: MapPin, accent: 'text-white' },
    { label: 'Critical', value: stats.critical_count, icon: AlertOctagon, accent: 'text-red-400' },
    { label: 'In Progress', value: stats.in_progress_issues, icon: Clock, accent: 'text-signal-400' },
    { label: 'Resolved', value: stats.resolved_issues, icon: CheckCircle2, accent: 'text-sentinel-400' },
    { label: 'Avg. Failure Risk', value: `${stats.avg_failure_probability}%`, icon: TrendingUp, accent: 'text-signal-400' },
    { label: 'Health Index', value: `${stats.health_index}`, icon: ShieldCheck, accent: 'text-sentinel-400' },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-ink-900/80 backdrop-blur border border-ink-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <c.icon className={`w-5 h-5 ${c.accent} opacity-80`} strokeWidth={2} />
          </div>
          <div className="font-display font-semibold text-3xl tracking-tighter mb-1 text-white">{c.value}</div>
          <div className="text-xs text-ink-400 font-medium tracking-wide uppercase">{c.label}</div>
        </div>
      ))}
    </div>
  )
}

function MapPanel({ issues, onSelect }) {
  return (
    <div className="bg-ink-900 border border-ink-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-ink-800 flex items-center justify-between">
        <h2 className="font-display font-medium text-sm">Live Issue Map</h2>
        <span className="text-xs text-ink-600">{issues.length} reports</span>
      </div>
      <div className="h-[420px]">
        <MapContainer center={LUDHIANA_CENTER} zoom={12} style={{ height: '100%', width: '100%' }} attributionControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {issues.map((issue) => {
            const sev = SEVERITY_META[issue.severity_label] || SEVERITY_META.Low
            return (
              <CircleMarker
                key={issue.id}
                center={[issue.latitude, issue.longitude]}
                radius={issue.status === 'resolved' ? 5 : 7 + issue.severity_score / 20}
                pathOptions={{
                  color: sev.color,
                  fillColor: sev.color,
                  fillOpacity: issue.status === 'resolved' ? 0.25 : 0.65,
                  weight: 1.5,
                }}
                eventHandlers={{ click: () => onSelect(issue) }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>{ISSUE_TYPE_META[issue.issue_type]?.label}</strong> · {issue.severity_label}
                    <br />
                    Priority: {issue.priority_score}
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}

const PIE_COLORS = ['#f4670e', '#2dd4a7', '#2563eb', '#eab308', '#0f9a78', '#64748b']

function ChartsPanel({ stats, wardHealth }) {
  if (!stats) return null
  const typeData = Object.entries(stats.by_type).map(([name, value]) => ({
    name: ISSUE_TYPE_META[name]?.label || name,
    value,
  }))

  return (
    <div className="space-y-5">
      <div className="bg-ink-900 border border-ink-800 rounded-xl p-5">
        <h2 className="font-display font-medium text-sm mb-3">Issues by Type</h2>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={60} paddingAngle={2}>
                {typeData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#161d2c', border: '1px solid #2d3855', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
          {typeData.map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs text-ink-600">
              <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              {d.name} ({d.value})
            </div>
          ))}
        </div>
      </div>

      <div className="bg-ink-900 border border-ink-800 rounded-xl p-5">
        <h2 className="font-display font-medium text-sm mb-3">Ward Health Index</h2>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={wardHealth.map((w) => ({ name: w.ward.split(' - ')[1] || w.ward, value: w.health_index }))} layout="vertical" margin={{ left: 0 }}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#5d6b8a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#161d2c', border: '1px solid #2d3855', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {wardHealth.map((w, i) => (
                  <Cell key={i} fill={w.health_index >= 70 ? '#14b890' : w.health_index >= 40 ? '#f4670e' : '#dc2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function ForecastPanel({ data, days, setDays, resolveN, setResolveN }) {
  if (!data || data.length === 0) return null

  return (
    <div className="bg-ink-900 border border-ink-800 rounded-xl p-5">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-5">
        <div>
          <h2 className="font-display font-medium text-sm">Infrastructure Health Forecast</h2>
          <p className="text-xs text-ink-600 mt-1">Projected index over {days} days</p>
        </div>
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2 text-xs text-ink-300">
            <span>Intervention (resolve top issues):</span>
            <select 
              value={resolveN} 
              onChange={(e) => setResolveN(Number(e.target.value))}
              className="bg-ink-950 border border-ink-800 rounded px-2 py-1 outline-none"
            >
              <option value={0}>0 (Do nothing)</option>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
            </select>
          </label>
        </div>
      </div>
      
      <div className="h-48 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f4670e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f4670e" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorOptimized" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b890" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#14b890" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3855" vertical={false} />
            <XAxis dataKey="day" tickFormatter={(v) => `Day ${v}`} stroke="#5d6b8a" tick={{ fill: '#5d6b8a' }} />
            <YAxis domain={[0, 100]} stroke="#5d6b8a" tick={{ fill: '#5d6b8a' }} />
            <Tooltip 
              contentStyle={{ background: '#161d2c', border: '1px solid #2d3855', borderRadius: 8, color: '#fff' }}
              labelFormatter={(v) => `Day ${v}`}
            />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', color: '#5d6b8a' }} />
            <Area type="monotone" dataKey="current" name="Current Trajectory" stroke="#f4670e" fillOpacity={1} fill="url(#colorCurrent)" />
            <Area type="monotone" dataKey="optimized" name={`If Top ${resolveN} Resolved`} stroke="#14b890" fillOpacity={1} fill="url(#colorOptimized)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ContractorsPanel({ contractors }) {
  if (!contractors || contractors.length === 0) return null
  return (
    <div className="bg-ink-900 border border-ink-800 rounded-xl p-5">
      <h2 className="font-display font-medium text-sm mb-4 flex items-center gap-2 text-white">
        <Users className="w-4 h-4 text-ink-400" /> Contractor Leaderboard
      </h2>
      <div className="space-y-4">
        {contractors.map((c, i) => {
          const completionRate = c.issues_assigned > 0 ? (c.issues_resolved / c.issues_assigned) * 100 : 0
          return (
            <div key={c.id} className="group">
              <div className="flex justify-between items-center text-sm mb-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono text-ink-600 bg-ink-950 px-1.5 rounded">#{i + 1}</span>
                  <div className="text-ink-300 font-medium truncate max-w-[140px] group-hover:text-white transition-colors">{c.name}</div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-[10px] text-ink-500 font-medium tracking-wide uppercase">{c.issues_resolved}/{c.issues_assigned} done</span>
                  <span className="text-signal-400 font-display font-semibold">{Math.round(c.performance_score)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-ink-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-signal-500 to-signal-400 rounded-full" 
                  style={{ width: `${completionRate}%` }} 
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


function PriorityQueue({ issues, filterStatus, onFilterChange, onSelect, onStatusChange }) {
  return (
    <div className="bg-ink-900 border border-ink-800 rounded-xl flex flex-col max-h-[600px] lg:h-fit lg:sticky lg:top-[84px] lg:max-h-[calc(100vh-104px)]">
      <div className="px-5 py-3.5 border-b border-ink-800 flex justify-between items-center">
        <div>
          <h2 className="font-display font-medium text-sm mb-3">Priority Queue</h2>
          <div className="flex flex-wrap gap-1.5">
            {['all', 'reported', 'in_progress', 'resolved'].map((s) => (
              <button
                key={s}
                onClick={() => onFilterChange(s)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  filterStatus === s ? 'bg-signal-500 text-white' : 'bg-ink-800 text-ink-600 hover:text-white'
                }`}
              >
                {s === 'all' ? 'All' : STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>
        <button 
          onClick={() => api.downloadCSV('all')} 
          className="text-xs text-ink-300 hover:text-white bg-ink-800 hover:bg-ink-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="overflow-y-auto scroll-thin flex-1 divide-y divide-ink-800">
        {issues.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-ink-600">
            No issues yet. Click "Load Demo Data" or submit a citizen report.
          </div>
        )}
        {issues.map((issue) => (
          <IssueRow key={issue.id} issue={issue} onSelect={onSelect} onStatusChange={onStatusChange} />
        ))}
      </div>
    </div>
  )
}

function IssueRow({ issue, onSelect }) {
  const typeMeta = ISSUE_TYPE_META[issue.issue_type] || ISSUE_TYPE_META.other
  const sevMeta = SEVERITY_META[issue.severity_label] || SEVERITY_META.Low
  const statusMeta = STATUS_META[issue.status]

  return (
    <button onClick={() => onSelect(issue)} className="w-full text-left px-5 py-3.5 hover:bg-ink-800/50 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span>{typeMeta.icon}</span>
          <span className="font-medium text-sm truncate">{typeMeta.label}</span>
        </div>
        <span className="text-xs font-mono text-ink-600 shrink-0">#{issue.id}</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: sevMeta.color, background: `${sevMeta.color}1a` }}>
          {issue.severity_label}
        </span>
        <span className="text-[10px] text-ink-600">{issue.ward}</span>
        {issue.report_count > 1 && (
          <span className="text-[10px] bg-ink-800 text-ink-300 px-1.5 py-0.5 rounded-md flex items-center gap-1">
            <Users className="w-3 h-3" /> {issue.report_count}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusMeta.color }} />
          <span className="text-xs text-ink-600">{statusMeta.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {issue.status !== 'resolved' && issue.days_until_sla !== null && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${issue.sla_breach ? 'bg-red-500/10 text-red-400' : 'bg-sentinel-500/10 text-sentinel-400'}`}>
              {issue.sla_breach ? `Breached ${Math.abs(issue.days_until_sla)}d ago` : `${issue.days_until_sla}d left`}
            </span>
          )}
          <span className="text-xs text-ink-600">{timeAgo(issue.created_at)}</span>
        </div>
      </div>
      <div className="mt-2 h-1 bg-ink-800 rounded-full overflow-hidden">
        <div className="h-full bg-signal-500 rounded-full" style={{ width: `${issue.priority_score}%` }} />
      </div>
    </button>
  )
}

function IssueDetailModal({ issue, contractors, onClose, onStatusChange }) {
  const typeMeta = ISSUE_TYPE_META[issue.issue_type] || ISSUE_TYPE_META.other
  const sevMeta = SEVERITY_META[issue.severity_label] || SEVERITY_META.Low
  const [selectedContractor, setSelectedContractor] = useState(issue.contractor || '')
  const [afterImageFile, setAfterImageFile] = useState(null)
  const fileInputRef = useRef(null)

  function handleFileSelect(e) {
    if (e.target.files?.[0]) setAfterImageFile(e.target.files[0])
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-ink-900 border border-ink-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto scroll-thin" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{typeMeta.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold text-lg">{typeMeta.label}</h3>
                  {issue.report_count > 1 && (
                    <span className="text-xs bg-ink-800 text-ink-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {issue.report_count} Reports
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-600">#{issue.id} · {issue.ward}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-ink-600 hover:text-white text-xl leading-none">×</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-ink-600 font-medium uppercase tracking-wider">Before</span>
              <img src={issue.image_path} alt="Before" className="w-full h-40 object-cover rounded-xl border border-ink-800" />
            </div>
            {issue.after_image_path ? (
              <div className="space-y-1">
                <span className="text-[10px] text-ink-600 font-medium uppercase tracking-wider">After</span>
                <img src={issue.after_image_path} alt="After" className="w-full h-40 object-cover rounded-xl border border-ink-800" />
              </div>
            ) : (
              <div className="flex items-center justify-center border-2 border-dashed border-ink-800 rounded-xl h-40 mt-[18px]">
                {afterImageFile ? (
                  <div className="text-xs text-ink-300 text-center px-2">
                    <CheckCircle2 className="w-6 h-6 text-signal-400 mx-auto mb-1" />
                    After image selected
                  </div>
                ) : (
                  <div className="text-xs text-ink-600 text-center">No after image yet</div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Metric label="Severity" value={issue.severity_label} color={sevMeta.color} />
            <Metric label="Severity Score" value={`${issue.severity_score}/100`} />
            <Metric label="30-day Risk" value={`${issue.failure_probability_30d}%`} color="#f4670e" />
            <Metric label="Priority Score" value={`${issue.priority_score}/100`} />
          </div>

          {issue.status !== 'resolved' && issue.days_until_sla !== null && (
            <div className={`text-sm p-3 rounded-xl border ${issue.sla_breach ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-sentinel-500/5 border-sentinel-500/20 text-sentinel-400'}`}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium">SLA Status: </span>
                <span>{issue.sla_breach ? `Breached ${Math.abs(issue.days_until_sla)} days ago` : `${issue.days_until_sla} days remaining`}</span>
              </div>
            </div>
          )}

          <div className="text-sm space-y-2 border-t border-ink-800 pt-4">
            <Row label="Department" value={issue.assigned_department} />
            <Row label="Address" value={issue.address || '—'} />
            <div className="flex justify-between gap-4 items-center">
              <span className="text-ink-600 shrink-0">Contractor</span>
              <select
                value={selectedContractor}
                onChange={(e) => setSelectedContractor(e.target.value)}
                className="bg-ink-950 border border-ink-800 text-ink-300 text-xs rounded px-2 py-1 outline-none focus:border-signal-400"
              >
                <option value="">Unassigned</option>
                {contractors.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <Row label="Reported" value={timeAgo(issue.created_at)} />
            {issue.reporter_note && <Row label="Citizen note" value={issue.reporter_note} />}
          </div>

          <div className="border-t border-ink-800 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-ink-600">Update status</p>
              {!issue.after_image_path && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-signal-400 hover:text-signal-300 transition-colors"
                >
                  {afterImageFile ? 'Change after photo' : 'Attach after photo'}
                </button>
              )}
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
            <div className="flex gap-2">
              {['reported', 'in_progress', 'resolved'].map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(issue.id, s, selectedContractor, s === 'resolved' ? afterImageFile : null)}
                  className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors ${
                    issue.status === s ? 'bg-signal-500 text-white' : 'bg-ink-800 text-ink-600 hover:text-white'
                  }`}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, color }) {
  return (
    <div className="bg-ink-950 rounded-lg p-3">
      <div className="text-[11px] text-ink-600 mb-1">{label}</div>
      <div className="font-display font-semibold" style={color ? { color } : {}}>{value}</div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ink-600 shrink-0">{label}</span>
      <span className="text-right text-ink-300">{value}</span>
    </div>
  )
}
