import { useState } from 'react';
import { Trash2, Plus, ArrowRight } from 'lucide-react';
import { RELATION_GROUPS } from '@/lib/relations';

/**
 * Visual relationships editor — shows existing links as a "workflow" with the
 * subject (current member) in the middle and connectors out to each related member.
 *
 * Value shape:
 *   { parent_ids: [], spouse_ids: [], child_ids: [], sibling_ids: [],
 *     extended_relations: [{ member_id, label }] }
 *
 * `others` = all OTHER members in the family (excluding the subject).
 */
export default function RelationshipsEditor({ value, onChange, others, subjectName = 'this person' }) {
  const [picker, setPicker] = useState(null); // { bucket, prefillLabel }
  const v = value || { parent_ids: [], spouse_ids: [], child_ids: [], sibling_ids: [], extended_relations: [] };
  const findName = (id) => others.find((m) => m._id === id)?.name || '(unknown)';

  const buckets = [
    { id: 'parent_ids', label: 'Parents (above)', dir: 'up', tint: 'sage' },
    { id: 'spouse_ids', label: 'Spouse(s)', dir: 'side', tint: 'terracotta' },
    { id: 'sibling_ids', label: 'Siblings', dir: 'side', tint: 'marigold' },
    { id: 'child_ids', label: 'Children (below)', dir: 'down', tint: 'sage' },
  ];

  const add = (bucket, id, label) => {
    if (!id) return;
    if (bucket === 'extended_relations') {
      const next = [...(v.extended_relations || []), { member_id: id, label: label || 'Relative' }];
      onChange({ ...v, extended_relations: next });
    } else {
      if ((v[bucket] || []).includes(id)) return;
      onChange({ ...v, [bucket]: [...(v[bucket] || []), id] });
    }
    setPicker(null);
  };

  const remove = (bucket, id) => {
    if (bucket === 'extended_relations') {
      onChange({ ...v, extended_relations: (v.extended_relations || []).filter((x) => x.member_id !== id) });
    } else {
      onChange({ ...v, [bucket]: (v[bucket] || []).filter((x) => x !== id) });
    }
  };

  if (others.length === 0) {
    return (
      <div className="p-5 border border-dashed border-black/15 bg-[hsl(var(--aangan-sand))] text-sm text-[hsl(var(--aangan-forest))]/70">
        Add at least one other family member first &mdash; then you can connect relationships here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {buckets.map((b) => (
          <div key={b.id} data-testid={`rel-bucket-${b.id}`} className="border border-black/10 bg-[hsl(var(--aangan-ivory))]">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/5">
              <p className="eyebrow">{b.label}</p>
              <button type="button" onClick={() => setPicker({ bucket: b.id })} data-testid={`rel-add-${b.id}`} className="inline-flex items-center gap-1 text-[12px] px-2 py-1 hover:text-[hsl(var(--aangan-terracotta))]">
                <Plus size={11} /> Add
              </button>
            </div>
            <ul className="p-3 space-y-1.5 min-h-[60px]">
              {(v[b.id] || []).length === 0 && <li className="text-[12px] text-[hsl(var(--aangan-forest))]/50 italic px-1 py-2">No one connected yet.</li>}
              {(v[b.id] || []).map((id) => (
                <li key={id} className="flex items-center gap-2 px-2 py-1.5 bg-[hsl(var(--aangan-sand))]">
                  <ArrowRight size={11} className={`text-[hsl(var(--aangan-${b.tint}))]`} />
                  <span className="flex-1 text-sm text-[hsl(var(--aangan-forest))]">{findName(id)}</span>
                  <button type="button" onClick={() => remove(b.id, id)} className="text-[hsl(var(--aangan-forest))]/40 hover:text-[hsl(var(--aangan-terracotta))]">
                    <Trash2 size={11} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Extended relations (Indian-specific) */}
      <div className="border border-black/10 bg-[hsl(var(--aangan-ivory))]">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/5">
          <p className="eyebrow">Other relations &middot; <span className="text-[hsl(var(--aangan-forest))]/55 lowercase tracking-normal text-[11px]">Chacha, Chachi, Bua, Mama, Dadi, Nani, cousins, in-laws&hellip;</span></p>
          <button type="button" onClick={() => setPicker({ bucket: 'extended_relations' })} data-testid="rel-add-extended_relations" className="inline-flex items-center gap-1 text-[12px] px-2 py-1 hover:text-[hsl(var(--aangan-terracotta))]">
            <Plus size={11} /> Add
          </button>
        </div>
        <ul className="p-3 space-y-1.5 min-h-[60px]">
          {(v.extended_relations || []).length === 0 && <li className="text-[12px] text-[hsl(var(--aangan-forest))]/50 italic px-1 py-2">None yet.</li>}
          {(v.extended_relations || []).map((er) => (
            <li key={er.member_id + er.label} className="flex items-center gap-3 px-2 py-1.5 bg-[hsl(var(--aangan-sand))]">
              <span className="text-[12px] eyebrow text-[hsl(var(--aangan-terracotta))] w-44 truncate" title={er.label}>{er.label}</span>
              <ArrowRight size={11} className="text-[hsl(var(--aangan-forest))]/40" />
              <span className="flex-1 text-sm">{findName(er.member_id)}</span>
              <button type="button" onClick={() => remove('extended_relations', er.member_id)} className="text-[hsl(var(--aangan-forest))]/40 hover:text-[hsl(var(--aangan-terracotta))]">
                <Trash2 size={11} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {picker && (
        <PickerModal
          subjectName={subjectName}
          bucket={picker.bucket}
          others={others}
          onClose={() => setPicker(null)}
          onPick={(id, label) => add(picker.bucket, id, label)}
        />
      )}
    </div>
  );
}

function PickerModal({ subjectName, bucket, others, onClose, onPick }) {
  const [memberId, setMemberId] = useState(others[0]?._id || '');
  const [label, setLabel] = useState(RELATION_GROUPS[0].items[0]);
  const [q, setQ] = useState('');

  const filtered = others.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));
  const isExtended = bucket === 'extended_relations';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[hsl(var(--aangan-ivory))] max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="rel-picker">
        <p className="eyebrow">Connect {subjectName} to</p>
        <h3 className="font-serif text-2xl mt-1">{bucket === 'parent_ids' ? 'a parent' : bucket === 'child_ids' ? 'a child' : bucket === 'spouse_ids' ? 'a spouse' : bucket === 'sibling_ids' ? 'a sibling' : 'another relative'}</h3>

        <input
          autoFocus
          placeholder="Search family members"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mt-4 w-full bg-transparent border-b border-[hsl(var(--aangan-forest))]/30 outline-none py-2"
          data-testid="rel-picker-search"
        />
        <ul className="mt-3 max-h-56 overflow-y-auto border border-black/10">
          {filtered.length === 0 && <li className="p-3 text-sm text-[hsl(var(--aangan-forest))]/60">No matches.</li>}
          {filtered.map((m) => (
            <li key={m._id}>
              <button
                type="button"
                onClick={() => setMemberId(m._id)}
                data-testid={`rel-pick-${m._id}`}
                className={`w-full text-left px-3 py-2 flex items-center justify-between border-b border-black/5 last:border-b-0 ${
                  memberId === m._id ? 'bg-[hsl(var(--aangan-marigold))]/20' : 'hover:bg-[hsl(var(--aangan-sand))]'
                }`}
              >
                <span className="text-sm">{m.name}</span>
                {m.relation_to_head && <span className="text-[11px] text-[hsl(var(--aangan-forest))]/55">{m.relation_to_head}</span>}
              </button>
            </li>
          ))}
        </ul>

        {isExtended && (
          <div className="mt-4">
            <p className="eyebrow mb-2">What is the relation?</p>
            <select
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-transparent border-b border-[hsl(var(--aangan-forest))]/30 py-2 outline-none"
              data-testid="rel-picker-label"
            >
              {RELATION_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((i) => <option key={i} value={i}>{i}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        <div className="mt-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm">Cancel</button>
          <button
            data-testid="rel-picker-confirm"
            disabled={!memberId}
            onClick={() => onPick(memberId, label)}
            className="px-5 py-2 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm disabled:opacity-50"
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
