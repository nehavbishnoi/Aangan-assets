import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getMember, listStories, addStory, deleteMember, deleteStory, updateStory, fetchFamily } from '@/lib/api';
import { ArrowLeft, Pencil, Trash2, Plus, Cake, MapPin, Languages, Briefcase, Utensils, Lock, Globe, ChevronDown } from 'lucide-react';
import { Avatar } from './Dashboard';
import { toast } from 'sonner';
import VoiceRecorder from '@/components/VoiceRecorder';
import { useAuth } from '@/lib/auth';

function fmt(iso) {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return iso; }
}

const Stat = ({ icon: Icon, label, value }) => value ? (
  <div className="flex items-start gap-3">
    <Icon size={14} className="text-[hsl(var(--aangan-sage))] mt-1 shrink-0" />
    <div>
      <p className="eyebrow text-[10px]">{label}</p>
      <p className="text-[hsl(var(--aangan-forest))] mt-0.5">{value}</p>
    </div>
  </div>
) : null;

export default function MemberDetailPage() {
  const { memberId } = useParams();
  const { user, family } = useAuth();
  const nav = useNavigate();
  const [m, setM] = useState(null);
  const [stories, setStories] = useState([]);
  const [familyAll, setFamilyAll] = useState({ members: [] });
  const [openComposer, setOpenComposer] = useState(false);
  const [composer, setComposer] = useState({ title: '', content: '', language: '', is_public: false, audio_data_url: null });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [member, sts, fam] = await Promise.all([
        getMember(memberId),
        listStories(memberId),
        fetchFamily(),
      ]);
      setM(member); setStories(sts); setFamilyAll(fam);
    } catch (e) {
      toast.error('Could not load this member.');
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [memberId]);

  const findName = (id) => familyAll.members.find((x) => x._id === id)?.name || 'a relative';
  const isHead = user?.role === 'head';
  const isMyProfile = user?.member_id === memberId;
  const canEdit = isHead || isMyProfile;

  const onDeleteMember = async () => {
    if (!window.confirm(`Remove ${m.name} from the family archive? Their stories will also be deleted.`)) return;
    try {
      await deleteMember(memberId);
      toast.success(`${m.name} was removed.`);
      nav('/app/family');
    } catch (e) { toast.error(e.response?.data?.detail || 'Could not delete.'); }
  };

  const onSaveStory = async (e) => {
    e?.preventDefault?.();
    if (!composer.title.trim() || !composer.content.trim()) { toast.error('A title and a few words are enough to begin.'); return; }
    setSaving(true);
    try {
      const story = await addStory(memberId, composer);
      setStories((s) => [story, ...s]);
      setComposer({ title: '', content: '', language: '', is_public: false, audio_data_url: null });
      setOpenComposer(false);
      toast.success('Story kept.');
    } catch (e) { toast.error(e.response?.data?.detail || 'Could not save the story.'); }
    finally { setSaving(false); }
  };

  const onDeleteStory = async (id) => {
    if (!window.confirm('Delete this story?')) return;
    try {
      await deleteStory(id);
      setStories((s) => s.filter((x) => x._id !== id));
      toast.success('Removed.');
    } catch (e) { toast.error(e.response?.data?.detail || 'Could not delete.'); }
  };

  const onToggleStoryPublic = async (story) => {
    try {
      const updated = await updateStory(story._id, { is_public: !story.is_public });
      setStories((s) => s.map((x) => (x._id === story._id ? updated : x)));
    } catch (e) { toast.error('Could not update privacy.'); }
  };

  if (!m) return <p className="text-[hsl(var(--aangan-forest))]/55">Opening...</p>;

  const relatives = (label, ids) => ids?.length ? (
    <div>
      <p className="eyebrow text-[10px]">{label}</p>
      <p className="text-[hsl(var(--aangan-forest))]">{ids.map(findName).join(', ')}</p>
    </div>
  ) : null;

  return (
    <div data-testid="member-detail" className="max-w-[1080px]">
      <Link to="/app/family" className="inline-flex items-center gap-2 text-sm text-[hsl(var(--aangan-forest))]/65 hover:text-[hsl(var(--aangan-forest))]">
        <ArrowLeft size={14} /> Back to the family
      </Link>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-10">
        <header className="md:col-span-5">
          <div className="flex items-center gap-5">
            <Avatar m={m} size={108} />
            <div>
              <p className="eyebrow">{m.relation_to_head || 'Family'}</p>
              <h1 className="font-serif text-4xl md:text-5xl leading-tight mt-1">{m.name}</h1>
            </div>
          </div>
          {m.bio && <p className="mt-6 font-serif text-xl text-[hsl(var(--aangan-forest))]/80 leading-snug">{m.bio}</p>}

          <div className="mt-7 space-y-4">
            <Stat icon={Cake} label="Born" value={fmt(m.date_of_birth) + (m.place_of_birth ? ` · ${m.place_of_birth}` : '')} />
            <Stat icon={Cake} label="Anniversary" value={fmt(m.anniversary)} />
            <Stat icon={Briefcase} label="Profession" value={m.profession} />
            <Stat icon={Utensils} label="Favourite food" value={m.favourite_food} />
            <Stat icon={Languages} label="Languages" value={(m.languages || []).join(', ') || null} />
          </div>

          <div className="mt-7 space-y-4">
            {relatives('Parents', m.parent_ids)}
            {relatives('Spouse', m.spouse_ids)}
            {relatives('Children', m.child_ids)}
          </div>

          {m.notes && (
            <div className="mt-7 p-4 bg-[hsl(var(--aangan-sand))]">
              <p className="eyebrow text-[10px] flex items-center gap-1.5"><Lock size={11}/> Personal notes</p>
              <p className="mt-2 text-sm text-[hsl(var(--aangan-forest))]/80 whitespace-pre-wrap">{m.notes}</p>
            </div>
          )}

          {canEdit && (
            <div className="mt-8 flex gap-3">
              <Link to={`/app/family/${memberId}/edit`} data-testid="member-edit" className="inline-flex items-center gap-1.5 text-sm px-4 py-2 border border-[hsl(var(--aangan-forest))]/25">
                <Pencil size={13} /> Edit
              </Link>
              {!isMyProfile && (
                <button onClick={onDeleteMember} data-testid="member-delete" className="inline-flex items-center gap-1.5 text-sm px-4 py-2 border border-[hsl(var(--aangan-terracotta))]/40 text-[hsl(var(--aangan-terracotta))]">
                  <Trash2 size={13} /> Remove
                </button>
              )}
            </div>
          )}
        </header>

        <section className="md:col-span-7">
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-3xl">Stories about {m.name.split(' ')[0]}</h2>
            <button onClick={() => setOpenComposer((v) => !v)} data-testid="member-add-story" className="inline-flex items-center gap-1.5 text-sm bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] px-4 py-2.5">
              <Plus size={14} /> Add a story
            </button>
          </div>

          {openComposer && (
            <form onSubmit={onSaveStory} data-testid="story-composer" className="mt-5 border border-black/10 bg-[hsl(var(--aangan-ivory))] p-5 space-y-4">
              <input
                placeholder="Title of this story"
                value={composer.title}
                onChange={(e) => setComposer({ ...composer, title: e.target.value })}
                data-testid="story-title"
                className="w-full bg-transparent border-b border-[hsl(var(--aangan-forest))]/25 focus:border-[hsl(var(--aangan-forest))] outline-none py-2 font-serif text-2xl"
              />

              <VoiceRecorder
                onTranscript={({ text, language, audioDataUrl }) =>
                  setComposer((c) => ({
                    ...c,
                    content: c.content ? c.content + '\n\n' + text : text,
                    language: language || c.language,
                    audio_data_url: audioDataUrl,
                  }))
                }
              />

              <textarea
                rows={6}
                placeholder="Tell the story. Or speak it above — Aangan will transcribe it here."
                value={composer.content}
                onChange={(e) => setComposer({ ...composer, content: e.target.value })}
                data-testid="story-content"
                className="w-full bg-transparent border border-[hsl(var(--aangan-forest))]/15 focus:border-[hsl(var(--aangan-forest))]/40 outline-none py-3 px-4 font-serif text-lg leading-relaxed"
              />
              {composer.audio_data_url && (
                <audio controls src={composer.audio_data_url} className="w-full" data-testid="story-attached-audio" />
              )}

              <div className="flex items-center justify-between flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm text-[hsl(var(--aangan-forest))]/80">
                  <input type="checkbox" checked={composer.is_public} onChange={(e) => setComposer({ ...composer, is_public: e.target.checked })} data-testid="story-public" />
                  Share with the whole family
                  {composer.is_public ? <Globe size={12} className="text-[hsl(var(--aangan-sage))]" /> : <Lock size={12} className="text-[hsl(var(--aangan-forest))]/50" />}
                </label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setOpenComposer(false)} className="px-4 py-2 text-sm">Cancel</button>
                  <button type="submit" disabled={saving} data-testid="story-save" className="px-5 py-2.5 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm disabled:opacity-50">
                    {saving ? 'Saving…' : 'Keep the story'}
                  </button>
                </div>
              </div>
            </form>
          )}

          <ul className="mt-8 space-y-6">
            {stories.length === 0 && !openComposer && (
              <li className="p-7 border border-dashed border-black/15 bg-[hsl(var(--aangan-sand))] text-[hsl(var(--aangan-forest))]/70 text-sm" data-testid="stories-empty">
                No stories yet about {m.name.split(' ')[0]}. Begin with one small memory.
              </li>
            )}
            {stories.map((s) => (
              <li key={s._id} data-testid={`story-${s._id}`} className="border-t border-black/10 pt-5">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-serif text-2xl text-[hsl(var(--aangan-forest))]">{s.title}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => onToggleStoryPublic(s)} className="text-[11px] inline-flex items-center gap-1 text-[hsl(var(--aangan-forest))]/65 hover:text-[hsl(var(--aangan-terracotta))]">
                      {s.is_public ? <><Globe size={11}/> Public</> : <><Lock size={11}/> Private</>}
                    </button>
                    {(s.created_by === user._id || user.role === 'head') && (
                      <button onClick={() => onDeleteStory(s._id)} className="text-[11px] text-[hsl(var(--aangan-forest))]/55 hover:text-[hsl(var(--aangan-terracotta))]"><Trash2 size={11}/></button>
                    )}
                  </div>
                </div>
                {s.audio_data_url && <audio controls src={s.audio_data_url} className="mt-3 w-full" />}
                <p className="mt-3 whitespace-pre-wrap text-[hsl(var(--aangan-forest))]/85 leading-relaxed">{s.content}</p>
                <p className="mt-2 text-[11px] text-[hsl(var(--aangan-forest))]/50">{fmt(s.created_at)}{s.language ? ` · ${s.language}` : ''}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
