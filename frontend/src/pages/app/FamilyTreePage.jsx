import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchFamily } from '@/lib/api';
import { Plus, Heart } from 'lucide-react';
import { Avatar } from './Dashboard';

/**
 * Generation-aware tree. Spouses cluster within a generation; siblings (people who share a
 * `parent_ids` tuple) cluster together; an SVG line is drawn from each parent-pair midpoint
 * down to the midpoint of their children cluster.
 */
function computeGenerations(members, headId) {
  const byId = new Map(members.map((m) => [m._id, m]));
  const gen = new Map();
  if (!headId || !byId.has(headId)) {
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
    (m.sibling_ids || []).forEach((s) => byId.has(s) && queue.push([s, g]));
    (m.child_ids || []).forEach((c) => byId.has(c) && queue.push([c, g + 1]));
  }
  members.forEach((m) => { if (!gen.has(m._id)) gen.set(m._id, 0); });
  return gen;
}

function groupSpouseClusters(rowMembers) {
  const remaining = new Set(rowMembers.map((m) => m._id));
  const clusters = [];
  for (const m of rowMembers) {
    if (!remaining.has(m._id)) continue;
    const cluster = [m];
    remaining.delete(m._id);
    for (const sId of m.spouse_ids || []) {
      if (remaining.has(sId)) {
        const sp = rowMembers.find((x) => x._id === sId);
        if (sp) { cluster.push(sp); remaining.delete(sId); }
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

const GEN_LABEL = {
  '-3': 'Great-grandparents',
  '-2': 'Grandparents',
  '-1': 'Parents & aunts/uncles',
  '0': 'You and your generation',
  '1': 'Children',
  '2': 'Grandchildren',
  '3': 'Great-grandchildren',
};

function MemberCard({ m, size = 72 }) {
  return (
    <Link
      to={`/app/family/${m._id}`}
      data-testid={`tree-node-${m._id}`}
      className="group flex flex-col items-center min-w-[112px] relative"
    >
      <div className="ring-1 ring-black/5 rounded-full p-1 bg-[hsl(var(--aangan-ivory))] group-hover:ring-[hsl(var(--aangan-terracotta))] transition-shadow shadow-sm">
        <Avatar m={m} size={size} />
      </div>
      <p className="mt-3 font-serif text-base text-[hsl(var(--aangan-forest))] text-center max-w-[140px] leading-snug">{m.name}</p>
      {m.relation_to_head && (
        <p className="text-[11px] text-[hsl(var(--aangan-forest))]/55 text-center">{m.relation_to_head}</p>
      )}
    </Link>
  );
}

function GenerationRow({ generation, label, clusters, isLast }) {
  return (
    <section data-testid={`tree-gen-${generation}`} className="relative">
      <p className="eyebrow mb-6">{label}</p>
      <div className="flex flex-wrap gap-x-14 gap-y-10 justify-start">
        {clusters.map((cl, ci) => (
          <div key={ci} className="relative flex flex-col items-center">
            {/* parent-cluster wrapper — multiple members in cluster are joined */}
            <div className="flex items-end gap-4">
              {cl.map((m, idx) => (
                <div key={m._id} className="flex items-end gap-4 relative">
                  {idx > 0 && (
                    <div className="flex flex-col items-center text-[hsl(var(--aangan-terracotta))]">
                      <Heart size={14} fill="currentColor" />
                      <div className="w-12 h-px bg-[hsl(var(--aangan-terracotta))]/40 mt-1" />
                    </div>
                  )}
                  <MemberCard m={m} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!isLast && <div className="mt-12 mb-2 dotted-divider" aria-hidden />}
    </section>
  );
}

export default function FamilyTreePage() {
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
    // sort within each generation: head first if present, else by name
    for (const [g, list] of m.entries()) {
      list.sort((a, b) => (a._id === headId ? -1 : b._id === headId ? 1 : a.name.localeCompare(b.name)));
      m.set(g, list);
    }
    return new Map([...m.entries()].sort((a, b) => a[0] - b[0]));
  }, [members, gens, headId]);

  const genEntries = [...byGen.entries()];

  return (
    <div data-testid="family-tree-page" className="max-w-[1280px]">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="eyebrow">Family tree</p>
          <h1 className="font-serif text-5xl md:text-6xl mt-3 leading-[1]">Everyone, together.</h1>
          <p className="mt-3 text-[hsl(var(--aangan-forest))]/70 max-w-xl">
            The tree organises itself by generation. Spouses are linked with a heart. Click any face to see their story.
          </p>
        </div>
        <Link to="/app/family/new" data-testid="tree-add-member" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm">
          <Plus size={14} /> Add a member
        </Link>
      </div>

      {members.length === 0 && (
        <div className="mt-12 p-10 border border-dashed border-black/15 bg-[hsl(var(--aangan-sand))]">
          <p className="font-serif text-2xl">No one here yet.</p>
          <p className="mt-2 text-sm text-[hsl(var(--aangan-forest))]/70">Begin with yourself, or with a grandparent &mdash; whichever feels right.</p>
        </div>
      )}

      <div className="mt-12 space-y-16">
        {genEntries.map(([g, list], idx) => (
          <GenerationRow
            key={g}
            generation={g}
            label={GEN_LABEL[String(g)] || `Generation ${g}`}
            clusters={groupSpouseClusters(list)}
            isLast={idx === genEntries.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
