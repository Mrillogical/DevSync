import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/helpers.js';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [form, setForm] = useState({ display_name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  function set(k) {
    return (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    try {
      await signup(form.email, form.password, form.display_name);
      navigate('/dashboard');
      toast.success('Account created! Welcome to DevSync 🎉');
    } catch (err) {
      const fields = err?.response?.data?.details?.fields;
      if (fields) setFieldErrors(fields);
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const Field = ({ name, label, type = 'text', placeholder }) => (
    <div>
      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={form[name]}
        onChange={set(name)}
        required
        className={`w-full rounded-xl border bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors focus:ring-1 focus:ring-cyan-500/30 ${
          fieldErrors[name] ? 'border-rose-600 focus:border-rose-500' : 'border-slate-700 focus:border-cyan-500'
        }`}
      />
      {fieldErrors[name] && (
        <p className="mt-1 text-xs text-rose-400">{fieldErrors[name][0]}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500 shadow-lg shadow-cyan-900/60">
            <Zap size={18} className="text-slate-950" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-slate-100 text-2xl tracking-tight">DevSync</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm p-8 shadow-2xl shadow-black/40">
          <h1 className="text-xl font-semibold text-slate-100 mb-1">Create account</h1>
          <p className="text-slate-500 text-sm mb-7">Start managing your team projects</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field name="display_name" label="Full Name" placeholder="Alex Rivera" />
            <Field name="email" label="Email" type="email" placeholder="you@example.com" />
            <Field name="password" label="Password" type="password" placeholder="Min. 8 characters" />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2.5 text-sm transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/40"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
              )}
              Create account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
