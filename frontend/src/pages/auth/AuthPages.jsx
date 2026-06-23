import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { getInvite } from '@/lib/api';

const wrap = 'min-h-screen bg-[hsl(var(--aangan-ivory))] grain flex items-center justify-center px-6 py-24 relative z-10';
const card = 'bg-[hsl(var(--aangan-sand))] p-8 md:p-10 max-w-md w-full';

function FieldStr({ label, value, onChange, type = 'text', testid, placeholder, required }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}{required && <span className="text-[hsl(var(--aangan-terracotta))]"> *</span>}</span>
      <input
        data-testid={testid}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full bg-transparent border-b border-[hsl(var(--aangan-forest))]/30 focus:border-[hsl(var(--aangan-forest))] outline-none py-2 text-[hsl(var(--aangan-forest))] font-serif text-lg"
      />
    </label>
  );
}

function Footer() {
  return (
    <p className="mt-6 flex items-center gap-2 text-[11px] text-[hsl(var(--aangan-forest))]/55">
      <ShieldCheck size={12} className="text-[hsl(var(--aangan-sage))]" />
      Private by default. Your family stories belong only to your family.
    </p>
  );
}

export function SignupPage() {
  const nav = useNavigate();
  const { signup, user } = useAuth();
  const [f, setF] = useState({ family_name: '', name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) nav('/app'); }, [user, nav]);

  const submit = async (e) => {
    e.preventDefault();
    if (!f.family_name || !f.name || !f.email || !f.password) {
      toast.error('Please fill all fields.'); return;
    }
    setLoading(true);
    try {
      await signup(f);
      toast.success('Welcome home.');
      nav('/app');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not sign up.');
    } finally { setLoading(false); }
  };

  return (
    <div className={wrap} data-testid="signup-page">
      <div className={card}>
        <p className="eyebrow">Begin your family Aangan</p>
        <h1 className="font-serif text-4xl mt-3 text-[hsl(var(--aangan-forest))]">Create your archive</h1>
        <p className="mt-3 text-[hsl(var(--aangan-forest))]/70 text-sm">
          You become the family head. You can invite others in a moment.
        </p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <FieldStr label="Family name" testid="signup-family" value={f.family_name} onChange={(v) => setF({ ...f, family_name: v })} placeholder="The Sharma family" required />
          <FieldStr label="Your name" testid="signup-name" value={f.name} onChange={(v) => setF({ ...f, name: v })} placeholder="Riya Sharma" required />
          <FieldStr label="Email" type="email" testid="signup-email" value={f.email} onChange={(v) => setF({ ...f, email: v })} placeholder="you@family.email" required />
          <FieldStr label="Password (min 6)" type="password" testid="signup-password" value={f.password} onChange={(v) => setF({ ...f, password: v })} placeholder="••••••••" required />
          <button data-testid="signup-submit" disabled={loading} className="w-full mt-3 inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm disabled:opacity-50">
            {loading ? 'Creating...' : 'Create my family Aangan'} <ArrowRight size={14} />
          </button>
        </form>
        <p className="mt-6 text-sm text-[hsl(var(--aangan-forest))]/70">
          Already have an account? <Link to="/app/login" data-testid="signup-link-login" className="underline hover:text-[hsl(var(--aangan-terracotta))]">Sign in</Link>
        </p>
        <Footer />
      </div>
    </div>
  );
}

export function LoginPage() {
  const nav = useNavigate();
  const { login, user } = useAuth();
  const [f, setF] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) nav('/app'); }, [user, nav]);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await login(f);
      nav('/app');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Wrong email or password.');
    } finally { setLoading(false); }
  };

  return (
    <div className={wrap} data-testid="login-page">
      <div className={card}>
        <p className="eyebrow">Welcome back</p>
        <h1 className="font-serif text-4xl mt-3 text-[hsl(var(--aangan-forest))]">Sign in</h1>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <FieldStr label="Email" type="email" testid="login-email" value={f.email} onChange={(v) => setF({ ...f, email: v })} required />
          <FieldStr label="Password" type="password" testid="login-password" value={f.password} onChange={(v) => setF({ ...f, password: v })} required />
          <button data-testid="login-submit" disabled={loading} className="w-full mt-3 inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign in'} <ArrowRight size={14} />
          </button>
        </form>
        <p className="mt-6 text-sm text-[hsl(var(--aangan-forest))]/70">
          New here? <Link to="/app/signup" data-testid="login-link-signup" className="underline hover:text-[hsl(var(--aangan-terracotta))]">Start your family Aangan</Link>
        </p>
        <Footer />
      </div>
    </div>
  );
}

export function AcceptInvitePage() {
  const { token } = useParams();
  const nav = useNavigate();
  const { acceptInvite, user } = useAuth();
  const [invite, setInvite] = useState(null);
  const [err, setErr] = useState(null);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) { nav('/app'); return; }
    getInvite(token).then(setInvite).catch((e) => setErr(e.response?.data?.detail || 'Invitation not found'));
  }, [token, user, nav]);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await acceptInvite({ token, ...f });
      toast.success(`Welcome to ${invite?.family_name || 'the family'}.`);
      nav('/app');
    } catch (er) {
      toast.error(er.response?.data?.detail || 'Could not accept invite.');
    } finally { setLoading(false); }
  };

  if (err) return (
    <div className={wrap}><div className={card}>
      <h1 className="font-serif text-3xl text-[hsl(var(--aangan-forest))]">Invitation expired</h1>
      <p className="mt-3 text-[hsl(var(--aangan-forest))]/70">{err}</p>
      <Link to="/" className="mt-6 inline-flex underline">Go home</Link>
    </div></div>
  );
  if (!invite) return (
    <div className={wrap}><div className={card}><p className="text-[hsl(var(--aangan-forest))]/60">Opening invitation...</p></div></div>
  );

  return (
    <div className={wrap} data-testid="accept-invite-page">
      <div className={card}>
        <p className="eyebrow">You&rsquo;re invited</p>
        <h1 className="font-serif text-4xl mt-3 text-[hsl(var(--aangan-forest))]">Join {invite.family_name}&rsquo;s Aangan</h1>
        <p className="mt-3 font-hand text-xl text-[hsl(var(--aangan-terracotta))]">A quiet welcome.</p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <FieldStr label="Your name" testid="accept-name" value={f.name} onChange={(v) => setF({ ...f, name: v })} required />
          <FieldStr label="Email" type="email" testid="accept-email" value={f.email} onChange={(v) => setF({ ...f, email: v })} required />
          <FieldStr label="Password" type="password" testid="accept-password" value={f.password} onChange={(v) => setF({ ...f, password: v })} required />
          <button data-testid="accept-submit" disabled={loading} className="w-full mt-3 inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm disabled:opacity-50">
            {loading ? 'Joining...' : 'Join my family'} <ArrowRight size={14} />
          </button>
        </form>
        <Footer />
      </div>
    </div>
  );
}
