import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Menu, X, Volume2, Play, Pause, Mic, Square, Trash2, Pencil, Plus,
  ChevronRight, ExternalLink, Heart, Radio, Users, Link2, Lock, LogOut, Settings,
  LayoutGrid, Megaphone, MessageSquare, Reply, Send, Loader2, Check, AlertTriangle,
  ArrowLeft, Upload, Clock, User, Eye, EyeOff, MessageCircle, Music2, Globe,
  Newspaper, Rss, Video, Mail, Phone, MapPin,
} from 'lucide-react';
import { api, setToken, getToken } from './api.js';
import logoUrl from './assets/logo.png';

/* ============================================================
   CONSTANTS
============================================================ */
const LOGO_DATA_URL = logoUrl;
const DEFAULT_STREAM_URL = '';

const NAV_MENU = [
  { key: 'home', label: 'Homepage' },
  { key: 'research', label: 'Research' },
  { key: 'team', label: 'Our Team' },
  { key: 'contact', label: 'Contact Us' },
  { key: 'donate', label: 'Donate' },
];

const CARD_GRADIENTS = [
  'from-blue-900 to-blue-700',
  'from-sky-600 to-blue-800',
  'from-blue-800 to-sky-500',
  'from-blue-950 to-blue-700',
  'from-sky-700 to-blue-900',
];

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch (e) { return ''; }
}
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}
function extractYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  return m ? m[1] : null;
}
function mediaThumbUrl(mediaType, mediaUrl) {
  if (mediaType === 'image') return mediaUrl || '';
  if (mediaType === 'youtube') {
    const id = extractYouTubeId(mediaUrl);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
  }
  return ''; // video-file/link posts have no easy auto-thumbnail — falls back to the icon placeholder
}
function stripHtml(text = '') { return text.replace(/\s+/g, ' ').trim(); }

/* ============================================================
   FALLBACK SHAPES (used only until the API responds)
============================================================ */
function defaultContact() {
  return { address: '', phone: '', email: '', socials: { facebook: '', twitter: '', instagram: '', youtube: '', tiktok: '', whatsapp: '' } };
}
function defaultDonate() {
  return { intro: '', methods: [] };
}
function defaultSettings() {
  return { stationName: 'NYCE 90.7 FM', tagline: '', liveStreamUrl: DEFAULT_STREAM_URL };
}

