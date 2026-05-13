// Format date to readable string
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

export function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export const STATUS_COLORS = {
  todo: 'text-slate-400 bg-slate-800 border-slate-700',
  in_progress: 'text-blue-300 bg-blue-950 border-blue-800',
  review: 'text-amber-300 bg-amber-950 border-amber-800',
  done: 'text-emerald-300 bg-emerald-950 border-emerald-800',
};

export const PRIORITY_COLORS = {
  low: 'text-slate-400 bg-slate-800 border-slate-700',
  medium: 'text-amber-300 bg-amber-950 border-amber-800',
  high: 'text-rose-300 bg-rose-950 border-rose-800',
};

export const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export function getInitials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getErrorMessage(err) {
  return (
    err?.response?.data?.error ||
    err?.message ||
    'Something went wrong'
  );
}
