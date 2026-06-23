/**
 * Reusable entity-list + form pages for simple owned entities
 * (Recipes / Cultures / Rituals) — same shape, different fields.
 */
import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, ArrowLeft, Trash2, Pencil, Globe, Lock, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { fetchFamily } from '@/lib/api';
import VoiceRecorder from '@/components/VoiceRecorder';
import { useAuth } from '@/lib/auth';

function readAsDataUrl(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}

function fmtDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); }
  catch { return iso; }
}

const inp = 'w-full bg-transparent border-b border-[hsl(var(--aangan-forest))]/25 focus:border-[hsl(var(--aangan-forest))] outline-none py-2 text-[hsl(var(--aangan-forest))] font-serif text-lg';
const sel = 'w-full bg-transparent border-b border-[hsl(var(--aangan-forest))]/25 focus:border-[hsl(var(--aangan-forest))] outline-none py-2';

function PrivacyToggle({ value, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} data-testid="entity-public" />
      {value ? <Globe size={13} className="text-[hsl(var(--aangan-sage))]" /> : <Lock size={13} className="text-[hsl(var(--aangan-forest))]/50" />}
      <span>{value ? 'Visible to the whole family' : 'Private to you'}</span>
    </label>
  );
}

function TagInput({ value = [], onChange, placeholder }) {
  const [text, setText] = useState('');
  const add = () => {
    const t = text.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setText('');
  };
  return (
    <>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={placeholder}
        className={inp}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {value.map((v) => (
          <button type="button" key={v} onClick={() => onChange(value.filter((x) => x !== v))} className="px-2.5 py-1 bg-[hsl(var(--aangan-sand))] text-[12px]">{v} ×</button>
        ))}
      </div>
    </>
  );
}

function PhotoField({ url, onChange }) {
  const ref = useRef(null);
  return (
    <div className="flex items-center gap-4">
      <div className="w-24 h-24 bg-[hsl(var(--aangan-sand))] overflow-hidden flex items-center justify-center">
        {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <ImagePlus size={20} className="text-[hsl(var(--aangan-forest))]/40" />}
      </div>
      <div>
        <input type="file" accept="image/*" ref={ref} className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          if (f.size > 2 * 1024 * 1024) { toast.error('Photo too large (max 2MB).'); return; }
          onChange(await readAsDataUrl(f));
        }} />
        <button type="button" onClick={() => ref.current?.click()} className="px-3 py-2 border border-[hsl(var(--aangan-forest))]/25 text-sm">Upload photo</button>
        {url && <button type="button" onClick={() => onChange('')} className="ml-2 text-xs underline">Remove</button>}
      </div>
    </div>
  );
}

function MemberPicker({ value = [], onChange, members, multi = true, placeholder = 'Pick members' }) {
  if (members.length === 0) return <p className="text-[12px] text-[hsl(var(--aangan-forest))]/55 italic">Add family members first.</p>;
  if (!multi) {
    return (
      <select value={value || ''} onChange={(e) => onChange(e.target.value || null)} className={sel}>
        <option value="">— {placeholder} —</option>
        {members.map((m) => <option key={m._id} value={m._id}>{m.name}{m.relation_to_head ? ` (${m.relation_to_head})` : ''}</option>)}
      </select>
    );
  }
  return (
    <div className="max-h-44 overflow-y-auto border border-black/10 p-2 space-y-1">
      {members.map((m) => (
        <label key={m._id} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer">
          <input type="checkbox" checked={value.includes(m._id)} onChange={() => onChange(value.includes(m._id) ? value.filter((x) => x !== m._id) : [...value, m._id])} />
          <span>{m.name}{m.relation_to_head ? ` · ${m.relation_to_head}` : ''}</span>
        </label>
      ))}
    </div>
  );
}

