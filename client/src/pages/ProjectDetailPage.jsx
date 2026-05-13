import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useProject, useTasks, useMembers } from '../hooks/useData.js';
import { projectService, taskService, memberService } from '../services/api.js';
import {
  SectionLoader,
  Button,
  Modal,
  Input,
  Textarea,
  Select,
  Avatar,
  Badge,
  EmptyState,
  ConfirmDialog,
} from '../components/ui/index.jsx';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Users,
  CheckSquare,
  CalendarDays,
  UserPlus,
  MoreHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  formatDate,
  isOverdue,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  getErrorMessage,
} from '../utils/helpers.js';

function CreateTaskModal({ open, onClose, onCreated, projectId, members }) {
  const blank = {
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    assignee_id: '',
    due_at: '',
  };
  const [form, setForm] = useState(blank);
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
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        status: form.status,
        assignee_id: form.assignee_id || undefined,
        due_at: form.due_at ? new Date(form.due_at).toISOString() : undefined,
      };
      await taskService.create(projectId, payload);
      toast.success('Task created!');
      onCreated();
      onClose();
      setForm(blank);
    } catch (err) {
      const fields = err?.response?.data?.details?.fields;
      if (fields) setErrors(fields);
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Task" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          placeholder="Task title"
          value={form.title}
          onChange={set('title')}
          required
          error={errors.title?.[0]}
        />
        <Textarea
          label="Description"
          placeholder="Describe this task..."
          value={form.description}
          onChange={set('description')}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Priority" value={form.priority} onChange={set('priority')}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
          <Select label="Status" value={form.status} onChange={set('status')}>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </Select>
        </div>
        <Select
          label="Assign to"
          value={form.assignee_id}
          onChange={set('assignee_id')}
          error={errors.assignee_id?.[0]}
        >
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.display_name}
            </option>
          ))}
        </Select>
        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
            Due Date
          </label>
          <input
            type="date"
            value={form.due_at}
            onChange={set('due_at')}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
          />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Task</Button>
        </div>
      </form>
    </Modal>
  );
}

