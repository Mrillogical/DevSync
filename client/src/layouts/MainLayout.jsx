import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar } from '../components/ui/index.jsx';
import {
  LayoutDashboard,
  FolderKanban,
  LogOut,
  Menu,
  Zap,
} from 'lucide-react';

function NavItem({ to, icon: Icon, label, onClick }) {
  const base =
    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 w-full text-left';
  const active = 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
  const inactive = 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60';

  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} ${inactive}`}>
        <Icon size={17} />
        {label}
      </button>
    );
  }
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
    >
      <Icon size={17} />
      {label}
    </NavLink>
  );
}

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const sidebar = (
    <aside className="flex h-full flex-col bg-slate-900 border-r border-slate-800">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 shadow-lg shadow-cyan-900/50">
          <Zap size={16} className="text-slate-950" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-slate-100 tracking-tight text-lg">DevSync</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/projects" icon={FolderKanban} label="Projects" />
      </nav>

      <div className="border-t border-slate-800 px-3 py-4 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <Avatar name={user?.display_name || 'U'} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.display_name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <NavItem icon={LogOut} label="Sign out" onClick={handleLogout} />
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <div className="hidden md:flex md:w-60 flex-shrink-0">{sidebar}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 z-50">{sidebar}</div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-slate-200">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-cyan-400" />
            <span className="font-bold text-slate-100">DevSync</span>
          </div>
          <Avatar name={user?.display_name || 'U'} size="sm" />
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
