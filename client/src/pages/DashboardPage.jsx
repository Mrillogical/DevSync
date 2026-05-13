import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useProjects } from '../hooks/useData.js';
import { SectionLoader, EmptyState, Button } from '../components/ui/index.jsx';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Users,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { formatDate, isOverdue, daysUntil } from '../utils/helpers.js';

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex items-center gap-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
        <Icon size={20} className="text-current" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { projects, loading } = useProjects();

  const stats = useMemo(() => {
    const adminProjects = projects.filter((p) => p.role === 'admin');
    const memberProjects = projects.filter((p) => p.role === 'member');
    const overdue = projects.filter(
      (p) => p.deadline && isOverdue(p.deadline)
    );
    return {
      total: projects.length,
      admin: adminProjects.length,
      member: memberProjects.length,
      overdue: overdue.length,
    };
  }, [projects]);

  const recentProjects = projects.slice(0, 5);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">
          {greeting}, {user?.display_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Here's an overview of your workspace
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <SectionLoader />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total Projects"
              value={stats.total}
              icon={FolderKanban}
              color="bg-cyan-500/10 text-cyan-400"
            />
            <StatCard
              label="As Admin"
              value={stats.admin}
              icon={Users}
              color="bg-violet-500/10 text-violet-400"
            />
            <StatCard
              label="As Member"
              value={stats.member}
              icon={CheckCircle2}
              color="bg-emerald-500/10 text-emerald-400"
            />
            <StatCard
              label="Overdue"
              value={stats.overdue}
              icon={Clock}
              color="bg-rose-500/10 text-rose-400"
            />
          </div>

          {/* Recent Projects */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="font-semibold text-slate-200">Recent Projects</h2>
              <Link
                to="/projects"
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View all <ArrowRight size={13} />
              </Link>
            </div>

            {recentProjects.length === 0 ? (
              <EmptyState
                icon={<FolderKanban size={40} />}
                title="No projects yet"
                description="Create your first project to get started"
                action={
                  <Link to="/projects">
                    <Button size="sm">
                      <Plus size={14} /> New Project
                    </Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-slate-800">
                {recentProjects.map((p) => {
                  const days = daysUntil(p.deadline);
                  const overdue = p.deadline && isOverdue(p.deadline);
                  return (
                    <li key={p.id}>
                      <Link
                        to={`/projects/${p.id}`}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 flex-shrink-0">
                          <FolderKanban size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">
                            {p.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {p.description || 'No description'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-md border font-medium ${
                              p.role === 'admin'
                                ? 'text-cyan-300 bg-cyan-950 border-cyan-800'
                                : 'text-slate-400 bg-slate-800 border-slate-700'
                            }`}
                          >
                            {p.role}
                          </span>
                          {p.deadline && (
                            <span
                              className={`text-xs ${
                                overdue ? 'text-rose-400' : 'text-slate-500'
                              }`}
                            >
                              {overdue
                                ? `${Math.abs(days)}d overdue`
                                : `${days}d left`}
                            </span>
                          )}
                          <ArrowRight size={14} className="text-slate-600" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
