import { Link, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const links = [
  { to: '/', label: 'Home' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/archive', label: 'The Family Archive' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/for-families', label: 'For Families' },
  { to: '/early-access', label: 'Early Access' },
];

export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth() || {};

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header
      data-testid="site-nav"
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ${
        scrolled ? 'bg-[hsl(var(--aangan-ivory))]/85 backdrop-blur-md border-b border-black/5' : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 h-[72px] flex items-center justify-between">
        <Link to="/" data-testid="nav-logo" className="flex items-baseline gap-2 group">
          <span className="font-serif text-2xl md:text-[28px] tracking-tight text-[hsl(var(--aangan-forest))]">
            Aangan
          </span>
          <span className="font-hand text-base text-[hsl(var(--aangan-terracotta))] -ml-0.5">.</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-9">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={({ isActive }) =>
                `text-[13px] tracking-wide transition-opacity duration-300 ${
                  isActive
                    ? 'text-[hsl(var(--aangan-forest))] opacity-100'
                    : 'text-[hsl(var(--aangan-forest))]/70 hover:opacity-100'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <Link
          to={user ? '/app' : '/app/signup'}
          data-testid="nav-cta-begin-archive"
          className="hidden lg:inline-flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-[13px] tracking-wide hover:bg-[hsl(var(--aangan-charcoal))] transition-colors duration-300"
        >
          {user ? 'Open my Aangan' : 'Begin Your Archive'}
          <span className="opacity-70">→</span>
        </Link>

        {!user && (
          <Link
            to="/app/login"
            data-testid="nav-signin"
            className="hidden lg:inline-flex items-center text-[13px] text-[hsl(var(--aangan-forest))]/70 hover:text-[hsl(var(--aangan-forest))] mr-1"
          >
            Sign in
          </Link>
        )}

        <button
          data-testid="nav-mobile-toggle"
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden p-2 text-[hsl(var(--aangan-forest))]"
          aria-label="menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-[hsl(var(--aangan-ivory))] border-t border-black/5 px-6 py-6 space-y-4">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={`nav-mobile-${l.label.toLowerCase().replace(/\s+/g, '-')}`}
              className="block text-base text-[hsl(var(--aangan-forest))]"
            >
              {l.label}
            </NavLink>
          ))}
          <Link
            to="/early-access"
            data-testid="nav-mobile-cta"
            className="block w-full text-center mt-4 px-5 py-3 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm"
          >
            Begin Your Archive
          </Link>
        </div>
      )}
    </header>
  );
}
