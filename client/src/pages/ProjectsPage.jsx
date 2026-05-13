import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '../hooks/useData.js';
import { projectService } from '../services/api.js';
import {
  SectionLoader,
  EmptyState,
  Button,
  Modal,
  Input,
  Textarea,
} from '../components/ui/index.jsx';
import { FolderKanban, Plus, ArrowRight, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, isOverdue, daysUntil, getErrorMessage } from '../utils/helpers.js';

function CreateProjectModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', deadline: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function set(k) {
    return (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        deadline: form.deadline || undefined,
      };
      await projectService.create(payload);
      toast.success('Project created!');
      onCreated();
      onClose();
      setForm({ name: '', description: '', deadline: '' });
    } catch (err) {
      const fields = err?.response?.data?.details?.fields;
      if (fields) setErrors(fields);
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Project Name"
          placeholder="e.g. Mobile App v2"
          value={form.name}
          onChange={set('name')}
          required
          error={errors.name?.[0]}
        />
        <Textarea
          label="Description"
          placeholder="What is this project about?"
          value={form.description}
          onChange={set('description')}
        />
        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
            Deadline (optional)
          </label>
          <input
            type="date"
            value={form.deadline}
            onChange={set('deadline')}
            min={new Date().toISOString().split('T')[0]}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
          />
          {errors.deadline && (
            <p className="mt-1 text-xs text-rose-400">{errors.deadline[0]}</p>
          )}
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Project</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectsPage() {
  const { projects, loading, refetch } = useProjects();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={15} /> New Project
        </Button>
      </div>

      {loading ? (
        <SectionLoader />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={44} />}
          title="No projects yet"
          description="Create your first project to start managing tasks and team members."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> New Project
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const days = daysUntil(p.deadline);
            const overdue = p.deadline && isOverdue(p.deadline);
            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-700 hover:bg-slate-800/50 transition-all duration-150"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 group-hover:bg-slate-700 transition-colors">
                    <FolderKanban size={18} className="text-cyan-400" />
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md border font-medium ${
                      p.role === 'admin'
                        ? 'text-cyan-300 bg-cyan-950 border-cyan-800'
                        : 'text-slate-400 bg-slate-800 border-slate-700'
                    }`}
                  >
                    {p.role}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-200 mb-1 truncate">
                  {p.name}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4 min-h-[2.5rem]">
                  {p.description || 'No description'}
                </p>

                <div className="flex items-center justify-between">
                  {p.deadline ? (
                    <span
                      className={`flex items-center gap-1.5 text-xs ${
                        overdue ? 'text-rose-400' : 'text-slate-500'
                      }`}
                    >
                      <CalendarDays size={12} />
                      {overdue
                        ? `${Math.abs(days)}d overdue`
                        : `Due ${formatDate(p.deadline)}`}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">No deadline</span>
                  )}
                  <ArrowRight
                    size={15}
                    className="text-slate-600 group-hover:text-slate-400 transition-colors"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refetch}
      />
    </div>
  );
}
