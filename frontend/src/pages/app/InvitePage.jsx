import { useState } from 'react';
import { createInvite } from '@/lib/api';
import { Link2, Copy, Check, Send, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';

export default function InvitePage() {
  const { user, family } = useAuth();
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const isHead = user?.role === 'head';

  const generate = async () => {
    try {
      const r = await createInvite({ role: 'member' });
      const url = `${window.location.origin}/app/accept-invite/${r.token}`;
      setLink(url);
    } catch (e) { toast.error(e.response?.data?.detail || 'Could not create invite.'); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); toast.success('Copied.'); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error('Could not copy.'); }
  };

  const msg = encodeURIComponent(
    `Hi! I started a private family archive on Aangan for the ${family?.name || ''} family — for our stories, recipes and traditions.\n\nUse this link to join (it is private to our family):\n${link}\n\nWith love.`
  );

  return (
    <div data-testid="invite-page" className="max-w-[820px]">
      <p className="eyebrow">Invite the family</p>
      <h1 className="font-serif text-5xl mt-3">Bring others home.</h1>
      <p className="mt-4 text-[hsl(var(--aangan-forest))]/75 max-w-xl">
        Generate a private invitation link and share it with the person you want to add. They&rsquo;ll create their own account and join the {family?.name || 'your'} family Aangan.
      </p>

      {!isHead && (
        <div className="mt-6 p-4 bg-[hsl(var(--aangan-sand))] border-l-4 border-[hsl(var(--aangan-marigold))]">
          <p className="text-sm">Only the family head can send invitations.</p>
        </div>
      )}

      {isHead && (
        <div className="mt-10 space-y-6">
          {!link ? (
            <button onClick={generate} data-testid="invite-generate" className="inline-flex items-center gap-2 px-6 py-3 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm">
              <Link2 size={14} /> Generate an invitation link
            </button>
          ) : (
            <div className="space-y-5">
              <div className="p-5 bg-[hsl(var(--aangan-sand))] flex items-center gap-3">
                <Link2 size={14} className="text-[hsl(var(--aangan-sage))]" />
                <input data-testid="invite-link" readOnly value={link} className="flex-1 bg-transparent outline-none text-[hsl(var(--aangan-forest))] text-sm" />
                <button onClick={copy} data-testid="invite-copy" className="inline-flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--aangan-forest))]/25 text-xs">
                  {copied ? <Check size={12} className="text-[hsl(var(--aangan-sage))]" /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                <a data-testid="invite-wa" href={`https://wa.me/?text=${msg}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm"><Send size={13}/> Send on WhatsApp</a>
                <a data-testid="invite-email" href={`mailto:?subject=Join our family Aangan&body=${msg}`} className="inline-flex items-center gap-2 px-5 py-2.5 border border-[hsl(var(--aangan-forest))]/25 text-sm"><Mail size={13}/> Email it</a>
                <button onClick={generate} className="text-sm underline text-[hsl(var(--aangan-forest))]/65">Generate another link</button>
              </div>
              <p className="text-[11px] text-[hsl(var(--aangan-forest))]/55">Invitation links expire after they are used once. Each member gets their own.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
