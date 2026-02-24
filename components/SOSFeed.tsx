'use client';

import { useEffect, useRef, useState } from 'react';
import { getDB, type SOSMessage } from '@/lib/db';

const PRIORITY_STYLE: Record<string, { bar: string; text: string; border: string }> = {
  CRITICAL: { bar: '#ef4444', text: '#f87171', border: '#7f1d1d' },
  HIGH:     { bar: '#f59e0b', text: '#fbbf24', border: '#78350f' },
  MEDIUM:   { bar: '#38bdf8', text: '#7dd3fc', border: '#0c4a6e' },
};

const ts = () =>
  new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const SEED: Omit<SOSMessage, 'id'>[] = [
  { callsign: 'ECHO-7',    location: 'Grid 44-NW', message: 'Structural collapse, 3 trapped',  priority: 'CRITICAL', timestamp: '04:12:08', synced: false, createdAt: Date.now() - 60000 },
  { callsign: 'FOXTROT-2', location: 'Grid 12-SE', message: 'Medical emergency, need evac',    priority: 'HIGH',     timestamp: '04:08:33', synced: true,  createdAt: Date.now() - 120000 },
  { callsign: 'BRAVO-9',   location: 'Grid 67-NE', message: 'Radio failure, position unknown', priority: 'MEDIUM',   timestamp: '03:55:17', synced: true,  createdAt: Date.now() - 300000 },
];

export default function SOSFeed() {
  const [messages, setMessages] = useState<SOSMessage[]>([]);
  const [form, setForm] = useState({ callsign: '', location: '', message: '', priority: 'HIGH' as SOSMessage['priority'] });
  const [submitting, setSubmitting] = useState(false);
  const db = useRef(getDB());
  const seeded = useRef(false);

  // Load from IndexedDB on mount (seed if empty)
  useEffect(() => {
    const load = async () => {
      const existing = await db.current.sosMessages.orderBy('createdAt').reverse().toArray();
      if (existing.length === 0 && !seeded.current) {
        seeded.current = true;
        await Promise.all(SEED.map((s) => db.current.sosMessages.add(s)));
        const seeded2 = await db.current.sosMessages.orderBy('createdAt').reverse().toArray();
        setMessages(seeded2);
      } else {
        setMessages(existing);
      }
    };
    load().catch(console.error);
  }, []);

  const handleSubmit = async () => {
    if (!form.callsign.trim() || !form.message.trim()) return;
    setSubmitting(true);

    const record: Omit<SOSMessage, 'id'> = {
      callsign:  form.callsign.trim().toUpperCase(),
      location:  form.location.trim() || 'Unknown',
      message:   form.message.trim(),
      priority:  form.priority,
      timestamp: ts(),
      synced:    false,          // offline — not yet sent to server
      createdAt: Date.now(),
    };

    try {
      const id = await db.current.sosMessages.add(record);
      setMessages((prev) => [{ ...record, id: id as number }, ...prev]);
      setForm({ callsign: '', location: '', message: '', priority: 'HIGH' });
    } catch (err) {
      console.error('[AuraMesh] Failed to save SOS:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const pending = messages.filter((m) => !m.synced).length;

  return (
    <div className="flex flex-col gap-3 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-red-400 rounded" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-slate-300 uppercase">
            Incoming Offline SOS
          </span>
          {pending > 0 && (
            <span className="text-[10px] text-red-400 bg-red-950/50 border border-red-800/40 rounded px-1.5 py-0.5 tabular-nums">
              {pending} PENDING
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-700">Dexie.js · IndexedDB</span>
      </div>

      {/* Message list */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-0 max-h-[280px]">
        {messages.map((s) => {
          const p = PRIORITY_STYLE[s.priority] ?? PRIORITY_STYLE.MEDIUM;
          return (
            <div
              key={s.id}
              className="bg-[#020617] border border-[#1e293b] rounded-lg overflow-hidden"
            >
              <div style={{ height: '2px', background: p.bar }} />
              <div className="flex items-start gap-3 p-3">
                {/* Priority badge */}
                <div className="flex flex-col items-center gap-1 pt-0.5 flex-shrink-0">
                  <span
                    className="text-[9px] font-bold tracking-widest rounded px-1.5 py-0.5 border"
                    style={{ color: p.text, borderColor: p.border }}
                  >
                    {s.priority}
                  </span>
                  <span className={`text-[9px] ${s.synced ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {s.synced ? '✓ synced' : '● local'}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-100 text-[13px]">{s.callsign}</span>
                    <span className="text-slate-600 text-[11px]">//</span>
                    <span className="text-slate-500 text-[11px] truncate">{s.location}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed m-0">{s.message}</p>
                </div>

                <span className="text-[10px] text-slate-700 tabular-nums flex-shrink-0">
                  {s.timestamp}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compose */}
      <div className="border-t border-[#1e293b] pt-3">
        <div className="text-[10px] font-bold tracking-[0.2em] text-slate-600 uppercase mb-2">
          Transmit SOS
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <input
            className="bg-[#020617] border border-[#1e293b] rounded px-2 py-1.5 text-[11px] text-slate-300 placeholder-slate-700 outline-none focus:border-cyan-800 transition-colors"
            placeholder="Callsign"
            value={form.callsign}
            onChange={(e) => setForm((p) => ({ ...p, callsign: e.target.value }))}
          />
          <input
            className="bg-[#020617] border border-[#1e293b] rounded px-2 py-1.5 text-[11px] text-slate-300 placeholder-slate-700 outline-none focus:border-cyan-800 transition-colors"
            placeholder="Grid Ref"
            value={form.location}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
          />
          <select
            className="bg-[#020617] border border-[#1e293b] rounded px-2 py-1.5 text-[11px] text-slate-300 outline-none focus:border-cyan-800 transition-colors cursor-pointer"
            value={form.priority}
            onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as SOSMessage['priority'] }))}
          >
            <option>HIGH</option>
            <option>CRITICAL</option>
            <option>MEDIUM</option>
          </select>
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-[#020617] border border-[#1e293b] rounded px-2 py-1.5 text-[11px] text-slate-300 placeholder-slate-700 outline-none focus:border-cyan-800 transition-colors"
            placeholder="Message content…"
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-1.5 bg-red-950/40 hover:bg-red-950/70 border border-red-800/50 text-red-400 text-[11px] font-bold rounded tracking-wider transition-all disabled:opacity-40 whitespace-nowrap"
          >
            {submitting ? '…' : 'SEND SOS'}
          </button>
        </div>
      </div>
    </div>
  );
}
