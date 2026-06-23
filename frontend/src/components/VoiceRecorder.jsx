import { useRef, useState } from 'react';
import { Mic, Square, Loader2, Trash2 } from 'lucide-react';
import { transcribeAudio } from '@/lib/api';
import { toast } from 'sonner';

const INDIAN_LANGS = [
  ['', 'Auto-detect'],
  ['hi', 'Hindi'], ['en', 'English (Indian)'], ['ta', 'Tamil'],
  ['bn', 'Bengali'], ['mr', 'Marathi'], ['te', 'Telugu'],
  ['gu', 'Gujarati'], ['kn', 'Kannada'], ['ml', 'Malayalam'],
  ['pa', 'Punjabi'], ['ur', 'Urdu'], ['or', 'Odia'], ['as', 'Assamese'],
];

/**
 * In-browser voice recorder + Whisper transcription.
 * Calls onTranscript({ text, language, audioDataUrl }) when transcription completes.
 */
export default function VoiceRecorder({ onTranscript }) {
  const [state, setState] = useState('idle'); // idle | recording | recorded | transcribing
  const [language, setLanguage] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: 'audio/webm' });
        setBlob(b);
        setAudioUrl(URL.createObjectURL(b));
        setState('recorded');
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
      };
      mr.start();
      mediaRef.current = mr;
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setState('recording');
    } catch (e) {
      toast.error('Could not access your microphone. Please allow access and try again.');
    }
  };

  const stop = () => {
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop();
  };

  const discard = () => {
    setBlob(null); setAudioUrl(null); setState('idle'); setSeconds(0);
  };

  const transcribe = async () => {
    if (!blob) return;
    setState('transcribing');
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((res) => { reader.onload = () => res(reader.result); reader.readAsDataURL(blob); });
      const res = await transcribeAudio(blob, language || undefined);
      onTranscript?.({ text: res.text || '', language: res.language || language, audioDataUrl: dataUrl });
      toast.success('Transcribed.');
      discard();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not transcribe. Please try again.');
      setState('recorded');
    }
  };

  return (
    <div data-testid="voice-recorder" className="border border-black/10 bg-[hsl(var(--aangan-sand))] p-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="eyebrow flex items-center gap-2"><Mic size={12} /> Record a voice note</p>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={state === 'recording' || state === 'transcribing'}
          className="text-[12px] bg-transparent border-b border-[hsl(var(--aangan-forest))]/25 py-1 outline-none"
          data-testid="voice-language"
        >
          {INDIAN_LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
      </div>

      <div className="mt-5 flex items-center gap-4">
        {state === 'idle' && (
          <button onClick={start} data-testid="voice-start" className="inline-flex items-center gap-2 px-5 py-3 bg-[hsl(var(--aangan-terracotta))] text-white text-sm">
            <Mic size={14} /> Start recording
          </button>
        )}
        {state === 'recording' && (
          <button onClick={stop} data-testid="voice-stop" className="inline-flex items-center gap-2 px-5 py-3 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm">
            <Square size={14} fill="currentColor" /> Stop ({seconds}s)
          </button>
        )}
        {state === 'recorded' && audioUrl && (
          <>
            <audio controls src={audioUrl} className="h-9" data-testid="voice-playback" />
            <button onClick={transcribe} data-testid="voice-transcribe" className="inline-flex items-center gap-2 px-5 py-3 bg-[hsl(var(--aangan-forest))] text-[hsl(var(--aangan-ivory))] text-sm">
              Transcribe
            </button>
            <button onClick={discard} data-testid="voice-discard" className="inline-flex items-center gap-2 px-3 py-2 text-[12px] text-[hsl(var(--aangan-forest))]/70 hover:text-[hsl(var(--aangan-terracotta))]">
              <Trash2 size={12} /> Discard
            </button>
          </>
        )}
        {state === 'transcribing' && (
          <p className="inline-flex items-center gap-2 text-sm text-[hsl(var(--aangan-forest))]/75">
            <Loader2 size={14} className="animate-spin" /> Listening carefully…
          </p>
        )}
      </div>
      <p className="mt-3 text-[11px] text-[hsl(var(--aangan-forest))]/55">
        Speak in any Indian language — Hindi, Tamil, Bengali, Punjabi, Gujarati, Marathi, Telugu, Kannada, Malayalam, Urdu, Odia, Assamese, or English. Aangan will transcribe it.
      </p>
    </div>
  );
}
