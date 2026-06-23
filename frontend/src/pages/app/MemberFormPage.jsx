import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchFamily, addMember, updateMember, getMember } from '@/lib/api';
import { ArrowLeft, Trash2, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';

const PUBLIC_FIELD_OPTIONS = [
  ['name', 'Name'],
  ['photo_url', 'Photo'],
  ['relation_to_head', 'Relation'],
  ['gender', 'Gender'],
  ['date_of_birth', 'Date of birth'],
  ['place_of_birth', 'Place of birth'],
  ['anniversary', 'Anniversary'],
  ['profession', 'Profession'],
  ['favourite_food', 'Favourite food'],
  ['languages', 'Languages'],
  ['bio', 'Bio / about'],
  ['notes', 'Personal notes'],
];

const RELATION_PRESETS = [
  'Self', 'Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Brother', 'Sister',
  'Grandfather', 'Grandmother', 'Uncle', 'Aunt', 'Cousin', 'Father-in-law', 'Mother-in-law',
  'Brother-in-law', 'Sister-in-law', 'Son-in-law', 'Daughter-in-law', 'Grandson', 'Granddaughter',
];

function readAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-[hsl(var(--aangan-forest))]/55">{hint}</p>}
    </label>
  );
}

const inp =
  'w-full bg-transparent border-b border-[hsl(var(--aangan-forest))]/25 focus:border-[hsl(var(--aangan-forest))] outline-none py-2 text-[hsl(var(--aangan-forest))] font-serif text-lg';
const sel =
  'w-full bg-transparent border-b border-[hsl(var(--aangan-forest))]/25 focus:border-[hsl(var(--aangan-forest))] outline-none py-2 text-[hsl(var(--aangan-forest))]';

