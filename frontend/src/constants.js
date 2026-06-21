export const ISSUE_TYPE_META = {
  pothole: { label: 'Pothole', icon: '🕳️', color: '#f4670e' },
  garbage: { label: 'Garbage', icon: '🗑️', color: '#8b6f47' },
  waterlogging: { label: 'Waterlogging', icon: '💧', color: '#2563eb' },
  streetlight: { label: 'Streetlight', icon: '💡', color: '#eab308' },
  drainage: { label: 'Drainage', icon: '🌊', color: '#0f9a78' },
  other: { label: 'Other', icon: '⚠️', color: '#64748b' },
}

export const SEVERITY_META = {
  Critical: { color: '#dc2626', bg: '#fef2f2', ring: '#fecaca' },
  High: { color: '#ea580c', bg: '#fff7ed', ring: '#fed7aa' },
  Medium: { color: '#ca8a04', bg: '#fefce8', ring: '#fde68a' },
  Low: { color: '#16a34a', bg: '#f0fdf4', ring: '#bbf7d0' },
}

export const STATUS_META = {
  reported: { label: 'Reported', color: '#dc2626' },
  in_progress: { label: 'In Progress', color: '#ea580c' },
  resolved: { label: 'Resolved', color: '#16a34a' },
}

export function timeAgo(dateStr, t) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t ? t('just_now', 'just now') : 'just now'
  if (mins < 60) return t ? t('mins_ago', '{{count}}m ago', { count: mins }).replace('{{count}}', mins) : `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t ? t('hours_ago', '{{count}}h ago', { count: hrs }).replace('{{count}}', hrs) : `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return t ? t('days_ago', '{{count}}d ago', { count: days }).replace('{{count}}', days) : `${days}d ago`
}
