import { Link, NavLink, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { LogOut, Home, Users, MessageCircleHeart, Settings, UserPlus, BookHeart, Utensils, Sparkles, Flame } from 'lucide-react';

const navLinks = [
  { to: '/app', icon: Home, label: 'My Aangan', end: true, testid: 'appnav-home' },
  { to: '/app/family', icon: Users, label: 'Family tree', testid: 'appnav-family' },
  { to: '/app/recipes', icon: Utensils, label: 'Recipes', testid: 'appnav-recipes' },
  { to: '/app/culture', icon: Sparkles, label: 'Culture', testid: 'appnav-culture' },
  { to: '/app/rituals', icon: Flame, label: 'Rituals', testid: 'appnav-rituals' },
  { to: '/app/stories', icon: BookHeart, label: 'Stories', testid: 'appnav-stories' },
  { to: '/app/ask', icon: MessageCircleHeart, label: 'Ask Aangan', testid: 'appnav-ask' },
  { to: '/app/invite', icon: UserPlus, label: 'Invite', testid: 'appnav-invite' },
  { to: '/app/settings', icon: Settings, label: 'Settings', testid: 'appnav-settings' },
];

export default function AppLayout() {
  const { user, family, logout } = useAuth();
  const nav = useNavigate();

  if (user === undefined) {
    return <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--aangan-ivory))] text-[hsl(var(--aangan-forest))]/60">Opening your Aangan...</div>;
  }
  if (user === null) {
    return <Navigate to="/app/login" replace />;
  }

  const onLogout = async () => {
    await logout();
    nav('/');
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[260px_1fr] bg-[hsl(var(--aangan-ivory))] grain relative z-10">
      <aside className="lg:sticky lg:top-0 lg:h-screen border-b lg:border-b-0 lg:border-r border-black/5 px-6 py-8 bg-[hsl(var(--aangan-sand))]">
        <Link to="/app" className="flex items-baseline gap-1.5" data-testid="appnav-logo">
          <span className="font-serif text-2xl text-[hsl(var(--aangan-forest))]">Aangan</span>
          <span className="font-hand text-[hsl(var(--aangan-terracotta))]">.</span>
        </Link>
        <p className="mt-1 text-[12px] text-[hsl(var(--aangan-forest))]/65">
          {family?.name ? `The ${family.name} family` : 'Your family'}
        </p>

        <nav className="mt-10 space-y-1">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              data-testid={l.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))]'
                    : 'text-[hsl(var(--aangan-forest))]/75 hover:bg-[hsl(var(--aangan-ivory))]/60'
                }`
              }
            >
              <l.icon size={15} /> {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-10 pt-6 border-t border-black/10">
          <p className="text-sm text-[hsl(var(--aangan-forest))]">{user.name}</p>
          <p className="text-[12px] text-[hsl(var(--aangan-forest))]/55">{user.email}</p>
          <button
            data-testid="appnav-logout"
            onClick={onLogout}
            className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-[hsl(var(--aangan-forest))]/70 hover:text-[hsl(var(--aangan-terracotta))]"
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </aside>

      <main className="px-6 md:px-10 py-10 md:py-14">
        <Outlet />
      </main>
    </div>
  );
}