// ============================================================================
// LIST view
// ============================================================================
export function EntityListPage({ apiClient, kind, title, blurb, newLabel = 'Add', ItemCard }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiClient.list().then((r) => { setRows(r); setLoading(false); }).catch(() => setLoading(false)); }, [apiClient]);

  return (
    <div data-testid={`${kind}-list`} className="max-w-[1080px]">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow">{kind.toUpperCase()}</p>
          <h1 className="font-serif text-5xl md:text-6xl mt-3">{title}</h1>
          <p className="mt-3 text-[hsl(var(--aangan-forest))]/70 max-w-xl">{blurb}</p>
        </div>
        <Link to={`/app/${kind}/new`} data-testid={`${kind}-add`} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm">
          <Plus size={14} /> {newLabel}
        </Link>
      </div>

      {loading && <p className="mt-12 text-[hsl(var(--aangan-forest))]/55">Loading…</p>}
      {!loading && rows.length === 0 && (
        <div className="mt-12 p-10 border border-dashed border-black/15 bg-[hsl(var(--aangan-sand))]">
          <p className="font-serif text-2xl">Nothing here yet.</p>
          <p className="mt-2 text-sm text-[hsl(var(--aangan-forest))]/70">Begin with one entry &mdash; you can add more, slowly.</p>
        </div>
      )}

      <ul className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        {rows.map((r) => (
          <li key={r._id} data-testid={`${kind}-item-${r._id}`}>
            <Link to={`/app/${kind}/${r._id}`} className="block group">
              <ItemCard row={r} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Specific form/detail pages
// ============================================================================
export function RecipeFormPage({ apiClient, mode = 'create' }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState({ title: '', owner_member_id: null, occasions: [], cuisine: '', ingredients: [], steps: [], story: '', photo_url: '', audio_data_url: null, language: '', is_public: false });
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => { fetchFamily().then((f) => setMembers(f.members || [])); }, []);
  useEffect(() => { if (mode === 'edit' && id) apiClient.get(id).then((r) => setData((d) => ({ ...d, ...r }))).catch(() => {}); }, [apiClient, mode, id]);

  const save = async (e) => {
    e.preventDefault();
    if (!data.title.trim()) { toast.error('Give the recipe a name.'); return; }
    setLoading(true);
    try {
      const payload = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '' && v !== null && v !== undefined));
      const out = mode === 'edit' ? await apiClient.update(id, payload) : await apiClient.add(payload);
      toast.success('Saved.');
      nav(`/app/recipes/${out._id}`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Could not save.'); }
    finally { setLoading(false); }
  };

  return (
    <div data-testid="recipe-form" className="max-w-[900px]">
      <Link to="/app/recipes" className="inline-flex items-center gap-2 text-sm text-[hsl(var(--aangan-forest))]/65"><ArrowLeft size={14}/> Back</Link>
      <h1 className="font-serif text-5xl mt-4">{mode === 'edit' ? 'Edit recipe' : 'A family recipe'}</h1>
      <form onSubmit={save} className="mt-10 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label><span className="eyebrow">Recipe *</span><input className={inp} value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} placeholder="Besan ladoo, Sambhar..." data-testid="recipe-title" /></label>
          <label><span className="eyebrow">Whose recipe</span>
            <div className="mt-2"><MemberPicker multi={false} value={data.owner_member_id} onChange={(v) => setData({ ...data, owner_member_id: v })} members={members} placeholder="Choose owner" /></div>
          </label>
          <label><span className="eyebrow">Cuisine / region</span><input className={inp} value={data.cuisine} onChange={(e) => setData({ ...data, cuisine: e.target.value })} placeholder="Marwari, Tamil, Bengali..." /></label>
          <label><span className="eyebrow">Made for which occasions</span>
            <div className="mt-2"><TagInput value={data.occasions} onChange={(v) => setData({ ...data, occasions: v })} placeholder="Diwali, Birthday, Sunday lunch..." /></div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="eyebrow mb-2">Ingredients</p>
            <TagInput value={data.ingredients} onChange={(v) => setData({ ...data, ingredients: v })} placeholder="1 cup besan…" />
          </div>
          <div>
            <p className="eyebrow mb-2">Steps</p>
            <TagInput value={data.steps} onChange={(v) => setData({ ...data, steps: v })} placeholder="Warm the kadhai…" />
          </div>
        </div>

        <div>
          <p className="eyebrow mb-2">The story behind it</p>
          <VoiceRecorder onTranscript={({ text, language }) => setData((d) => ({ ...d, story: (d.story ? d.story + '\n\n' : '') + text, language: language || d.language }))} />
          <textarea rows={5} className={`${inp} font-sans text-base mt-3`} value={data.story} onChange={(e) => setData({ ...data, story: e.target.value })} placeholder="Where it came from, what it means…" data-testid="recipe-story" />
        </div>

        <div>
          <p className="eyebrow mb-2">Photo</p>
          <PhotoField url={data.photo_url} onChange={(v) => setData({ ...data, photo_url: v })} />
        </div>

        <PrivacyToggle value={data.is_public} onChange={(v) => setData({ ...data, is_public: v })} />

        <div className="flex gap-3">
          <button disabled={loading} type="submit" data-testid="recipe-save" className="px-6 py-3 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm disabled:opacity-50">{loading ? 'Saving…' : 'Save recipe'}</button>
          <Link to="/app/recipes" className="px-6 py-3 border border-[hsl(var(--aangan-forest))]/25 text-sm">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

export function CultureFormPage({ apiClient, mode = 'create' }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState({ title: '', kind: 'festival', description: '', when_rule: '', when_date: '', annual: true, attendee_ids: [], food_recipe_ids: [], story: '', photo_url: '', audio_data_url: null, is_public: false });
  const [members, setMembers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    fetchFamily().then((f) => setMembers(f.members || []));
    import('@/lib/api').then((mod) => mod.recipesApi.list().then(setRecipes).catch(() => {}));
  }, []);
  useEffect(() => { if (mode === 'edit' && id) apiClient.get(id).then((r) => setData((d) => ({ ...d, ...r }))).catch(() => {}); }, [apiClient, mode, id]);

  const save = async (e) => {
    e.preventDefault();
    if (!data.title.trim()) { toast.error('Name this celebration.'); return; }
    setLoading(true);
    try {
      const payload = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '' && v !== null && v !== undefined));
      const out = mode === 'edit' ? await apiClient.update(id, payload) : await apiClient.add(payload);
      toast.success('Saved.');
      nav(`/app/culture/${out._id}`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Could not save.'); }
    finally { setLoading(false); }
  };

  return (
    <div data-testid="culture-form" className="max-w-[900px]">
      <Link to="/app/culture" className="inline-flex items-center gap-2 text-sm text-[hsl(var(--aangan-forest))]/65"><ArrowLeft size={14}/> Back</Link>
      <h1 className="font-serif text-5xl mt-4">{mode === 'edit' ? 'Edit tradition' : 'A family tradition'}</h1>
      <form onSubmit={save} className="mt-10 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label><span className="eyebrow">Title *</span><input className={inp} value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} placeholder="Our Diwali Morning..." data-testid="culture-title" /></label>
          <label><span className="eyebrow">Kind</span>
            <select className={sel} value={data.kind} onChange={(e) => setData({ ...data, kind: e.target.value })}>
              <option value="festival">Festival</option><option value="tradition">Tradition</option>
              <option value="celebration">Celebration</option><option value="ritual_of_passage">Rite of passage</option>
              <option value="anniversary">Anniversary</option>
            </select>
          </label>
          <label><span className="eyebrow">When (rule)</span><input className={inp} value={data.when_rule} onChange={(e) => setData({ ...data, when_rule: e.target.value })} placeholder="First day of Diwali, Sunday morning..." /></label>
          <label><span className="eyebrow">When (date, if fixed)</span><input className={inp} type="date" value={data.when_date || ''} onChange={(e) => setData({ ...data, when_date: e.target.value })} data-testid="culture-date" /></label>
          <label className="flex items-center gap-2 mt-3 text-sm"><input type="checkbox" checked={data.annual} onChange={(e) => setData({ ...data, annual: e.target.checked })} /> Repeats every year</label>
        </div>

        <div>
          <p className="eyebrow mb-2">How we celebrate</p>
          <textarea rows={4} className={`${inp} font-sans text-base`} value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} placeholder="What we do, in what order, what feels meaningful." data-testid="culture-description" />
        </div>

        <div>
          <p className="eyebrow mb-2">Who attends</p>
          <MemberPicker value={data.attendee_ids} onChange={(v) => setData({ ...data, attendee_ids: v })} members={members} />
        </div>

        <div>
          <p className="eyebrow mb-2">Food we make</p>
          {recipes.length === 0 && <p className="text-[12px] text-[hsl(var(--aangan-forest))]/55">Add some recipes first to link them here.</p>}
          {recipes.length > 0 && (
            <div className="max-h-44 overflow-y-auto border border-black/10 p-2 space-y-1">
              {recipes.map((r) => (
                <label key={r._id} className="flex items-center gap-2 text-sm py-0.5">
                  <input type="checkbox" checked={(data.food_recipe_ids || []).includes(r._id)} onChange={() => setData({ ...data, food_recipe_ids: (data.food_recipe_ids || []).includes(r._id) ? data.food_recipe_ids.filter((x) => x !== r._id) : [...(data.food_recipe_ids || []), r._id] })} />
                  <span>{r.title}{r.occasions?.length ? ` · ${r.occasions.join(', ')}` : ''}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="eyebrow mb-2">The story behind it</p>
          <VoiceRecorder onTranscript={({ text }) => setData((d) => ({ ...d, story: (d.story ? d.story + '\n\n' : '') + text }))} />
          <textarea rows={5} className={`${inp} font-sans text-base mt-3`} value={data.story} onChange={(e) => setData({ ...data, story: e.target.value })} placeholder="Why we do it, what it means to the family..." data-testid="culture-story" />
        </div>

        <div><p className="eyebrow mb-2">Photo</p><PhotoField url={data.photo_url} onChange={(v) => setData({ ...data, photo_url: v })} /></div>

        <PrivacyToggle value={data.is_public} onChange={(v) => setData({ ...data, is_public: v })} />

        <div className="flex gap-3">
          <button disabled={loading} type="submit" data-testid="culture-save" className="px-6 py-3 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm disabled:opacity-50">{loading ? 'Saving…' : 'Save'}</button>
          <Link to="/app/culture" className="px-6 py-3 border border-[hsl(var(--aangan-forest))]/25 text-sm">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

export function RitualFormPage({ apiClient, mode = 'create' }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState({ title: '', frequency: 'daily', description: '', follower_ids: [], story: '', photo_url: '', is_public: false });
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => { fetchFamily().then((f) => setMembers(f.members || [])); }, []);
  useEffect(() => { if (mode === 'edit' && id) apiClient.get(id).then((r) => setData((d) => ({ ...d, ...r }))).catch(() => {}); }, [apiClient, mode, id]);

  const save = async (e) => {
    e.preventDefault();
    if (!data.title.trim()) { toast.error('Name this ritual.'); return; }
    setLoading(true);
    try {
      const payload = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '' && v !== null && v !== undefined));
      const out = mode === 'edit' ? await apiClient.update(id, payload) : await apiClient.add(payload);
      toast.success('Saved.');
      nav(`/app/rituals/${out._id}`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Could not save.'); }
    finally { setLoading(false); }
  };

  return (
    <div data-testid="ritual-form" className="max-w-[900px]">
      <Link to="/app/rituals" className="inline-flex items-center gap-2 text-sm text-[hsl(var(--aangan-forest))]/65"><ArrowLeft size={14}/> Back</Link>
      <h1 className="font-serif text-5xl mt-4">{mode === 'edit' ? 'Edit ritual' : 'A family ritual'}</h1>
      <form onSubmit={save} className="mt-10 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label><span className="eyebrow">Title *</span><input className={inp} value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} placeholder="Morning prayer, Sunday call to Nani..." data-testid="ritual-title" /></label>
          <label><span className="eyebrow">Frequency</span>
            <select className={sel} value={data.frequency} onChange={(e) => setData({ ...data, frequency: e.target.value })}>
              <option value="daily">Daily</option><option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option><option value="yearly">Yearly</option>
              <option value="occasional">Occasional</option>
            </select>
          </label>
        </div>

        <div>
          <p className="eyebrow mb-2">Guideline / how it is done</p>
          <textarea rows={4} className={`${inp} font-sans text-base`} value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} placeholder="What is done, in what order, by whom." data-testid="ritual-description" />
        </div>

        <div>
          <p className="eyebrow mb-2">Who follows this</p>
          <MemberPicker value={data.follower_ids} onChange={(v) => setData({ ...data, follower_ids: v })} members={members} />
        </div>

        <div>
          <p className="eyebrow mb-2">Why we do it</p>
          <VoiceRecorder onTranscript={({ text }) => setData((d) => ({ ...d, story: (d.story ? d.story + '\n\n' : '') + text }))} />
          <textarea rows={4} className={`${inp} font-sans text-base mt-3`} value={data.story} onChange={(e) => setData({ ...data, story: e.target.value })} placeholder="The meaning behind it." data-testid="ritual-story" />
        </div>

        <div><p className="eyebrow mb-2">Photo</p><PhotoField url={data.photo_url} onChange={(v) => setData({ ...data, photo_url: v })} /></div>

        <PrivacyToggle value={data.is_public} onChange={(v) => setData({ ...data, is_public: v })} />

        <div className="flex gap-3">
          <button disabled={loading} type="submit" data-testid="ritual-save" className="px-6 py-3 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm disabled:opacity-50">{loading ? 'Saving…' : 'Save'}</button>
          <Link to="/app/rituals" className="px-6 py-3 border border-[hsl(var(--aangan-forest))]/25 text-sm">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// Generic detail (show + delete) — small, used for all three entities
// ============================================================================
export function EntityDetailPage({ apiClient, kind, backTo, render }) {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [row, setRow] = useState(null);
  useEffect(() => { apiClient.get(id).then(setRow).catch(() => toast.error('Could not load.')); }, [apiClient, id]);
  if (!row) return <p className="text-[hsl(var(--aangan-forest))]/55">Opening…</p>;

  const onDelete = async () => {
    if (!window.confirm('Delete this?')) return;
    try { await apiClient.remove(id); toast.success('Removed.'); nav(backTo); }
    catch (e) { toast.error(e.response?.data?.detail || 'Could not delete.'); }
  };
  const canEdit = user?.role === 'head' || row.created_by === user?._id;

  return (
    <div className="max-w-[1000px]" data-testid={`${kind}-detail`}>
      <Link to={backTo} className="inline-flex items-center gap-2 text-sm text-[hsl(var(--aangan-forest))]/65"><ArrowLeft size={14}/> Back</Link>
      {render(row)}
      {canEdit && (
        <div className="mt-10 flex gap-3">
          <Link to={`/app/${kind}/${id}/edit`} className="inline-flex items-center gap-1.5 px-4 py-2 border border-[hsl(var(--aangan-forest))]/25 text-sm" data-testid={`${kind}-edit`}><Pencil size={13}/> Edit</Link>
          <button onClick={onDelete} className="inline-flex items-center gap-1.5 px-4 py-2 border border-[hsl(var(--aangan-terracotta))]/40 text-[hsl(var(--aangan-terracotta))] text-sm" data-testid={`${kind}-delete`}><Trash2 size={13}/> Delete</button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tiny card renderers + detail renderers
// ============================================================================
export const recipeRowCard = ({ row }) => (
  <div className="group bg-[hsl(var(--aangan-sand))] overflow-hidden">
    {row.photo_url && <img src={row.photo_url} alt="" className="w-full h-44 object-cover group-hover:scale-[1.02] transition-transform duration-700" />}
    <div className="p-5">
      <p className="eyebrow">{row.cuisine || 'Recipe'} {row.is_public ? <span className="text-[hsl(var(--aangan-sage))]">· public</span> : <span className="text-[hsl(var(--aangan-forest))]/45">· private</span>}</p>
      <h3 className="font-serif text-2xl mt-1.5">{row.title}</h3>
      {row.occasions?.length > 0 && <p className="mt-1 text-[12px] text-[hsl(var(--aangan-forest))]/60">For: {row.occasions.join(', ')}</p>}
    </div>
  </div>
);

export const cultureRowCard = ({ row }) => (
  <div className="group bg-[hsl(var(--aangan-sand))] overflow-hidden">
    {row.photo_url && <img src={row.photo_url} alt="" className="w-full h-44 object-cover" />}
    <div className="p-5">
      <p className="eyebrow">{row.kind || 'Tradition'} {row.is_public ? <span className="text-[hsl(var(--aangan-sage))]">· public</span> : <span className="text-[hsl(var(--aangan-forest))]/45">· private</span>}</p>
      <h3 className="font-serif text-2xl mt-1.5">{row.title}</h3>
      {row.when_rule && <p className="mt-1 text-[12px] text-[hsl(var(--aangan-forest))]/60">{row.when_rule}</p>}
    </div>
  </div>
);

export const ritualRowCard = ({ row }) => (
  <div className="group bg-[hsl(var(--aangan-sand))] overflow-hidden">
    {row.photo_url && <img src={row.photo_url} alt="" className="w-full h-44 object-cover" />}
    <div className="p-5">
      <p className="eyebrow capitalize">{row.frequency || 'Ritual'} {row.is_public ? <span className="text-[hsl(var(--aangan-sage))]">· public</span> : <span className="text-[hsl(var(--aangan-forest))]/45">· private</span>}</p>
      <h3 className="font-serif text-2xl mt-1.5">{row.title}</h3>
    </div>
  </div>
);

export const renderRecipeDetail = (row) => (
  <article className="mt-6">
    <p className="eyebrow">{row.cuisine || 'Family recipe'}</p>
    <h1 className="font-serif text-5xl mt-2">{row.title}</h1>
    {row.occasions?.length > 0 && <p className="mt-3 font-hand text-2xl text-[hsl(var(--aangan-terracotta))]">For {row.occasions.join(', ')}</p>}
    {row.photo_url && <img src={row.photo_url} alt="" className="mt-7 w-full max-h-[420px] object-cover" />}
    {row.audio_data_url && <audio controls src={row.audio_data_url} className="mt-5 w-full" />}
    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
      {row.ingredients?.length > 0 && (<div><p className="eyebrow">Ingredients</p><ul className="mt-3 list-disc list-inside space-y-1">{row.ingredients.map((i) => <li key={i}>{i}</li>)}</ul></div>)}
      {row.steps?.length > 0 && (<div><p className="eyebrow">Steps</p><ol className="mt-3 list-decimal list-inside space-y-2">{row.steps.map((s) => <li key={s} className="text-[hsl(var(--aangan-forest))]/85">{s}</li>)}</ol></div>)}
    </div>
    {row.story && <div className="mt-8"><p className="eyebrow">Story</p><p className="mt-3 whitespace-pre-wrap font-serif text-xl text-[hsl(var(--aangan-forest))]/85 leading-relaxed">{row.story}</p></div>}
    {row.owner_member_id && <p className="mt-6 text-[12px] text-[hsl(var(--aangan-forest))]/55">Owner: <Link to={`/app/family/${row.owner_member_id}`} className="underline hover:text-[hsl(var(--aangan-terracotta))]">view family member</Link></p>}
  </article>
);

export const renderCultureDetail = (row) => (
  <article className="mt-6">
    <p className="eyebrow">{row.kind || 'Tradition'} {row.when_rule ? `· ${row.when_rule}` : ''}</p>
    <h1 className="font-serif text-5xl mt-2">{row.title}</h1>
    {row.when_date && <p className="mt-3 font-hand text-2xl text-[hsl(var(--aangan-terracotta))]">Next: {fmtDate(row.when_date)}{row.annual ? ', every year' : ''}</p>}
    {row.photo_url && <img src={row.photo_url} alt="" className="mt-7 w-full max-h-[420px] object-cover" />}
    {row.description && <div className="mt-8"><p className="eyebrow">How we celebrate</p><p className="mt-3 whitespace-pre-wrap text-[hsl(var(--aangan-forest))]/85 leading-relaxed">{row.description}</p></div>}
    {row.story && <div className="mt-8"><p className="eyebrow">The story behind it</p><p className="mt-3 whitespace-pre-wrap font-serif text-xl text-[hsl(var(--aangan-forest))]/85 leading-relaxed">{row.story}</p></div>}
    {row.attendee_ids?.length > 0 && <p className="mt-6 text-[12px] text-[hsl(var(--aangan-forest))]/55">Attendees linked: {row.attendee_ids.length}</p>}
    {row.audio_data_url && <audio controls src={row.audio_data_url} className="mt-5 w-full" />}
  </article>
);

export const renderRitualDetail = (row) => (
  <article className="mt-6">
    <p className="eyebrow capitalize">{row.frequency} ritual</p>
    <h1 className="font-serif text-5xl mt-2">{row.title}</h1>
    {row.photo_url && <img src={row.photo_url} alt="" className="mt-7 w-full max-h-[400px] object-cover" />}
    {row.description && <div className="mt-7"><p className="eyebrow">The way</p><p className="mt-3 whitespace-pre-wrap text-[hsl(var(--aangan-forest))]/85 leading-relaxed">{row.description}</p></div>}
    {row.story && <div className="mt-7"><p className="eyebrow">Why</p><p className="mt-3 whitespace-pre-wrap font-serif text-xl text-[hsl(var(--aangan-forest))]/85 leading-relaxed">{row.story}</p></div>}
    {row.follower_ids?.length > 0 && <p className="mt-6 text-[12px] text-[hsl(var(--aangan-forest))]/55">Followed by: {row.follower_ids.length} family member(s)</p>}
  </article>
);
