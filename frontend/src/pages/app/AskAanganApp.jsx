import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, ShieldCheck } from 'lucide-react';
import { askAanganStream } from '@/lib/api';

export default function AskAanganApp() {
  const [messages, setMessages] = useState([{ role: 'aangan', text: 'Ask me about anyone in your family. I will answer only from what your family has shared.' }]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const sessionRef = useRef(`ask-${Date.now()}`);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (q) => {
    const question = (q ?? input).trim();
    if (!question || streaming) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: question }, { role: 'aangan', text: '' }]);
    setStreaming(true);
    await askAanganStream(
      question, sessionRef.current,
      (d) => setMessages((m) => { const n = [...m]; n[n.length - 1] = { ...n[n.length - 1], text: n[n.length - 1].text + d }; return n; }),
      () => setStreaming(false),
      (err) => { setMessages((m) => { const n = [...m]; n[n.length - 1] = { ...n[n.length - 1], text: n[n.length - 1].text || `(Aangan is quiet — ${err})` }; return n; }); setStreaming(false); },
    );
  };

  return (
    <div data-testid="ask-app-page" className="max-w-[920px]">
      <p className="eyebrow">A private AI guide</p>
      <h1 className="font-serif text-5xl md:text-6xl mt-3 leading-[1]">Ask Aangan</h1>
      <p className="mt-3 text-[hsl(var(--aangan-forest))]/75 max-w-xl">
        Aangan answers from your family&rsquo;s archive first &mdash; the people and stories you&rsquo;ve added. Nothing else.
      </p>

      <div className="mt-8 border border-black/10 bg-[hsl(var(--aangan-ivory))] flex flex-col h-[620px]">
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`} data-testid={`ask-app-msg-${i}`}>
              <div className="max-w-[80%]">
                {m.role === 'aangan' && <p className="eyebrow flex items-center gap-1.5 mb-2 text-[hsl(var(--aangan-terracotta))]"><Sparkles size={11}/> Aangan</p>}
                <div className={`whitespace-pre-wrap leading-relaxed ${m.role === 'user' ? 'bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] px-4 py-3 text-[15px]' : 'font-serif text-[19px] text-[hsl(var(--aangan-forest))]'}`}>
                  {m.text || (streaming && i === messages.length - 1 ? <span className="opacity-50">listening...</span> : null)}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-black/10 p-4 flex items-center gap-3 bg-[hsl(var(--aangan-sand))]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming}
            placeholder="Ask about anyone in your family..."
            data-testid="ask-app-input"
            className="flex-1 bg-transparent outline-none text-[hsl(var(--aangan-forest))] placeholder:text-[hsl(var(--aangan-forest))]/40"
          />
          <button data-testid="ask-app-send" type="submit" disabled={streaming || !input.trim()} className="w-10 h-10 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] flex items-center justify-center disabled:opacity-40">
            <Send size={15} />
          </button>
        </form>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[hsl(var(--aangan-forest))]/55">
        <ShieldCheck size={11} className="text-[hsl(var(--aangan-sage))]" /> Aangan only reads stories you marked public, and your own private stories.
      </p>
    </div>
  );
}