function InviteMemberModal({ open, onClose, onInvited, projectId }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await memberService.add(projectId, email, role);
      toast.success('Member added!');
      onInvited();
      onClose();
      setEmail('');
      setRole('member');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="teammate@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </Select>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>
            <UserPlus size={14} /> Invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TaskStatusBadge({ task, projectId, myRole, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function updateStatus(status) {
    setLoading(true);
    try {
      await taskService.update(projectId, task.id, { status });
      toast.success('Status updated');
      onUpdated();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  const canEdit = myRole === 'admin' || task.assignee_id !== null;

  return (
    <div className="relative">
      <button
        onClick={() => canEdit && setOpen((o) => !o)}
        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${STATUS_COLORS[task.status] || STATUS_COLORS.todo} ${canEdit ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
        disabled={loading}
      >
        {STATUS_LABELS[task.status] || task.status}
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-20 w-36 rounded-xl border border-slate-700 bg-slate-900 shadow-xl py-1">
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <button
              key={val}
              onClick={() => updateStatus(val)}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { project, loading: pLoading, error: pError, refetch: refetchProject } = useProject(projectId);
  const { tasks, loading: tLoading, refetch: refetchTasks } = useTasks(projectId);
  const { members, loading: mLoading, refetch: refetchMembers } = useMembers(projectId);

  const [tab, setTab] = useState('tasks');
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const myRole = project?.role || members.find((m) => m.user_id === user?.id)?.role;
  const isAdmin = myRole === 'admin';

  async function handleDeleteProject() {
    setDeleteLoading(true);
    try {
      await projectService.delete(projectId);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleRemoveMember() {
    if (!removeTarget) return;
    try {
      await memberService.remove(projectId, removeTarget.user_id);
      toast.success(`${removeTarget.display_name} removed`);
      refetchMembers();
      setRemoveTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (pLoading) return <SectionLoader />;
  if (pError || !project) {
    return (
      <div className="p-8 text-center text-slate-500">
        Project not found.{' '}
        <Link to="/projects" className="text-cyan-400 hover:underline">Go back</Link>
      </div>
    );
  }

  const overdue = project.deadline && isOverdue(project.deadline);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Back */}
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> Projects
      </Link>

      {/* Project header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-xl font-bold text-slate-100">{project.name}</h1>
              <span
                className={`text-xs px-2 py-0.5 rounded-md border font-medium ${
                  isAdmin
                    ? 'text-cyan-300 bg-cyan-950 border-cyan-800'
                    : 'text-slate-400 bg-slate-800 border-slate-700'
                }`}
              >
                {myRole}
              </span>
            </div>
            {project.description && (
              <p className="text-slate-400 text-sm mb-3">{project.description}</p>
            )}
            <div className="flex items-center gap-5 text-xs text-slate-500 flex-wrap">
              {project.deadline && (
                <span className={`flex items-center gap-1.5 ${overdue ? 'text-rose-400' : ''}`}>
                  <CalendarDays size={12} />
                  Deadline: {formatDate(project.deadline)}
                  {overdue && ' (overdue)'}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users size={12} />
                {members.length} member{members.length !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckSquare size={12} />
                {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-400 transition-colors flex-shrink-0 border border-rose-900 hover:border-rose-700 rounded-lg px-3 py-1.5"
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-800">
        {['tasks', 'members'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'text-cyan-400 border-cyan-400'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            {t === 'tasks' ? `Tasks (${tasks.length})` : `Members (${members.length})`}
          </button>
        ))}
      </div>

      {/* Tasks Tab */}
      {tab === 'tasks' && (
        <div>
          {isAdmin && (
            <div className="flex justify-end mb-4">
              <Button onClick={() => setCreateTaskOpen(true)}>
                <Plus size={15} /> New Task
              </Button>
            </div>
          )}
          {tLoading ? (
            <SectionLoader />
          ) : tasks.length === 0 ? (
            <EmptyState
              icon={<CheckSquare size={40} />}
              title="No tasks yet"
              description={isAdmin ? 'Create the first task for this project' : 'No tasks assigned to you yet'}
              action={
                isAdmin && (
                  <Button onClick={() => setCreateTaskOpen(true)}>
                    <Plus size={14} /> New Task
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const taskOverdue = task.due_at && isOverdue(task.due_at);
                const assignee = members.find((m) => m.user_id === task.assignee_id);
                return (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium text-slate-200">
                            {task.title}
                          </span>
                          <Badge className={PRIORITY_COLORS[task.priority]}>
                            {PRIORITY_LABELS[task.priority]}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-xs text-slate-500 mb-2 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                          <TaskStatusBadge
                            task={task}
                            projectId={projectId}
                            myRole={myRole}
                            onUpdated={refetchTasks}
                          />
                          {assignee && (
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Avatar name={assignee.display_name} size="xs" />
                              {assignee.display_name}
                            </span>
                          )}
                          {task.due_at && (
                            <span
                              className={`text-xs flex items-center gap-1 ${
                                taskOverdue ? 'text-rose-400' : 'text-slate-500'
                              }`}
                            >
                              <CalendarDays size={11} />
                              {formatDate(task.due_at)}
                              {taskOverdue && ' ⚠'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <div>
          {isAdmin && (
            <div className="flex justify-end mb-4">
              <Button onClick={() => setInviteOpen(true)}>
                <UserPlus size={15} /> Invite Member
              </Button>
            </div>
          )}
          {mLoading ? (
            <SectionLoader />
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.user_id}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 flex items-center gap-4"
                >
                  <Avatar name={m.display_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">{m.display_name}</p>
                    <p className="text-xs text-slate-500">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md border font-medium ${
                        m.role === 'admin'
                          ? 'text-cyan-300 bg-cyan-950 border-cyan-800'
                          : 'text-slate-400 bg-slate-800 border-slate-700'
                      }`}
                    >
                      {m.role}
                    </span>
                    {isAdmin && m.user_id !== user?.id && (
                      <button
                        onClick={() => setRemoveTarget(m)}
                        className="text-slate-600 hover:text-rose-400 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateTaskModal
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        onCreated={refetchTasks}
        projectId={projectId}
        members={members}
      />
      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={refetchMembers}
        projectId={projectId}
      />
      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteProject}
        loading={deleteLoading}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
      />
      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message={`Remove ${removeTarget?.display_name} from this project?`}
      />
    </div>
  );
}
