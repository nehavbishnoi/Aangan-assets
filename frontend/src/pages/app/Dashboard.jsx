import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchFamily, upcomingEvents } from '@/lib/api';
import { Plus, ArrowRight, Cake, CalendarHeart, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';

function fmtDate(iso) {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

function daysUntilBirthday(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    next.setFullYear(now.getFullYear() + 1);
  }
  return Math.round((next - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}

export default function Dashboard() {
  const { family } = useAuth();
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchFamily().then(setData).catch(() => {});
    upcomingEvents().then(setEvents).catch(() => {});
  }, []);

  const members = data?.members || [];

  return (
    <div data-testid="dashboard" className="max-w-[1100px]">
      <p className="eyebrow"><span className="rule" />Welcome home</p>
      <h1 className="font-serif text-5xl md:text-6xl mt-3 leading-[1]">My Aangan</h1>
      <p className="mt-3 font-hand text-2xl text-[hsl(var(--aangan-terracotta))]">
        The {family?.name || 'your'} family &middot; {members.length} {members.length === 1 ? 'member' : 'members'}
      </p>

      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          [members.length, 'Members', '/app/family'],
          [members.reduce((a, m) => a + (m.languages?.length || 0), 0), 'Languages'],
          [events.length, 'Upcoming days'],
          [data?.users?.length || 1, 'Signed in'],
        ].map(([n, l, to], i) => {
          const Tile = to ? Link : 'div';
          return (
            <Tile key={l} to={to} className={`border-l-2 border-[hsl(var(--aangan-terracotta))]/60 pl-4 ${to ? 'cursor-pointer' : ''}`} data-testid={`dash-stat-${i}`}>
              <p className="font-serif text-4xl md:text-5xl leading-none text-[hsl(var(--aangan-forest))]">{n}</p>
              <p className="mt-2 text-[11px] tracking-widest uppercase text-[hsl(var(--aangan-forest))]/65">{l}</p>
            </Tile>
          );
        })}
      </div>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-end justify-between mb-5">
            <h2 className="font-serif text-3xl">Recent members</h2>
            <Link to="/app/family/new" data-testid="dash-add-member" className="inline-flex items-center gap-1.5 text-sm bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] px-4 py-2.5">
              <Plus size={14} /> Add a member
            </Link>
          </div>
          {members.length === 0 && (
            <div className="p-8 border border-dashed border-black/15 bg-[hsl(var(--aangan-sand))]" data-testid="dash-empty">
              <p className="font-serif text-2xl">Your archive is quiet.</p>
              <p className="mt-2 text-[hsl(var(--aangan-forest))]/70 text-sm">Add a family member to begin. You can add yourself, your parents, grandparents, or your children &mdash; in any order.</p>
            </div>
          )}
          <ul className="divide-y divide-black/5">
            {members.slice(0, 6).map((m) => (
              <li key={m._id} data-testid={`dash-member-${m._id}`}>
                <Link to={`/app/family/${m._id}`} className="flex items-center gap-4 py-4 hover:bg-[hsl(var(--aangan-sand))]/60 -mx-2 px-2 transition-colors">
                  <Avatar m={m} />
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-xl truncate">{m.name}</p>
                    <p className="text-[12px] text-[hsl(var(--aangan-forest))]/65 truncate">
                      {m.relation_to_head || 'family'}{m.date_of_birth ? ` · born ${fmtDate(m.date_of_birth)}` : ''}
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-[hsl(var(--aangan-forest))]/40" />
                </Link>
              </li>
            ))}
          </ul>
          {members.length > 6 && (
            <Link to="/app/family" className="mt-4 inline-flex items-center gap-1.5 text-sm underline">View all <ArrowRight size={12} /></Link>
          )}
        </div>

        <aside>
          <h2 className="font-serif text-3xl mb-5">Upcoming days</h2>
          {events.length === 0 && <p className="text-[hsl(var(--aangan-forest))]/65 text-sm">Add birthdays, anniversaries, or a tradition in <Link to="/app/culture" className="underline">Culture</Link> to see them here.</p>}
          <ul className="space-y-3">
            {events.slice(0, 8).map((e, i) => {
              const Icon = e.kind === 'birthday' ? Cake : e.kind === 'anniversary' ? CalendarHeart : Sparkles;
              const tint = e.kind === 'birthday' ? 'marigold' : e.kind === 'anniversary' ? 'terracotta' : 'sage';
              return (
                <li key={i} data-testid={`dash-event-${i}`}>
                  <Link to={e.link} className="flex items-center gap-3 p-3 bg-[hsl(var(--aangan-sand))] hover:bg-[hsl(var(--aangan-marigold))]/15">
                    <Icon size={16} className={`text-[hsl(var(--aangan-${tint}))]`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[hsl(var(--aangan-forest))] truncate">{e.title}</p>
                      <p className="text-[11px] text-[hsl(var(--aangan-forest))]/60">{e.days === 0 ? 'Today' : `${e.days} day${e.days === 1 ? '' : 's'} away`}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}

export function Avatar({ m, size = 44 }) {
  const initials = (m.name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  if (m.photo_url) {
    return <img src={m.photo_url} alt={m.name} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full bg-[hsl(var(--aangan-marigold))]/30 text-[hsl(var(--aangan-forest))] flex items-center justify-center font-serif"
      style={{ width: size, height: size, fontSize: Math.max(13, size / 3) }}
    >
      {initials}
    </div>
  );
}