export default function MemberFormPage({ mode = 'create' }) {
  const { memberId } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState({
    name: '', photo_url: '', relation_to_head: '', gender: '', date_of_birth: '',
    place_of_birth: '', anniversary: '', profession: '', favourite_food: '',
    languages: [], bio: '', notes: '',
    parent_ids: [], spouse_ids: [], child_ids: [],
    public_fields: ['name', 'photo_url', 'relation_to_head', 'gender', 'date_of_birth', 'anniversary'],
  });
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const photoInput = useRef(null);

  useEffect(() => {
    fetchFamily().then((f) => setFamilyMembers((f.members || []).filter((m) => m._id !== memberId))).catch(() => {});
  }, [memberId]);

  useEffect(() => {
    if (mode === 'edit' && memberId) {
      getMember(memberId).then((m) => setData({ ...data, ...m })).catch(() => toast.error('Could not load member.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, memberId]);

  const updateField = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const toggleListVal = (k, v) =>
    setData((d) => ({ ...d, [k]: d[k]?.includes(v) ? d[k].filter((x) => x !== v) : [...(d[k] || []), v] }));

  const handlePhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error('Photo too large (max 2MB).'); return; }
    const url = await readAsDataUrl(f);
    updateField('photo_url', url);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!data.name.trim()) { toast.error('At least a name, please.'); return; }
    setLoading(true);
    try {
      // Strip empty strings — empty literals fail Pydantic validation
      const payload = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== '' && v !== undefined && v !== null)
      );
      if (mode === 'edit') {
        await updateMember(memberId, payload);
        toast.success('Saved.');
      } else {
        const m = await addMember(payload);
        toast.success('Added to the family.');
        nav(`/app/family/${m._id || m.id}`);
        return;
      }
      nav(`/app/family/${memberId}`);
    } catch (err) {
      const d = err.response?.data?.detail;
      const msg = typeof d === 'string' ? d : Array.isArray(d) ? d.map((x) => x?.msg || JSON.stringify(x)).join(', ') : 'Could not save.';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <div data-testid="member-form" className="max-w-[900px]">
      <Link to={mode === 'edit' ? `/app/family/${memberId}` : '/app/family'} className="inline-flex items-center gap-2 text-sm text-[hsl(var(--aangan-forest))]/65 hover:text-[hsl(var(--aangan-forest))]">
        <ArrowLeft size={14} /> Back
      </Link>
      <h1 className="font-serif text-5xl mt-4">{mode === 'edit' ? 'Edit member' : 'Add a member'}</h1>
      <p className="mt-3 font-hand text-xl text-[hsl(var(--aangan-terracotta))]">
        Only the fields you mark public will be visible to the rest of your family.
      </p>

      <form onSubmit={submit} className="mt-10 space-y-12">
        <section>
          <p className="eyebrow mb-5">The basics</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Name *"><input className={inp} value={data.name} onChange={(e) => updateField('name', e.target.value)} data-testid="mf-name" placeholder="Full name" /></Field>
            <Field label="Relation to family head">
              <input
                className={inp}
                list="relation-options"
                value={data.relation_to_head}
                onChange={(e) => updateField('relation_to_head', e.target.value)}
                placeholder="e.g. Grandmother"
                data-testid="mf-relation"
              />
              <datalist id="relation-options">{RELATION_PRESETS.map((r) => <option key={r} value={r} />)}</datalist>
            </Field>
            <Field label="Gender">
              <select className={sel} value={data.gender || ''} onChange={(e) => updateField('gender', e.target.value)} data-testid="mf-gender">
                <option value="">—</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
              </select>
            </Field>
            <Field label="Date of birth"><input className={inp} type="date" value={data.date_of_birth || ''} onChange={(e) => updateField('date_of_birth', e.target.value)} data-testid="mf-dob" /></Field>
            <Field label="Place of birth"><input className={inp} value={data.place_of_birth || ''} onChange={(e) => updateField('place_of_birth', e.target.value)} placeholder="City, country" data-testid="mf-pob" /></Field>
            <Field label="Anniversary"><input className={inp} type="date" value={data.anniversary || ''} onChange={(e) => updateField('anniversary', e.target.value)} data-testid="mf-anniv" /></Field>
            <Field label="Profession"><input className={inp} value={data.profession || ''} onChange={(e) => updateField('profession', e.target.value)} placeholder="What they do (or did)" data-testid="mf-profession" /></Field>
            <Field label="Favourite food"><input className={inp} value={data.favourite_food || ''} onChange={(e) => updateField('favourite_food', e.target.value)} placeholder="Besan ladoo, dosa..." data-testid="mf-food" /></Field>
          </div>
        </section>

        <section>
          <p className="eyebrow mb-5">Photo</p>
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 bg-[hsl(var(--aangan-sand))] rounded-full overflow-hidden flex items-center justify-center">
              {data.photo_url ? <img src={data.photo_url} alt="" className="w-full h-full object-cover" /> : <ImagePlus size={20} className="text-[hsl(var(--aangan-forest))]/40" />}
            </div>
            <div>
              <input type="file" ref={photoInput} accept="image/*" onChange={handlePhoto} className="hidden" data-testid="mf-photo-input" />
              <button type="button" onClick={() => photoInput.current?.click()} className="px-4 py-2 border border-[hsl(var(--aangan-forest))]/25 text-sm">Upload photo</button>
              {data.photo_url && <button type="button" onClick={() => updateField('photo_url', '')} className="ml-3 text-xs text-[hsl(var(--aangan-forest))]/60 underline">Remove</button>}
            </div>
          </div>
        </section>

        <section>
          <p className="eyebrow mb-5">Languages spoken</p>
          <input
            className={inp}
            placeholder="Type and press Enter (Hindi, Tamil, English...)"
            data-testid="mf-language-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                e.preventDefault();
                if (!data.languages.includes(e.target.value.trim())) {
                  updateField('languages', [...data.languages, e.target.value.trim()]);
                }
                e.target.value = '';
              }
            }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {data.languages.map((l) => (
              <button type="button" key={l} onClick={() => updateField('languages', data.languages.filter((x) => x !== l))} className="px-2.5 py-1 bg-[hsl(var(--aangan-sand))] text-[12px]">{l} ×</button>
            ))}
          </div>
        </section>

        <section>
          <p className="eyebrow mb-5">About them</p>
          <Field label="Short bio">
            <textarea rows={3} className={`${inp} font-sans text-base`} value={data.bio || ''} onChange={(e) => updateField('bio', e.target.value)} placeholder="A few sentences about who they are." data-testid="mf-bio" />
          </Field>
          <div className="mt-6">
            <Field label="Personal notes (private to you)">
              <textarea rows={3} className={`${inp} font-sans text-base`} value={data.notes || ''} onChange={(e) => updateField('notes', e.target.value)} placeholder="Anything you want to remember — kept private to you unless you make it public." data-testid="mf-notes" />
            </Field>
          </div>
        </section>

        <section>
          <p className="eyebrow mb-5">Relationships</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              ['parent_ids', 'Parents'],
              ['spouse_ids', 'Spouse(s)'],
              ['child_ids', 'Children'],
            ].map(([k, label]) => (
              <div key={k}>
                <p className="text-sm text-[hsl(var(--aangan-forest))]/70 mb-2">{label}</p>
                <div className="max-h-44 overflow-y-auto border border-black/10 p-2 space-y-1">
                  {familyMembers.length === 0 && <p className="text-[11px] text-[hsl(var(--aangan-forest))]/55 p-1">Add more members first to link them.</p>}
                  {familyMembers.map((m) => (
                    <label key={m._id} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer" data-testid={`mf-rel-${k}-${m._id}`}>
                      <input
                        type="checkbox"
                        checked={(data[k] || []).includes(m._id)}
                        onChange={() => toggleListVal(k, m._id)}
                      />
                      <span>{m.name} {m.relation_to_head && <span className="text-[hsl(var(--aangan-forest))]/50">· {m.relation_to_head}</span>}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="eyebrow mb-5">Privacy</p>
          <p className="text-sm text-[hsl(var(--aangan-forest))]/70 mb-4">Choose which fields the rest of your family can see. Anything you uncheck stays private to you (and the family head).</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-6">
            {PUBLIC_FIELD_OPTIONS.map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm" data-testid={`mf-public-${k}`}>
                <input
                  type="checkbox"
                  checked={(data.public_fields || []).includes(k)}
                  onChange={() => toggleListVal('public_fields', k)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>

        <div className="flex gap-3">
          <button disabled={loading} type="submit" data-testid="mf-submit" className="px-6 py-3.5 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm disabled:opacity-50">
            {loading ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Add to the family'}
          </button>
          <Link to={mode === 'edit' ? `/app/family/${memberId}` : '/app/family'} className="px-6 py-3.5 border border-[hsl(var(--aangan-forest))]/25 text-sm">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