/* ============================================================
   UI PRIMITIVES
============================================================ */
function PulseLine({ className = '', active = true }) {
  return (
    <svg viewBox="0 0 300 40" className={className} preserveAspectRatio="none">
      <polyline points="0,20 40,20 55,6 70,34 85,20 120,20 135,10 150,30 165,20 300,20"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={active ? 'nyce-pulse-anim' : ''} />
    </svg>
  );
}
function Eyebrow({ children, className = '' }) {
  return <span className={`inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-sky-600 ${className}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{children}</span>;
}
function CategoryTag({ name, isLive }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isLive ? 'bg-red-600 text-white' : 'bg-blue-950 text-white'}`}>
      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
      {name}
    </span>
  );
}
function AdSlot({ label = 'Advertisement', variant = 'banner', ads = [] }) {
  const sizeClass = variant === 'banner' ? 'h-24 md:h-28' : 'h-40';
  const active = ads.filter((a) => a.active && a.imageUrl);
  // Picks one ad per slot render — simple rotation across however many are active, rather
  // than needing separate "which slot" targeting for a site this size.
  const ad = useMemo(() => (active.length ? active[Math.floor(Math.random() * active.length)] : null), [active.length]);

  if (ad) {
    return (
      <a href={ad.linkUrl || '#'} target="_blank" rel="noopener noreferrer sponsored" className={`w-full ${sizeClass} rounded-xl overflow-hidden block relative group`}>
        <img src={ad.imageUrl} alt={ad.advertiser} className="w-full h-full object-cover" />
        <span className="absolute top-1.5 left-1.5 bg-blue-950 text-white text-xs font-semibold px-1.5 py-0.5 rounded opacity-80">Ad</span>
      </a>
    );
  }
  return (
    <div className={`w-full ${sizeClass} rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-1`}>
      <Megaphone size={20} />
      <span className="text-xs font-semibold tracking-widest uppercase">{label}</span>
      <span className="text-xs text-slate-300">Add sponsors from Admin → Ads</span>
    </div>
  );
}
function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base' };
  const variants = {
    primary: 'bg-blue-700 text-white hover:bg-blue-800',
    dark: 'bg-blue-950 text-white hover:bg-blue-900',
    outline: 'border-2 border-blue-950 text-blue-950 hover:bg-blue-950 hover:text-white',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    subtle: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>{children}</button>;
}
function IconButton({ children, className = '', ...props }) {
  return <button className={`w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-blue-950 transition-colors ${className}`} {...props}>{children}</button>;
}
function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-blue-950 opacity-60" onClick={onClose} />
      <div className={`relative bg-white w-full ${wide ? 'md:max-w-3xl' : 'md:max-w-lg'} md:rounded-2xl rounded-t-2xl max-h-screen overflow-y-auto shadow-2xl`}>
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-blue-950" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h3>
          <IconButton onClick={onClose} aria-label="Close"><X size={18} /></IconButton>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-blue-950 opacity-60" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
        <div className="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3"><AlertTriangle size={20} /></div>
        <h3 className="font-bold text-blue-950 mb-1">{title}</h3>
        <p className="text-sm text-slate-500 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="subtle" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
}
function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 text-slate-400">
      <Icon size={32} className="mb-3 opacity-60" />
      <p className="font-semibold text-slate-500">{title}</p>
      {message && <p className="text-sm mt-1 max-w-xs">{message}</p>}
    </div>
  );
}
function Toast({ message, show }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-blue-950 text-white px-5 py-3 rounded-full shadow-xl text-sm font-medium flex items-center gap-2 nyce-toast-in">
      <Check size={16} className="text-sky-400" /> {message}
    </div>
  );
}
function CardThumb({ imageUrl, gradientIndex = 0, icon: Icon = Newspaper, className = '' }) {
  if (imageUrl) return <img src={imageUrl} alt="" className={`object-cover ${className}`} />;
  const grad = CARD_GRADIENTS[gradientIndex % CARD_GRADIENTS.length];
  return <div className={`bg-gradient-to-br ${grad} flex items-center justify-center text-blue-200 ${className}`}><Icon size={28} /></div>;
}
function MediaPlaceholder() {
  return <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center text-blue-300"><Newspaper size={36} /></div>;
}
function MediaEmbed({ type, url, dataUrl, title = '' }) {
  const src = dataUrl || url;
  if (type === 'youtube') {
    const ytId = extractYouTubeId(url);
    if (!ytId) return <MediaPlaceholder />;
    return (
      <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
        <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${ytId}`} title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  if (type === 'video') {
    if (!src) return <MediaPlaceholder />;
    return <div className="w-full aspect-video rounded-xl overflow-hidden bg-black"><video className="w-full h-full object-contain" src={src} controls /></div>;
  }
  if (type === 'image') {
    if (!src) return <MediaPlaceholder />;
    return <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-100"><img className="w-full h-full object-cover" src={src} alt={title} /></div>;
  }
  return <MediaPlaceholder />;
}
function brandIcon(pathChildren) {
  // Small self-contained brand marks (not a facsimile of any single official logo file) —
  // current lucide-react no longer ships these, so we draw simple, recognizable glyphs instead.
  return function BrandIcon({ size = 20, className = '', ...props }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
        {pathChildren}
      </svg>
    );
  };
}
const FacebookMark = brandIcon(<path d="M14 13.5h2.5l.5-3H14V8.5c0-.87.24-1.5 1.5-1.5H17V4.14C16.65 4.1 15.7 4 14.5 4 12 4 10.3 5.49 10.3 8.2v2.3H8v3h2.3V21h3v-7.5Z" />);
const InstagramMark = brandIcon(<><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.2" cy="6.8" r="1.1" /></>);
const YoutubeMark = brandIcon(<><rect x="2.5" y="6" width="19" height="12" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M10.5 9.5v5l4.5-2.5-4.5-2.5Z" /></>);
const XMark = brandIcon(<path d="M5 4h3.2l3.9 5.3L16.3 4H19l-6 7.6L19.5 20h-3.2l-4.3-5.8L7 20H4.3l6.4-8.2L5 4Z" />);
const LinkedinMark = brandIcon(<path d="M6.9 8.5H3.8V20h3.1V8.5ZM5.4 3.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6ZM20.2 20h-3.1v-6c0-1.4 0-3.3-2-3.3s-2.3 1.6-2.3 3.2V20h-3.1V8.5h3v1.6h.1c.4-.8 1.5-1.7 3.1-1.7 3.3 0 3.9 2.2 3.9 5V20Z" />);

const SOCIAL_ICON_MAP = { facebook: FacebookMark, twitter: XMark, instagram: InstagramMark, youtube: YoutubeMark, tiktok: Music2, whatsapp: MessageCircle, linkedin: LinkedinMark };
function SocialIcon({ platform, ...props }) { const Icon = SOCIAL_ICON_MAP[platform] || Globe; return <Icon {...props} />; }
function Clamp2({ children, className = '' }) {
  return <p className={className} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{children}</p>;
}

/* ============================================================
   COMMENTS (text + voice, threaded)
============================================================ */
function useAudioRecorder(maxSeconds = 60) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null); // object URL, just for local preview playback
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const cleanupTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  const stop = useCallback(() => {
    if (mrRef.current && mrRef.current.state !== 'inactive') mrRef.current.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    cleanupTimer();
    setRecording(false);
  }, []);

  const start = useCallback(async () => {
    setError(''); setAudioBlob(null); setAudioUrl(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Audio recording is not supported in this browser.'); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      mrRef.current = mr;
      mr.start();
      setRecording(true); setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => { if (s + 1 >= maxSeconds) { stop(); return maxSeconds; } return s + 1; });
      }, 1000);
    } catch (e) {
      setError('Microphone access was blocked or unavailable. Check your browser\'s microphone permission for this site.');
    }
  }, [maxSeconds, stop]);

  const reset = useCallback(() => {
    setAudioUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setAudioBlob(null); setSeconds(0); setError('');
  }, []);
  useEffect(() => () => cleanupTimer(), []);
  return { recording, audioBlob, audioUrl, seconds, error, start, stop, reset };
}

function CommentComposer({ onSubmit, placeholder = 'Join the conversation…', compact = false }) {
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const rec = useAudioRecorder(60);
  const canSubmit = (mode === 'text' ? text.trim().length > 0 : !!rec.audioBlob) && !posting;

  const submit = async () => {
    if (!canSubmit) return;
    const name = author.trim() || 'Guest listener';
    setPostError('');
    setPosting(true);
    try {
      if (mode === 'text') {
        // The server runs the authoritative profanity filter and returns the (possibly
        // censored) text plus a `flagged` flag — no need to duplicate that logic here.
        await onSubmit({ type: 'text', text: text.trim(), author: name });
        setText('');
      } else {
        const { url } = await api.upload.commentAudio(rec.audioBlob);
        await onSubmit({ type: 'audio', audioUrl: url, author: name });
        rec.reset();
      }
    } catch (err) {
      setPostError(err.message || 'Could not post your comment. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className={`bg-slate-50 rounded-2xl p-3 ${compact ? '' : 'md:p-4'} border border-slate-100`}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name (optional)"
          className="text-xs bg-white border border-slate-200 rounded-full px-3 py-1.5 w-40 focus:outline-none focus:ring-2 focus:ring-sky-400" />
        <div className="ml-auto flex bg-white rounded-full p-0.5 border border-slate-200">
          <button onClick={() => setMode('text')} className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${mode === 'text' ? 'bg-blue-950 text-white' : 'text-slate-500'}`}><MessageSquare size={12} /> Text</button>
          <button onClick={() => setMode('audio')} className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${mode === 'audio' ? 'bg-blue-950 text-white' : 'text-slate-500'}`}><Mic size={12} /> Voice</button>
        </div>
      </div>

      {mode === 'text' ? (
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} rows={compact ? 2 : 3}
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          {rec.error && <p className="text-xs text-red-600 mb-2 flex items-start gap-1"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{rec.error}</p>}
          {!rec.audioUrl ? (
            <div className="flex items-center gap-3">
              <button onClick={rec.recording ? rec.stop : rec.start} aria-label={rec.recording ? 'Stop recording' : 'Start recording'}
                className={`w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 ${rec.recording ? 'bg-red-600 animate-pulse' : 'bg-blue-700'}`}>
                {rec.recording ? <Square size={16} /> : <Mic size={18} />}
              </button>
              <span className="text-sm text-slate-500">{rec.recording ? `Recording… ${rec.seconds}s / 60s` : 'Tap to record a voice comment'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <audio src={rec.audioUrl} controls className="h-9 flex-1" />
              <button onClick={rec.reset} disabled={posting} className="text-xs text-slate-400 hover:text-red-600 shrink-0">Redo</button>
            </div>
          )}
        </div>
      )}

      {postError && <p className="text-xs text-red-600 mt-2 flex items-start gap-1"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{postError}</p>}
      <div className="flex justify-end mt-2">
        <Button size="sm" onClick={submit} disabled={!canSubmit}>{posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Post</Button>
      </div>
    </div>
  );
}

function CommentItem({ comment, allComments, onReply, onDelete, isAdmin, depth = 0 }) {
  const [replying, setReplying] = useState(false);
  const replies = allComments.filter(c => c.parentId === comment.id);
  return (
    <div className={depth > 0 ? 'ml-6 md:ml-10 mt-3 pl-4 border-l-2 border-slate-100' : 'mt-4'}>
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-950 text-white flex items-center justify-center text-xs font-bold shrink-0">{comment.author.slice(0, 1).toUpperCase()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-blue-950">{comment.author}</span>
            <span className="text-xs text-slate-400">{timeAgo(comment.createdAt)}</span>
            {comment.flagged && <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">filtered</span>}
          </div>
          {comment.type === 'audio' ? <audio src={comment.audioData} controls className="h-9 mt-1 max-w-xs" /> : <p className="text-sm text-slate-700 mt-0.5 break-words">{comment.text}</p>}
          <div className="flex items-center gap-3 mt-1">
            <button onClick={() => setReplying(r => !r)} className="text-xs font-semibold text-slate-400 hover:text-blue-700 flex items-center gap-1"><Reply size={12} /> Reply</button>
            {isAdmin && <button onClick={() => onDelete(comment.id)} className="text-xs font-semibold text-slate-400 hover:text-red-600 flex items-center gap-1"><Trash2 size={12} /> Delete</button>}
          </div>
          {replying && <div className="mt-2"><CommentComposer compact placeholder={`Replying to ${comment.author}…`} onSubmit={(payload) => { onReply(comment.id, payload); setReplying(false); }} /></div>}
        </div>
      </div>
      {replies.map(r => <CommentItem key={r.id} comment={r} allComments={allComments} onReply={onReply} onDelete={onDelete} isAdmin={isAdmin} depth={depth + 1} />)}
    </div>
  );
}

function CommentsSection({ targetType, targetId, isAdmin }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    api.comments.list(targetType, targetId)
      .then((c) => { if (active) { setComments(c); setLoading(false); } })
      .catch((err) => { if (active) { setLoadError(err.message || 'Could not load comments.'); setLoading(false); } });
    return () => { active = false; };
  }, [targetType, targetId]);

  const addComment = async (parentId, payload) => {
    const created = await api.comments.create({ targetType, targetId, parentId: parentId || null, ...payload });
    setComments((prev) => [...prev, created]);
  };

  const deleteComment = async (id) => {
    await api.comments.remove(id);
    // The server cascades deletes to any replies — refetch so the tree stays accurate
    // rather than guessing which descendant ids also disappeared.
    const fresh = await api.comments.list(targetType, targetId);
    setComments(fresh);
  };

  const topLevel = comments.filter(c => !c.parentId);
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={18} className="text-blue-700" />
        <h3 className="font-bold text-blue-950" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{comments.length} Comment{comments.length !== 1 ? 's' : ''}</h3>
      </div>
      <CommentComposer onSubmit={(payload) => addComment(null, payload)} />
      {loading ? (
        <div className="py-8 flex justify-center text-slate-300"><Loader2 className="animate-spin" /></div>
      ) : loadError ? (
        <p className="text-sm text-red-500 mt-6 text-center">{loadError}</p>
      ) : topLevel.length === 0 ? (
        <p className="text-sm text-slate-400 mt-6 text-center">Be the first to comment.</p>
      ) : (
        <div className="mt-2 divide-y divide-slate-50">
          {topLevel.map(c => <CommentItem key={c.id} comment={c} allComments={comments} onReply={addComment} onDelete={deleteComment} isAdmin={isAdmin} />)}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ACCESSIBILITY (Text-to-Speech)
============================================================ */
function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const speak = (text) => {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.onstart = () => { setSpeaking(true); setPaused(false); };
    utter.onend = () => { setSpeaking(false); setPaused(false); };
    utter.onerror = () => { setSpeaking(false); setPaused(false); };
    window.speechSynthesis.speak(utter);
  };
  const togglePause = () => {
    if (!supported) return;
    if (paused) { window.speechSynthesis.resume(); setPaused(false); } else { window.speechSynthesis.pause(); setPaused(true); }
  };
  const stop = () => { if (supported) window.speechSynthesis.cancel(); setSpeaking(false); setPaused(false); };
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, []);
  return { supported, speaking, paused, speak, togglePause, stop };
}
function AccessibilityWidget({ getReadableText }) {
  const [open, setOpen] = useState(false);
  const tts = useTTS();
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 w-64 mb-1">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Accessibility</p>
          <p className="text-sm text-slate-600 mb-3">Have this page read aloud.</p>
          {!tts.supported && <p className="text-xs text-amber-600 mb-3">Speech isn't supported in this browser.</p>}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="dark" onClick={() => tts.speak(getReadableText())} disabled={!tts.supported}><Play size={13} /> Read aloud</Button>
            {tts.speaking && (<>
              <IconButton onClick={tts.togglePause} className="bg-slate-100" aria-label="Pause or resume">{tts.paused ? <Play size={14} /> : <Pause size={14} />}</IconButton>
              <IconButton onClick={tts.stop} className="bg-slate-100" aria-label="Stop"><Square size={14} /></IconButton>
            </>)}
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} className="w-14 h-14 rounded-full bg-blue-950 text-white shadow-xl flex items-center justify-center hover:bg-blue-900" aria-label="Accessibility: listen to this page" title="Accessibility: listen to this page">
        <Volume2 size={22} />
      </button>
    </div>
  );
}

/* ============================================================
   LISTEN LIVE
============================================================ */
function ListenLiveWidget({ settings }) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const audioRef = useRef(null);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { setLoadingAudio(true); el.play().then(() => { setPlaying(true); setLoadingAudio(false); }).catch(() => setLoadingAudio(false)); }
  };

  return (
    <div className="fixed bottom-5 left-5 z-40">
      <audio ref={audioRef} src={settings.liveStreamUrl} preload="none" onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      {open && (
        <div className="bg-blue-950 text-white rounded-2xl shadow-2xl p-4 w-64 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold tracking-widest uppercase text-sky-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> On Air</span>
            <IconButton onClick={() => setOpen(false)} className="text-white hover:bg-white/10 w-7 h-7" aria-label="Close"><X size={14} /></IconButton>
          </div>
          <p className="font-bold text-sm mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{settings.stationName} Live FM</p>
          <div className="h-8 my-2 text-sky-400"><PulseLine className="w-full h-full" active={playing} /></div>
          <button onClick={toggle} className="w-full bg-sky-500 hover:bg-sky-400 text-blue-950 font-bold rounded-full py-2 text-sm flex items-center justify-center gap-2">
            {loadingAudio ? <Loader2 size={16} className="animate-spin" /> : playing ? <Pause size={16} /> : <Play size={16} />}
            {playing ? 'Pause' : 'Listen Live'}
          </button>
          <p className="text-xs text-blue-300 mt-2 text-center">Demo stream — add your FM stream URL in Admin → Settings</p>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} className="h-14 pl-4 pr-5 rounded-full bg-blue-950 text-white shadow-xl flex items-center gap-2 hover:bg-blue-900">
        <span className="relative flex items-center justify-center w-6 h-6">
          <Radio size={18} className="text-sky-400" />
          {playing && <span className="absolute inset-0 rounded-full bg-sky-400 animate-ping opacity-75" />}
        </span>
        <span className="text-xs font-bold hidden sm:inline">Listen Live</span>
      </button>
    </div>
  );
}

/* ============================================================
   LAYOUT
============================================================ */
function Header({ settings, onMenuOpen, onNav }) {
  return (
    <header className="sticky top-0 z-30 bg-white shadow-sm">
      <div className="nyce-pulse-strip" />
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center gap-3">
        <button onClick={onMenuOpen} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-blue-950 shrink-0" aria-label="Open menu"><Menu size={22} /></button>
        <button onClick={() => onNav('home')} className="flex items-center gap-2 shrink-0" aria-label={`${settings.stationName} home`}>
          <img src={LOGO_DATA_URL} alt={settings.stationName} className="h-9 md:h-11 w-auto object-contain" />
        </button>
        <span className="hidden md:inline text-xs font-semibold tracking-widest uppercase text-sky-600 ml-1">{settings.tagline}</span>
        <button onClick={() => onNav('admin')} className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-blue-700 px-2 ml-auto"><Lock size={12} /> Admin</button>
      </div>
    </header>
  );
}
function CategoryBar({ categories, activeId, onSelect }) {
  return (
    <div className="bg-blue-950 sticky top-16 md:top-20 z-20">
      <div className="max-w-6xl mx-auto px-4 md:px-6 flex gap-1 overflow-x-auto no-scrollbar">
        <button onClick={() => onSelect(null)} className={`shrink-0 px-4 py-2.5 text-xs font-bold tracking-wide uppercase border-b-2 transition-colors ${!activeId ? 'text-white border-sky-400' : 'text-blue-300 border-transparent hover:text-white'}`}>All Stories</button>
        {categories.map(c => (
          <button key={c.id} onClick={() => onSelect(c.id)} className={`shrink-0 px-4 py-2.5 text-xs font-bold tracking-wide uppercase border-b-2 transition-colors flex items-center gap-1.5 ${activeId === c.id ? 'text-white border-sky-400' : 'text-blue-300 border-transparent hover:text-white'}`}>
            {c.isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}{c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
function MobileMenu({ open, onClose, onNav, settings }) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-blue-950 transition-opacity ${open ? 'opacity-60' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute top-0 left-0 h-full w-72 bg-white shadow-2xl transition-transform duration-300 flex flex-col ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
          <img src={LOGO_DATA_URL} alt={settings.stationName} className="h-9 w-auto object-contain" />
          <IconButton onClick={onClose} aria-label="Close menu"><X size={20} /></IconButton>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {NAV_MENU.map(item => (
            <button key={item.key} onClick={() => { onNav(item.key); onClose(); }} className="w-full text-left px-6 py-3.5 text-blue-950 font-semibold hover:bg-sky-50 flex items-center justify-between group" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {item.label}<ChevronRight size={16} className="text-slate-300 group-hover:text-sky-500" />
            </button>
          ))}
        </nav>
        <button onClick={() => { onNav('admin'); onClose(); }} className="m-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 hover:text-blue-700 border border-slate-200 rounded-full py-2.5"><Lock size={12} /> Admin Access</button>
      </div>
    </div>
  );
}
function Footer({ settings, contact, onNav }) {
  const socials = Object.entries(contact.socials || {}).filter(([, v]) => v);
  return (
    <footer className="bg-blue-950 text-white mt-16">
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-10">
        <div>
          <img src={LOGO_DATA_URL} alt={settings.stationName} className="h-10 w-auto object-contain mb-3 bg-white rounded-lg p-1.5 inline-block" />
          <p className="text-sm text-blue-200 max-w-xs">{settings.tagline}</p>
        </div>
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-sky-400 mb-3">Quick Links</p>
          <div className="flex flex-col gap-2">{NAV_MENU.map(item => <button key={item.key} onClick={() => onNav(item.key)} className="text-sm text-blue-200 hover:text-white text-left">{item.label}</button>)}</div>
        </div>
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-sky-400 mb-3">Follow Us</p>
          <div className="flex gap-2 flex-wrap">
            {socials.map(([k, v]) => <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-blue-900 hover:bg-sky-500 flex items-center justify-center"><SocialIcon platform={k} size={16} /></a>)}
            {socials.length === 0 && <p className="text-sm text-blue-300">Add your social links in Admin → Contact & Socials</p>}
          </div>
        </div>
      </div>
      <div className="border-t border-blue-900 py-5 text-center text-xs text-blue-300">© {new Date().getFullYear()} {settings.stationName}. All rights reserved.</div>
    </footer>
  );
}

/* ============================================================
   PUBLIC PAGES
============================================================ */
function ArticleCard({ article, category, onOpen, index = 0, layout = 'grid' }) {
  if (layout === 'hero') {
    return (
      <button onClick={() => onOpen(article)} className="text-left w-full group">
        <div className="relative rounded-2xl overflow-hidden h-64 md:h-96">
          <CardThumb imageUrl={article.imageUrl} gradientIndex={index} className="w-full h-full" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(23,37,84,0.92) 0%, rgba(23,37,84,0.25) 55%, transparent 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
            {category && <CategoryTag name={category.name} isLive={category.isLive} />}
            <h2 className="text-white text-2xl md:text-4xl font-bold mt-3 leading-tight group-hover:text-sky-300 transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{article.title}</h2>
            <p className="text-blue-100 text-sm mt-2 hidden md:block max-w-2xl">{article.excerpt}</p>
            <p className="text-blue-300 text-xs mt-3">{article.author} · {timeAgo(article.createdAt)}</p>
          </div>
        </div>
      </button>
    );
  }
  return (
    <button onClick={() => onOpen(article)} className="text-left group flex flex-col">
      <div className="rounded-xl overflow-hidden mb-3"><CardThumb imageUrl={article.imageUrl} gradientIndex={index} className="w-full aspect-video" /></div>
      {category && <CategoryTag name={category.name} isLive={category.isLive} />}
      <h3 className="font-bold text-blue-950 mt-2 leading-snug group-hover:text-blue-700 transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{article.title}</h3>
      <Clamp2 className="text-sm text-slate-500 mt-1">{article.excerpt}</Clamp2>
      <p className="text-xs text-slate-400 mt-2">{article.author} · {timeAgo(article.createdAt)}</p>
    </button>
  );
}
function HomePage({ articles, categories, ads, onOpenArticle }) {
  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);
  const sorted = [...articles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const featured = sorted.find(a => a.featured) || sorted[0];
  const rest = sorted.filter(a => a.id !== featured?.id);
  if (!featured) return <div className="max-w-6xl mx-auto px-4"><EmptyState icon={Newspaper} title="No stories yet" message="Publish your first story from the admin dashboard." /></div>;
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <ArticleCard article={featured} category={catMap[featured.categoryId]} onOpen={onOpenArticle} layout="hero" index={0} />
      <div className="my-8"><AdSlot ads={ads} /></div>
      <Eyebrow className="mb-4 block">Latest Stories</Eyebrow>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
        {rest.map((a, i) => (
          <React.Fragment key={a.id}>
            <ArticleCard article={a} category={catMap[a.categoryId]} onOpen={onOpenArticle} index={i + 1} />
            {(i + 1) % 5 === 0 && <div className="sm:col-span-2 lg:col-span-3"><AdSlot ads={ads} /></div>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
function CategoryPage({ category, articles, categories, ads, onOpenArticle }) {
  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);
  const filtered = articles.filter(a => a.categoryId === category.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="mb-6"><CategoryTag name={category.name} isLive={category.isLive} /><h1 className="text-3xl font-bold text-blue-950 mt-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{category.name}</h1></div>
      <div className="mb-6"><AdSlot ads={ads} /></div>
      {filtered.length === 0 ? <EmptyState icon={Newspaper} title="No stories in this category yet" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">{filtered.map((a, i) => <ArticleCard key={a.id} article={a} category={catMap[a.categoryId]} onOpen={onOpenArticle} index={i} />)}</div>
      )}
    </div>
  );
}
function ArticlePage({ article, category, ads, onBack, isAdmin, onEditGo, onDelete }) {
  if (!article) return <div className="max-w-3xl mx-auto px-4 py-16"><EmptyState icon={Newspaper} title="Story not found" message="It may have been removed." /></div>;
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-blue-700 mb-5"><ArrowLeft size={15} /> Back</button>
      {category && <CategoryTag name={category.name} isLive={category.isLive} />}
      <h1 className="text-2xl md:text-4xl font-bold text-blue-950 mt-3 leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{article.title}</h1>
      <div className="flex items-center gap-3 mt-4 text-sm text-slate-400 flex-wrap">
        <span className="flex items-center gap-1.5"><User size={13} />{article.author}</span>
        <span className="flex items-center gap-1.5"><Clock size={13} />{formatDate(article.createdAt)}</span>
        {isAdmin && (
          <div className="ml-auto flex gap-2">
            <IconButton onClick={onEditGo} className="bg-slate-100" aria-label="Edit"><Pencil size={14} /></IconButton>
            <IconButton onClick={() => { if (window.confirm('Delete this article? This cannot be undone.')) onDelete(article); }} className="bg-red-50 text-red-600" aria-label="Delete"><Trash2 size={14} /></IconButton>
          </div>
        )}
      </div>
      <div className="my-6">
        {article.youtubeUrl ? <MediaEmbed type="youtube" url={article.youtubeUrl} title={article.title} /> :
         article.videoUrl ? <MediaEmbed type="video" url={article.videoUrl} title={article.title} /> :
         article.imageUrl ? <MediaEmbed type="image" dataUrl={article.imageUrl} title={article.title} /> : null}
      </div>
      <div className="text-slate-700 leading-relaxed whitespace-pre-line text-base">{article.body}</div>
      <div className="my-8"><AdSlot ads={ads} /></div>
      <div className="border-t border-slate-100 pt-8 mt-8"><CommentsSection targetType="article" targetId={article.id} isAdmin={isAdmin} /></div>
    </div>
  );
}
function LivePage({ livePosts, ads, onOpen }) {
  const sorted = [...livePosts].sort((a, b) => {
    if (a.status === 'live' && b.status !== 'live') return -1;
    if (b.status === 'live' && a.status !== 'live') return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center gap-2 mb-6"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /><h1 className="text-3xl font-bold text-blue-950" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Live</h1></div>
      <div className="mb-6"><AdSlot ads={ads} /></div>
      {sorted.length === 0 ? <EmptyState icon={Video} title="Nothing live right now" message="Check back soon, or catch our replays here once they're posted." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((p, i) => (
            <button key={p.id} onClick={() => onOpen(p)} className="text-left rounded-xl overflow-hidden bg-slate-50 hover:shadow-lg transition-shadow group">
              <div className="relative">
                <CardThumb imageUrl={mediaThumbUrl(p.mediaType, p.mediaUrl)} gradientIndex={i} icon={Video} className="w-full aspect-video" />
                {p.status === 'live' && <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE NOW</span>}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-blue-950 group-hover:text-blue-700" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{p.title}</h3>
                <Clamp2 className="text-sm text-slate-500 mt-1">{p.description}</Clamp2>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function LiveDetailModal({ post, onClose, isAdmin, onEditGo, onDelete }) {
  if (!post) return null;
  return (
    <Modal open={!!post} onClose={onClose} title={post.title} wide>
      {post.status === 'live' && <div className="mb-3 inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" /> LIVE NOW</div>}
      <MediaEmbed type={post.mediaType} url={post.mediaUrl} dataUrl={post.mediaType === 'image' ? post.mediaUrl : ''} title={post.title} />
      <p className="text-slate-600 mt-4 whitespace-pre-line">{post.description}</p>
      {isAdmin && (
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="subtle" onClick={onEditGo}><Pencil size={13} /> Edit in Admin</Button>
          <Button size="sm" variant="danger" onClick={() => { if (window.confirm('Delete this live post? This cannot be undone.')) onDelete(post); }}><Trash2 size={13} /> Delete</Button>
        </div>
      )}
      <div className="border-t border-slate-100 pt-6 mt-6"><CommentsSection targetType="live" targetId={post.id} isAdmin={isAdmin} /></div>
    </Modal>
  );
}
function ResearchPage({ links }) {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
      <Eyebrow>Resources</Eyebrow>
      <h1 className="text-3xl font-bold text-blue-950 mt-2 mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Research</h1>
      <p className="text-slate-500 mb-6">Handy external links curated by our newsroom for fact-checking and further reading.</p>
      {links.length === 0 ? <EmptyState icon={Link2} title="No links yet" /> : (
        <div className="grid gap-3">
          {links.map(l => (
            <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-slate-50 hover:bg-sky-50 rounded-xl p-4 border border-slate-100 group">
              <div className="w-10 h-10 rounded-full bg-blue-950 text-white flex items-center justify-center shrink-0"><Globe size={16} /></div>
              <div className="flex-1 min-w-0"><p className="font-semibold text-blue-950 group-hover:text-blue-700">{l.label}</p>{l.description && <p className="text-sm text-slate-500 truncate">{l.description}</p>}</div>
              <ExternalLink size={16} className="text-slate-300 shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
function TeamPage({ team }) {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <Eyebrow>The People Behind The Mic</Eyebrow>
      <h1 className="text-3xl font-bold text-blue-950 mt-2 mb-8" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Our Team</h1>
      {team.length === 0 ? <EmptyState icon={Users} title="No team members added yet" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map((m, i) => (
            <div key={m.id} className="text-center bg-slate-50 rounded-2xl p-6">
              <div className="w-24 h-24 rounded-full mx-auto overflow-hidden mb-4"><CardThumb imageUrl={m.photoUrl} gradientIndex={i} icon={User} className="w-full h-full" /></div>
              <p className="font-bold text-blue-950" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{m.name}</p>
              <p className="text-sky-600 text-sm font-semibold mb-2">{m.role}</p>
              <p className="text-sm text-slate-500">{m.bio}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function ContactPage({ contact }) {
  const [sent, setSent] = useState(false);
  const socials = Object.entries(contact.socials || {}).filter(([, v]) => v);
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
      <Eyebrow>Get In Touch</Eyebrow>
      <h1 className="text-3xl font-bold text-blue-950 mt-2 mb-8" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Contact Us</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-start gap-3"><MapPin size={18} className="text-sky-600 mt-0.5" /><p className="text-slate-600">{contact.address}</p></div>
          <div className="flex items-center gap-3"><Phone size={18} className="text-sky-600" /><p className="text-slate-600">{contact.phone}</p></div>
          <div className="flex items-center gap-3"><Mail size={18} className="text-sky-600" /><p className="text-slate-600">{contact.email}</p></div>
          {socials.length > 0 && <div className="flex gap-2 pt-2">{socials.map(([k, v]) => <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-blue-950 text-white flex items-center justify-center hover:bg-sky-500"><SocialIcon platform={k} size={16} /></a>)}</div>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="bg-slate-50 rounded-2xl p-5 space-y-3">
          <input required placeholder="Your name" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          <input required type="email" placeholder="Your email" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          <textarea required placeholder="Message" rows={4} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" />
          <Button type="submit" className="w-full justify-center">{sent ? <><Check size={14} /> Sent</> : 'Send Message'}</Button>
          <p className="text-xs text-slate-400">Wiring this to a real inbox needs the production backend — see notes below.</p>
        </form>
      </div>
    </div>
  );
}
function DonatePage({ donate }) {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
      <Eyebrow>Support The Station</Eyebrow>
      <h1 className="text-3xl font-bold text-blue-950 mt-2 mb-4 flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}><Heart className="text-red-500" fill="currentColor" /> Donate</h1>
      <p className="text-slate-500 mb-6">{donate.intro}</p>
      <div className="grid gap-3">{(donate.methods || []).map(m => <div key={m.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100"><p className="font-bold text-blue-950">{m.label}</p><p className="text-sm text-slate-500 mt-0.5">{m.detail}</p></div>)}</div>
    </div>
  );
}

/* ============================================================
   ADMIN
============================================================ */
function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const { token, admin } = await api.auth.login(username.trim(), pw);
      setToken(token);
      onLogin(admin);
    } catch (error) {
      setErr(error.message || 'Incorrect username or password.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-950 text-white flex items-center justify-center mx-auto mb-4"><Lock size={22} /></div>
        <h1 className="text-2xl font-bold text-blue-950" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Admin Access</h1>
        <p className="text-sm text-slate-400 mt-1">Sign in to manage the site.</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" autoFocus
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
        <div className="relative">
          <input type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Toggle password visibility">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
        </div>
        {err && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={12} />{err}</p>}
        <Button type="submit" className="w-full justify-center" disabled={loading}>{loading ? <Loader2 size={14} className="animate-spin" /> : 'Sign In'}</Button>
      </form>
    </div>
  );
}
function ImageField({ value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError('Please use a file under 8MB.'); return; }
    setError(''); setUploading(true);
    try {
      const { url } = await api.upload.file(file);
      onChange(url);
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };
  return (
    <div>
      <div className="flex items-center gap-2">
        {value ? (
          <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 group">
            <img src={value} className="w-full h-full object-cover" alt="" />
            <button onClick={() => onChange('')} type="button" className="absolute inset-0 bg-blue-950 opacity-0 group-hover:opacity-70 flex items-center justify-center text-white transition-opacity" aria-label="Remove image"><X size={14} /></button>
          </div>
        ) : (
          <button onClick={() => inputRef.current?.click()} type="button" disabled={uploading} className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-300 shrink-0">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <input placeholder="or paste image URL" value={value || ''} onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400" />
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
function AdminEntityEditor({ items, fields, onSave, onDelete, itemLabel = 'item', renderExtra }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);

  const startNew = () => { setForm(Object.fromEntries(fields.map(f => [f.key, f.type === 'checkbox' ? false : '']))); setEditing('new'); };
  const startEdit = (item) => { setForm(item); setEditing(item.id); };
  const cancel = () => { setEditing(null); setForm({}); };
  const save = () => {
    for (const f of fields) { if (f.required && !String(form[f.key] || '').trim()) return; }
    const item = editing === 'new' ? { id: uid(itemLabel.slice(0, 3)), ...form } : { ...form, id: editing };
    onSave(item, editing === 'new');
    cancel();
  };
  const primaryKey = fields.find(f => f.primary)?.key || fields[0].key;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">{items.length} {itemLabel}{items.length !== 1 ? 's' : ''}</p>
        {editing === null && <Button size="sm" onClick={startNew}><Plus size={14} /> Add {itemLabel}</Button>}
      </div>
      {editing !== null && (
        <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-100">
          <div className="grid sm:grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
                {f.type !== 'checkbox' && <label className="text-xs font-semibold text-slate-500 mb-1 block">{f.label}{f.required && ' *'}</label>}
                {f.type === 'textarea' ? (
                  <textarea rows={3} value={form[f.key] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" />
                ) : f.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 mt-1.5"><input type="checkbox" checked={!!form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} className="w-4 h-4" /><span className="text-sm text-slate-500">{f.checkboxLabel}</span></label>
                ) : f.type === 'image' ? (
                  <ImageField value={form[f.key] || ''} onChange={(v) => setForm({ ...form, [f.key]: v })} />
                ) : (
                  <input type={f.type || 'text'} value={form[f.key] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4"><Button size="sm" onClick={save}><Check size={14} /> Save</Button><Button size="sm" variant="subtle" onClick={cancel}>Cancel</Button></div>
        </div>
      )}
      <div className="grid gap-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-3">
            {fields[0].type === 'image' && <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0"><CardThumb imageUrl={item[fields[0].key]} className="w-full h-full" /></div>}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-blue-950 text-sm truncate">{item[primaryKey]}</p>
              {renderExtra && renderExtra(item) && <p className="text-xs text-slate-400 truncate">{renderExtra(item)}</p>}
            </div>
            <IconButton onClick={() => startEdit(item)} className="bg-slate-50" aria-label="Edit"><Pencil size={14} /></IconButton>
            <IconButton onClick={() => setConfirmDelete(item)} className="bg-red-50 text-red-600" aria-label="Delete"><Trash2 size={14} /></IconButton>
          </div>
        ))}
      </div>
      <ConfirmDialog open={!!confirmDelete} title={`Delete this ${itemLabel}?`} message="This can't be undone." onConfirm={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }} onCancel={() => setConfirmDelete(null)} />
    </div>
  );
}
function AdminArticles({ articles, categories, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const blank = () => ({ title: '', categoryId: categories[0]?.id || '', excerpt: '', body: '', imageUrl: '', videoUrl: '', youtubeUrl: '', author: '', featured: false });
  const startNew = () => { setForm(blank()); setEditing('new'); };
  const startEdit = (a) => { setForm(a); setEditing(a.id); };
  const cancel = () => { setEditing(null); setForm({}); };
  const save = () => {
    if (!form.title.trim() || !form.categoryId) return;
    const item = editing === 'new' ? { id: uid('art'), createdAt: new Date().toISOString(), ...form } : { ...form, id: editing };
    onSave(item, editing === 'new');
    cancel();
  };
  const sorted = [...articles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><p className="text-sm text-slate-400">{articles.length} article{articles.length !== 1 ? 's' : ''}</p>{editing === null && <Button size="sm" onClick={startNew}><Plus size={14} /> New Article</Button>}</div>
      {editing !== null && (
        <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-100 space-y-3">
          <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Category *</label><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Author</label><input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" /></div>
          </div>
          <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Excerpt</label><input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" /></div>
          <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Body</label><textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" /></div>
          <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Cover image</label><ImageField value={form.imageUrl} onChange={(v) => setForm({ ...form, imageUrl: v })} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-slate-500 mb-1 block">YouTube link (optional)</label><input value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })} placeholder="https://youtube.com/watch?v=…" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" /></div>
            <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Video URL (optional)</label><input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://…mp4" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" /></div>
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="w-4 h-4" /><span className="text-sm text-slate-500">Feature on homepage hero</span></label>
          <div className="flex gap-2 pt-1"><Button size="sm" onClick={save}><Check size={14} /> Save Article</Button><Button size="sm" variant="subtle" onClick={cancel}>Cancel</Button></div>
        </div>
      )}
      <div className="grid gap-2">
        {sorted.map(a => (
          <div key={a.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0"><CardThumb imageUrl={a.imageUrl} className="w-full h-full" /></div>
            <div className="min-w-0 flex-1"><p className="font-semibold text-blue-950 text-sm truncate">{a.title}{a.featured && <span className="ml-2 text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">Featured</span>}</p><p className="text-xs text-slate-400 truncate">{categories.find(c => c.id === a.categoryId)?.name || '—'} · {formatDate(a.createdAt)}</p></div>
            <IconButton onClick={() => startEdit(a)} className="bg-slate-50" aria-label="Edit"><Pencil size={14} /></IconButton>
            <IconButton onClick={() => setConfirmDelete(a)} className="bg-red-50 text-red-600" aria-label="Delete"><Trash2 size={14} /></IconButton>
          </div>
        ))}
      </div>
      <ConfirmDialog open={!!confirmDelete} title="Delete this article?" message="This will also remove its comments. This can't be undone." onConfirm={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }} onCancel={() => setConfirmDelete(null)} />
    </div>
  );
}
function AdminLive({ liveposts, categories, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const liveCat = categories.find(c => c.isLive);
  const blank = () => ({ title: '', description: '', mediaType: 'image', mediaUrl: '', status: 'ended', categoryId: liveCat?.id || categories[0]?.id });
  const startNew = () => { setForm(blank()); setEditing('new'); };
  const startEdit = (p) => { setForm(p); setEditing(p.id); };
  const cancel = () => { setEditing(null); setForm({}); };
  const save = () => {
    if (!form.title.trim()) return;
    const item = editing === 'new' ? { id: uid('live'), createdAt: new Date().toISOString(), ...form } : { ...form, id: editing };
    onSave(item, editing === 'new');
    cancel();
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><p className="text-sm text-slate-400">{liveposts.length} live post{liveposts.length !== 1 ? 's' : ''}</p>{editing === null && <Button size="sm" onClick={startNew}><Plus size={14} /> New Live Post</Button>}</div>
      {editing !== null && (
        <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-100 space-y-3">
          <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" /></div>
          <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Description</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Media type</label><select value={form.mediaType} onChange={(e) => setForm({ ...form, mediaType: e.target.value, mediaUrl: '' })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"><option value="image">Picture</option><option value="video">Video file / link</option><option value="youtube">YouTube link</option></select></div>
            <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"><option value="live">Live now</option><option value="ended">Ended / replay</option></select></div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">{form.mediaType === 'image' ? 'Picture' : form.mediaType === 'youtube' ? 'YouTube URL' : 'Video URL'}</label>
            {form.mediaType === 'image' ? <ImageField value={form.mediaUrl} onChange={(v) => setForm({ ...form, mediaUrl: v })} /> : <input value={form.mediaUrl} onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })} placeholder={form.mediaType === 'youtube' ? 'https://youtube.com/watch?v=…' : 'https://…mp4'} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />}
          </div>
          <div className="flex gap-2 pt-1"><Button size="sm" onClick={save}><Check size={14} /> Save</Button><Button size="sm" variant="subtle" onClick={cancel}>Cancel</Button></div>
        </div>
      )}
      <div className="grid gap-2">
        {liveposts.map(p => (
          <div key={p.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-3">
            <div className="min-w-0 flex-1"><p className="font-semibold text-blue-950 text-sm truncate">{p.title} {p.status === 'live' && <span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">LIVE</span>}</p><p className="text-xs text-slate-400 truncate">{p.mediaType} · {formatDate(p.createdAt)}</p></div>
            <IconButton onClick={() => startEdit(p)} className="bg-slate-50" aria-label="Edit"><Pencil size={14} /></IconButton>
            <IconButton onClick={() => setConfirmDelete(p)} className="bg-red-50 text-red-600" aria-label="Delete"><Trash2 size={14} /></IconButton>
          </div>
        ))}
      </div>
      <ConfirmDialog open={!!confirmDelete} title="Delete this live post?" message="This can't be undone." onConfirm={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }} onCancel={() => setConfirmDelete(null)} />
    </div>
  );
}
function AdminContact({ contact, onSave }) {
  const [form, setForm] = useState(contact);
  const [saved, setSaved] = useState(false);
  const save = () => { onSave(form); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  return (
    <div className="space-y-4 max-w-xl">
      <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Studio address</label><textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" /></div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" /></div>
        <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" /></div>
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 pt-2">Social links</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {Object.keys(form.socials).map(key => (
          <div key={key} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><SocialIcon platform={key} size={15} className="text-blue-950" /></div>
            <input placeholder={`${key} URL`} value={form.socials[key]} onChange={(e) => setForm({ ...form, socials: { ...form.socials, [key]: e.target.value } })} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          </div>
        ))}
      </div>
      <Button size="sm" onClick={save}>{saved ? <><Check size={14} /> Saved</> : 'Save Changes'}</Button>
    </div>
  );
}
function AdminDonate({ donate, onSaveIntro, onSaveMethod, onDeleteMethod }) {
  const [intro, setIntro] = useState(donate.intro);
  const methods = donate.methods || [];
  return (
    <div className="space-y-6 max-w-xl">
      <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Intro message</label><textarea rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} onBlur={() => onSaveIntro({ intro })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" /></div>
      <AdminEntityEditor items={methods} itemLabel="donation method"
        fields={[{ key: 'label', label: 'Label', required: true, primary: true }, { key: 'detail', label: 'Details', type: 'textarea' }]}
        renderExtra={(m) => m.detail}
        onSave={onSaveMethod}
        onDelete={onDeleteMethod} />
    </div>
  );
}
function AdminSettings({ settings, onSave }) {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  const save = () => { onSave(form); setSaved(true); setTimeout(() => setSaved(false), 1500); };

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwStatus, setPwStatus] = useState('');
  const changePassword = async (e) => {
    e.preventDefault();
    setPwStatus('');
    try {
      await api.auth.changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwStatus('ok');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setPwStatus(err.message || 'Could not change password.');
    }
  };

  return (
    <div className="space-y-8 max-w-xl">
      <div className="space-y-4">
        <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Station name</label><input value={form.stationName} onChange={(e) => setForm({ ...form, stationName: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" /></div>
        <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Tagline</label><input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" /></div>
        <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Live FM stream URL</label><input value={form.liveStreamUrl} onChange={(e) => setForm({ ...form, liveStreamUrl: e.target.value })} placeholder="https://your-stream-host/stream.mp3" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" /><p className="text-xs text-slate-400 mt-1">Get this URL from your streaming host (Zeno.fm, Radio.co, Shoutcast/Icecast, etc).</p></div>
        <Button size="sm" onClick={save}>{saved ? <><Check size={14} /> Saved</> : 'Save Settings'}</Button>
      </div>

      <div className="border-t border-slate-100 pt-6">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Change your admin password</p>
        <form onSubmit={changePassword} className="space-y-3">
          <input type="password" required placeholder="Current password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          <input type="password" required placeholder="New password (min 8 characters)" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          {pwStatus === 'ok' && <p className="text-xs text-emerald-600 flex items-center gap-1"><Check size={12} /> Password updated.</p>}
          {pwStatus && pwStatus !== 'ok' && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={12} />{pwStatus}</p>}
          <Button size="sm" type="submit" variant="subtle">Update Password</Button>
        </form>
      </div>
    </div>
  );
}
function AdminComments({ articles, liveposts }) {
  const [selected, setSelected] = useState(null);
  const allTargets = [...articles.map(a => ({ type: 'article', id: a.id, title: a.title })), ...liveposts.map(p => ({ type: 'live', id: p.id, title: p.title }))];
  return (
    <div>
      <p className="text-sm text-slate-400 mb-4">Pick a story or live post to review and moderate its comments.</p>
      <div className="grid gap-2 mb-6">
        {allTargets.map(t => <button key={`${t.type}-${t.id}`} onClick={() => setSelected(t)} className={`text-left px-4 py-3 rounded-xl border text-sm font-semibold ${selected?.id === t.id ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-slate-100 bg-white text-slate-600'}`}>{t.title} <span className="text-xs font-normal text-slate-400">· {t.type}</span></button>)}
        {allTargets.length === 0 && <p className="text-sm text-slate-400">Publish a story or live post first.</p>}
      </div>
      {selected && <div className="bg-slate-50 rounded-2xl p-4"><CommentsSection targetType={selected.type} targetId={selected.id} isAdmin={true} /></div>}
    </div>
  );
}
function AdminOverview({ articles, liveposts, categories, team }) {
  const stats = [
    { label: 'Articles', value: articles.length, icon: Newspaper },
    { label: 'Live posts', value: liveposts.length, icon: Video },
    { label: 'Categories', value: categories.length, icon: LayoutGrid },
    { label: 'Team members', value: team.length, icon: Users },
  ];
  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-5"><s.icon size={18} className="text-sky-600 mb-2" /><p className="text-2xl font-bold text-blue-950" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</p><p className="text-xs text-slate-400">{s.label}</p></div>)}
      </div>
      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5 text-sm text-blue-900">
        <p className="font-semibold mb-1">Welcome back.</p>
        <p className="text-blue-800">Use the tabs to publish stories, manage categories, moderate comments, and update site-wide settings. Changes here update the live site immediately.</p>
      </div>
    </div>
  );
}
const ADMIN_TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'articles', label: 'Articles', icon: Newspaper },
  { key: 'categories', label: 'Categories', icon: Rss },
  { key: 'live', label: 'Live', icon: Video },
  { key: 'comments', label: 'Comments', icon: MessageSquare },
  { key: 'team', label: 'Our Team', icon: Users },
  { key: 'research', label: 'Research Links', icon: Link2 },
  { key: 'ads', label: 'Ads', icon: Megaphone },
  { key: 'contact', label: 'Contact & Socials', icon: Phone },
  { key: 'donate', label: 'Donate', icon: Heart },
  { key: 'settings', label: 'Settings', icon: Settings },
];
function AdminDashboard({ data, actions, onLogout }) {
  const [tab, setTab] = useState('overview');
  const ActiveIcon = ADMIN_TABS.find(t => t.key === tab)?.icon || LayoutGrid;
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row gap-6">
      <aside className="md:w-56 shrink-0">
        <div className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          {ADMIN_TABS.map(t => <button key={t.key} onClick={() => setTab(t.key)} className={`shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === t.key ? 'bg-blue-950 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><t.icon size={15} /> {t.label}</button>)}
          <button onClick={onLogout} className="shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 md:mt-4"><LogOut size={15} /> Log Out</button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-5"><ActiveIcon size={18} className="text-blue-950" /><h2 className="text-xl font-bold text-blue-950" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{ADMIN_TABS.find(t => t.key === tab)?.label}</h2></div>
        {tab === 'overview' && <AdminOverview articles={data.articles} liveposts={data.live} categories={data.categories} team={data.team} />}
        {tab === 'articles' && <AdminArticles articles={data.articles} categories={data.categories} onSave={actions.saveArticle} onDelete={actions.deleteArticle} />}
        {tab === 'categories' && <AdminEntityEditor items={data.categories} itemLabel="category" fields={[{ key: 'name', label: 'Name', required: true, primary: true }, { key: 'isLive', label: '', type: 'checkbox', checkboxLabel: 'Treat as a Live/events category' }]} renderExtra={(c) => c.isLive ? 'Live / events category' : ''} onSave={actions.saveCategory} onDelete={actions.deleteCategory} />}
        {tab === 'live' && <AdminLive liveposts={data.live} categories={data.categories} onSave={actions.saveLive} onDelete={actions.deleteLive} />}
        {tab === 'comments' && <AdminComments articles={data.articles} liveposts={data.live} />}
        {tab === 'team' && <AdminEntityEditor items={data.team} itemLabel="team member" fields={[{ key: 'photoUrl', label: 'Photo', type: 'image' }, { key: 'name', label: 'Name', required: true, primary: true }, { key: 'role', label: 'Role' }, { key: 'bio', label: 'Bio', type: 'textarea', full: true }]} renderExtra={(m) => m.role} onSave={actions.saveTeam} onDelete={actions.deleteTeam} />}
        {tab === 'research' && <AdminEntityEditor items={data.research} itemLabel="link" fields={[{ key: 'label', label: 'Label', required: true, primary: true }, { key: 'url', label: 'URL', required: true }, { key: 'description', label: 'Description', type: 'textarea', full: true }]} renderExtra={(l) => l.url} onSave={actions.saveResearch} onDelete={actions.deleteResearch} />}
        {tab === 'ads' && <AdminEntityEditor items={data.ads} itemLabel="ad"
          fields={[{ key: 'imageUrl', label: 'Banner image', type: 'image' }, { key: 'advertiser', label: 'Advertiser name', required: true, primary: true }, { key: 'linkUrl', label: 'Link URL', full: true }, { key: 'active', label: '', type: 'checkbox', checkboxLabel: 'Show this ad on the site' }]}
          renderExtra={(a) => a.active ? 'Live on site' : 'Hidden'} onSave={actions.saveAd} onDelete={actions.deleteAd} />}
        {tab === 'contact' && <AdminContact contact={data.contact} onSave={actions.saveContact} />}
        {tab === 'donate' && <AdminDonate donate={data.donate} onSaveIntro={actions.saveDonate} onSaveMethod={actions.saveDonateMethod} onDeleteMethod={actions.deleteDonateMethod} />}
        {tab === 'settings' && <AdminSettings settings={data.settings} onSave={actions.saveSettings} />}
      </main>
    </div>
  );
}

/* ============================================================
   ROOT APP
============================================================ */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [live, setLive] = useState([]);
  const [team, setTeam] = useState([]);
  const [research, setResearch] = useState([]);
  const [ads, setAds] = useState([]);
  const [contact, setContact] = useState(defaultContact());
  const [donate, setDonate] = useState(defaultDonate());
  const [settings, setSettings] = useState(defaultSettings());

  const [view, setView] = useState({ page: 'home' });
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [liveModalPost, setLiveModalPost] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
  const navigate = (page, extra = {}) => { setView({ page, ...extra }); window.scrollTo(0, 0); };

  // Load everything from the real API on mount, and pick up an existing admin session
  // (if a token is already stored from a previous visit) rather than forcing a re-login
  // on every page refresh.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [cats, arts, liveItems, teamItems, res, adsData, cont, don, sett] = await Promise.all([
          api.categories.list(), api.articles.list(), api.live.list(), api.team.list(),
          api.research.list(), api.ads.list(), api.contact.get(), api.donate.get(), api.settings.get(),
        ]);
        if (!active) return;
        setCategories(cats); setArticles(arts); setLive(liveItems); setTeam(teamItems);
        setResearch(res); setAds(adsData); setContact(cont); setDonate(don); setSettings(sett);
      } catch (err) {
        if (active) setLoadError(err.message || 'Could not reach the server.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    if (getToken()) {
      api.auth.me().then(() => { if (active) setIsAdmin(true); }).catch(() => setToken(null));
    }
    return () => { active = false; };
  }, []);

  const actions = {
    saveCategory: async (item, isNew) => {
      const saved = isNew ? await api.categories.create(item) : await api.categories.update(item.id, item);
      setCategories((prev) => isNew ? [...prev, saved] : prev.map(c => c.id === saved.id ? saved : c));
      showToast('Category saved');
    },
    deleteCategory: async (id) => {
      await api.categories.remove(id);
      setCategories((prev) => prev.filter(c => c.id !== id));
      showToast('Category removed');
    },
    saveArticle: async (item, isNew) => {
      const saved = isNew ? await api.articles.create(item) : await api.articles.update(item.id, item);
      setArticles((prev) => isNew ? [...prev, saved] : prev.map(a => a.id === saved.id ? saved : a));
      showToast('Article saved');
    },
    deleteArticle: async (id) => {
      await api.articles.remove(id);
      setArticles((prev) => prev.filter(a => a.id !== id));
      showToast('Article deleted');
      setView((v) => (v.page === 'article' && v.id === id) ? { page: 'home' } : v);
    },
    saveLive: async (item, isNew) => {
      const saved = isNew ? await api.live.create(item) : await api.live.update(item.id, item);
      setLive((prev) => isNew ? [...prev, saved] : prev.map(l => l.id === saved.id ? saved : l));
      showToast('Live post saved');
    },
    deleteLive: async (id) => {
      await api.live.remove(id);
      setLive((prev) => prev.filter(l => l.id !== id));
      showToast('Live post deleted');
    },
    saveTeam: async (item, isNew) => {
      const saved = isNew ? await api.team.create(item) : await api.team.update(item.id, item);
      setTeam((prev) => isNew ? [...prev, saved] : prev.map(t => t.id === saved.id ? saved : t));
      showToast('Team member saved');
    },
    deleteTeam: async (id) => {
      await api.team.remove(id);
      setTeam((prev) => prev.filter(t => t.id !== id));
      showToast('Team member removed');
    },
    saveResearch: async (item, isNew) => {
      const saved = isNew ? await api.research.create(item) : await api.research.update(item.id, item);
      setResearch((prev) => isNew ? [...prev, saved] : prev.map(r => r.id === saved.id ? saved : r));
      showToast('Link saved');
    },
    deleteResearch: async (id) => {
      await api.research.remove(id);
      setResearch((prev) => prev.filter(r => r.id !== id));
      showToast('Link removed');
    },
    saveAd: async (item, isNew) => {
      const saved = isNew ? await api.ads.create(item) : await api.ads.update(item.id, item);
      setAds((prev) => isNew ? [...prev, saved] : prev.map(a => a.id === saved.id ? saved : a));
      showToast('Ad saved');
    },
    deleteAd: async (id) => {
      await api.ads.remove(id);
      setAds((prev) => prev.filter(a => a.id !== id));
      showToast('Ad removed');
    },
    saveContact: async (next) => { const saved = await api.contact.update(next); setContact(saved); showToast('Contact info saved'); },
    saveDonate: async (next) => {
      // AdminDonate/AdminEntityEditor pass the whole { intro, methods } shape back; the API
      // splits that into separate intro/method endpoints, so reconcile here and refetch.
      await api.donate.updateIntro(next.intro);
      const fresh = await api.donate.get();
      setDonate(fresh);
      showToast('Donate info saved');
    },
    saveDonateMethod: async (item, isNew) => {
      const saved = isNew ? await api.donate.addMethod(item) : await api.donate.updateMethod(item.id, item);
      setDonate((prev) => ({ ...prev, methods: isNew ? [...prev.methods, saved] : prev.methods.map(m => m.id === saved.id ? saved : m) }));
    },
    deleteDonateMethod: async (id) => {
      await api.donate.removeMethod(id);
      setDonate((prev) => ({ ...prev, methods: prev.methods.filter(m => m.id !== id) }));
    },
    saveSettings: async (next) => { const saved = await api.settings.update(next); setSettings(saved); showToast('Settings saved'); },
  };

  const getReadableText = () => {
    if (view.page === 'article') {
      const a = articles.find(x => x.id === view.id);
      if (a) return `${a.title}. By ${a.author}. ${stripHtml(a.body || a.excerpt || '')}`;
    }
    if (view.page === 'category') {
      const cat = categories.find(c => c.id === view.id);
      const items = articles.filter(a => a.categoryId === view.id).slice(0, 5);
      return `${cat ? cat.name : ''} headlines. ${items.map(a => a.title).join('. ')}`;
    }
    const top = [...articles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    return `Top stories on ${settings.stationName}. ${top.map(a => a.title).join('. ')}`;
  };

  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
        <img src={LOGO_DATA_URL} alt="Loading" className="h-14 w-auto animate-pulse" />
        <Loader2 className="animate-spin text-sky-500" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3 px-6 text-center">
        <img src={LOGO_DATA_URL} alt="" className="h-14 w-auto opacity-40" />
        <p className="font-bold text-blue-950">Can't reach the server</p>
        <p className="text-sm text-slate-500 max-w-sm">{loadError} Make sure the backend is running and VITE_API_URL points at it.</p>
        <Button size="sm" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const activeArticle = view.page === 'article' ? articles.find(a => a.id === view.id) : null;
  const activeCategory = view.page === 'category' ? categories.find(c => c.id === view.id) : null;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <Header settings={settings} onMenuOpen={() => setMenuOpen(true)} onNav={navigate} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} onNav={navigate} settings={settings} />
      {view.page !== 'admin' && <CategoryBar categories={categories} activeId={view.page === 'category' ? view.id : null} onSelect={(id) => id ? navigate('category', { id }) : navigate('home')} />}

      <main className="pb-16">
        {view.page === 'home' && <HomePage articles={articles} categories={categories} ads={ads} onOpenArticle={(a) => navigate('article', { id: a.id })} />}
        {view.page === 'category' && activeCategory && (
          activeCategory.isLive
            ? <LivePage livePosts={live} ads={ads} onOpen={(p) => setLiveModalPost(p)} />
            : <CategoryPage category={activeCategory} articles={articles} categories={categories} ads={ads} onOpenArticle={(a) => navigate('article', { id: a.id })} />
        )}
        {view.page === 'article' && (
          <ArticlePage article={activeArticle} category={activeArticle ? catMap[activeArticle.categoryId] : null} ads={ads} onBack={() => navigate('home')}
            isAdmin={isAdmin} onEditGo={() => navigate('admin')} onDelete={(a) => actions.deleteArticle(a.id)} />
        )}
        {view.page === 'research' && <ResearchPage links={research} />}
        {view.page === 'team' && <TeamPage team={team} />}
        {view.page === 'contact' && <ContactPage contact={contact} />}
        {view.page === 'donate' && <DonatePage donate={donate} />}
        {view.page === 'admin' && (
          isAdmin
            ? <AdminDashboard data={{ categories, articles, live, team, research, ads, contact, donate, settings }} actions={actions} onLogout={() => { setToken(null); setIsAdmin(false); navigate('home'); }} />
            : <AdminLogin onLogin={() => setIsAdmin(true)} />
        )}
      </main>

      {view.page !== 'admin' && <Footer settings={settings} contact={contact} onNav={navigate} />}

      <LiveDetailModal post={liveModalPost} onClose={() => setLiveModalPost(null)} isAdmin={isAdmin}
        onEditGo={() => { setLiveModalPost(null); navigate('admin'); }}
        onDelete={(p) => { actions.deleteLive(p.id); setLiveModalPost(null); }} />

      {view.page !== 'admin' && <AccessibilityWidget getReadableText={getReadableText} />}
      {view.page !== 'admin' && <ListenLiveWidget settings={settings} />}
      <Toast message={toast} show={!!toast} />
    </div>
  );
}
