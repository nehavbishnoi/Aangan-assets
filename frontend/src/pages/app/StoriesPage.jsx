import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { allStories } from '@/lib/api';
import { Globe, Lock, ArrowRight } from 'lucide-react';

const TAGS = ['All', 'Member story', 'Recipe', 'Culture', 'Ritual'];
const KIND_LABEL = { member_story: 'Member story', recipe: 'Recipe', culture: 'Culture', ritual: 'Ritual' };

export default function StoriesPage() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => { allStories().then((r) => { setRows(r); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const filtered = rows.filter((r) => filter === 'All' || KIND_LABEL[r.kind] === filter);

  return (
    <div data-testid="stories-page" className="max-w-[1080px]">
      <p className="eyebrow">Stories</p>
      <h1 className="font-serif text-5xl md:text-6xl mt-3 leading-[1]">All the things you&rsquo;ve kept.</h1>
      <p className="mt-3 text-[hsl(var(--aangan-forest))]/70 max-w-xl">Every story across your family archive &mdash; about people, recipes, traditions, and rituals.</p>

      <div className="mt-8 flex flex-wrap gap-2">
        {TAGS.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            data-testid={`stories-tab-${t.toLowerCase().replace(/\s+/g, '-')}`}
            className={`px-3 py-1.5 text-[12px] tracking-wide border ${
              filter === t
                ? 'bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] border-[hsl(var(--aangan-forest))]'
                : 'border-[hsl(var(--aangan-forest))]/20 text-[hsl(var(--aangan-forest))]/70 hover:border-[hsl(var(--aangan-forest))]/50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && <p className="mt-12 text-[hsl(var(--aangan-forest))]/55">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <div className="mt-12 p-10 border border-dashed border-black/15 bg-[hsl(var(--aangan-sand))]">
          <p className="font-serif text-2xl">No stories yet in this section.</p>
          <p className="mt-2 text-sm text-[hsl(var(--aangan-forest))]/70">Begin by adding a recipe, a tradition, or a story about a family member.</p>
        </div>
      )}

      <ul className="mt-8 divide-y divide-black/5">
        {filtered.map((s) => (
          <li key={`${s.kind}-${s._id}`} data-testid={`story-row-${s.kind}-${s._id}`}>
            <Link to={s.link} className="flex items-start gap-5 py-5 hover:bg-[hsl(var(--aangan-sand))]/60 -mx-2 px-2">
              <div className="w-20 shrink-0">
                <span className="eyebrow text-[10px]">{KIND_LABEL[s.kind] || s.kind}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-2xl text-[hsl(var(--aangan-forest))]">{s.title || '(untitled)'}</h3>
                {s.about && <p className="mt-0.5 text-[12px] text-[hsl(var(--aangan-forest))]/55">About: {s.about}{s.when_rule ? ` · ${s.when_rule}` : ''}{s.occasions?.length ? ` · ${s.occasions.join(', ')}` : ''}</p>}
                {s.content && <p className="mt-2 text-[hsl(var(--aangan-forest))]/80 line-clamp-2 leading-relaxed">{s.content}</p>}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {s.is_public ? <Globe size={12} className="text-[hsl(var(--aangan-sage))]" /> : <Lock size={12} className="text-[hsl(var(--aangan-forest))]/45" />}
                <ArrowRight size={13} className="text-[hsl(var(--aangan-forest))]/40" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
