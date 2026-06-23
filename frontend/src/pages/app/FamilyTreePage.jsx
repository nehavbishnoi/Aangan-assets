import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchFamily } from '@/lib/api';
import { Plus, Heart } from 'lucide-react';
import { Avatar } from './Dashboard';

/**
 * Generation-aware family-tree layout.
 * Computes generation per member starting from the family head (gen 0).
 * Spouses share the same generation; children = gen+1; parents = gen-1.
 */
function computeGenerations(members, headId) {
  const byId = new Map(members.map((m) => [m._id, m]));
  const gen = new Map();
  if (!headId || !byId.has(headId)) {
    // fallback: place all at gen 0
    members.forEach((m) => gen.set(m._id, 0));
    return gen;
  }
  const queue = [[headId, 0]];
  while (queue.length) {
    const [id, g] = queue.shift();
    if (gen.has(id)) continue;
    gen.set(id, g);
    const m = byId.get(id);
    if (!m) continue;
    (m.parent_ids || []).forEach((p) => byId.has(p) && queue.push([p, g - 1]));
    (m.spouse_ids || []).forEach((s) => byId.has(s) && queue.push([s, g]));
    (m.child_ids || []).forEach((c) => byId.has(c) && queue.push([c, g + 1]));
  }
  members.forEach((m) => { if (!gen.has(m._id)) gen.set(m._id, 0); });
  return gen;
}

function groupSpouseClusters(membersAtGen) {
  // Cluster spouses together: returns a list of clusters; each cluster is an array of members (1 or more).
  const remaining = new Set(membersAtGen.map((m) => m._id));
  const clusters = [];
  for (const m of membersAtGen) {
    if (!remaining.has(m._id)) continue;
    const cluster = [m];
    remaining.delete(m._id);
    for (const sId of m.spouse_ids || []) {
      if (remaining.has(sId)) {
        const sp = membersAtGen.find((x) => x._id === sId);
        if (sp) { cluster.push(sp); remaining.delete(sId); }
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

const GEN_LABEL = {
  '-2': 'Grandparents',
  '-1': 'Parents & aunts/uncles',
  '0': 'You and your generation',
  '1': 'Children',
  '2': 'Grandchildren',
};

export default function FamilyTreePage() {
  const nav = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => { fetchFamily().then(setData).catch(() => {}); }, []);

  const members = data?.members || [];
  const headId = data?.family?.head_user_id
    ? data?.users?.find((u) => u._id === data.family.head_user_id)?.member_id
    : null;

  const gens = useMemo(() => computeGenerations(members, headId), [members, headId]);

  const byGen = useMemo(() => {
    const m = new Map();
    for (const mem of members) {
      const g = gens.get(mem._id) ?? 0;
      if (!m.has(g)) m.set(g, []);
      m.get(g).push(mem);
    }
    return new Map([...m.entries()].sort((a, b) => a[0] - b[0]));
  }, [members, gens]);

  return (
    <div data-testid="family-tree-page" className="max-w-[1280px]">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="eyebrow">Family tree</p>
          <h1 className="font-serif text-5xl md:text-6xl mt-3 leading-[1]">Everyone, together.</h1>
          <p className="mt-3 text-[hsl(var(--aangan-forest))]/70 max-w-xl">
            Add members in any order &mdash; parents, spouse, children, in-laws. The tree organises itself by generation. Click any face to see their story.
          </p>
        </div>
        <button
          onClick={() => nav('/app/family/new')}
          data-testid="tree-add-member"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm"
        >
          <Plus size={14} /> Add a member
        </button>
      </div>

      {members.length === 0 && (
        <div className="mt-12 p-10 border border-dashed border-black/15 bg-[hsl(var(--aangan-sand))]">
          <p className="font-serif text-2xl">No one here yet.</p>
          <p className="mt-2 text-sm text-[hsl(var(--aangan-forest))]/70">Begin with yourself, or with a grandparent &mdash; whichever feels right.</p>
          <Link to="/app/family/new" className="mt-4 inline-flex items-center gap-2 text-sm bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] px-4 py-2.5"><Plus size={14}/> Add the first member</Link>
        </div>
      )}

      <div className="mt-14 space-y-16">
        {[...byGen.entries()].map(([g, list]) => {
          const clusters = groupSpouseClusters(list);
          return (
            <section key={g} data-testid={`tree-gen-${g}`}>
              <p className="eyebrow mb-5">{GEN_LABEL[String(g)] || `Generation ${g}`}</p>
              <div className="flex flex-wrap gap-x-12 gap-y-8">
                {clusters.map((cl, ci) => (
                  <div key={ci} className="flex items-center gap-3">
                    {cl.map((m, idx) => (
                      <div key={m._id} className="flex items-center gap-3">
                        {idx > 0 && (
                          <div className="flex flex-col items-center text-[hsl(var(--aangan-terracotta))]">
                            <Heart size={14} fill="currentColor" />
                            <div className="w-px h-3 bg-[hsl(var(--aangan-terracotta))]/60 mt-0.5" />
                          </div>
                        )}
                        <Link
                          to={`/app/family/${m._id}`}
                          data-testid={`tree-node-${m._id}`}
                          className="group flex flex-col items-center min-w-[112px]"
                        >
                          <div className="ring-1 ring-black/5 rounded-full p-1 bg-[hsl(var(--aangan-ivory))] group-hover:ring-[hsl(var(--aangan-terracotta))] transition-shadow shadow-sm">
                            <Avatar m={m} size={72} />
                          </div>
                          <p className="mt-3 font-serif text-base text-[hsl(var(--aangan-forest))] text-center max-w-[140px]">{m.name}</p>
                          {m.relation_to_head && (
                            <p className="text-[11px] text-[hsl(var(--aangan-forest))]/55">{m.relation_to_head}</p>
                          )}
                        </Link>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
