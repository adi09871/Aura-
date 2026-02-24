'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioListener } from '@/hooks/useAudioListener';
import { type ClassificationResult } from '@/lib/audioClassifier';
import { getDB, type AcousticEvent } from '@/lib/db';
import VolumeMeter from './VolumeMeter';

const ALERT_ICONS: Record<string, string> = {
  'Fire alarm':         '🔥',
  'Smoke detector':     '🌫️',
  'Gunshot':            '💥',
  'Explosion':          '⚡',
  'Glass break':        '🪟',
  'Siren':              '🚨',
  'Civil defense siren':'📡',
  'Screaming':          '🗣️',
  'Baby cry':           '👶',
};

interface DisplayAlert extends AcousticEvent {
  fresh?: boolean;
}

export default function AcousticAlertFeed() {
  const [alerts, setAlerts] = useState<DisplayAlert[]>([]);
  const db = useRef(getDB());

  // Load persisted alerts on mount
  useEffect(() => {
    db.current.acousticEvents
      .orderBy('createdAt')
      .reverse()
      .limit(30)
      .toArray()
      .then(setAlerts)
      .catch(console.error);
  }, []);

  const handleAlert = useCallback(async (result: ClassificationResult) => {
    const event: AcousticEvent = {
      label:      result.label,
      confidence: result.confidence,
      timestamp:  new Date().toLocaleTimeString('en-US', { hour12: false }),
      createdAt:  Date.now(),
    };

    // Persist to IndexedDB
    const id = await db.current.acousticEvents.add(event);

    setAlerts((prev) => [{ ...event, id: id as number, fresh: true }, ...prev].slice(0, 50));
  }, []);

  const { isListening, error, volume, start, stop } = useAudioListener(handleAlert, 3000);

  return (
    <div className="flex flex-col gap-3 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-amber-400 rounded" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-slate-300 uppercase">
            Acoustic Edge Alerts
          </span>
          <span className="text-[10px] text-slate-600">(TensorFlow.js · Local)</span>
        </div>
        <div className="flex items-center gap-3">
          <VolumeMeter volume={isListening ? volume : 0} />
          <button
            onClick={isListening ? stop : start}
            className={`px-3 py-1.5 rounded text-[11px] font-bold tracking-wider transition-all border ${
              isListening
                ? 'border-red-700/50 text-red-400 bg-red-950/30 hover:bg-red-950/60'
                : 'border-cyan-700/50 text-cyan-400 bg-cyan-950/30 hover:bg-cyan-950/60'
            }`}
          >
            {isListening ? '■ STOP' : '▶ LISTEN'}
          </button>
        </div>
      </div>

      {/* Model status */}
      <div className="flex items-center gap-3 text-[10px] bg-[#020617] border border-[#1e293b] rounded px-3 py-2">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-bold">YAMNET SKELETON ACTIVE</span>
        </div>
        <span className="text-slate-700">|</span>
        <span className="text-slate-600">521 classes · no API · IndexedDB persisted</span>
      </div>

      {/* Error */}
      {error && (
        <div className="text-[11px] text-red-400 bg-red-950/30 border border-red-800/40 rounded px-3 py-2">
          ⚠ {error}
        </div>
      )}

      {/* Alert stream */}
      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto min-h-0">
        {alerts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[11px] text-slate-700 border border-dashed border-[#1e293b] rounded">
            {isListening
              ? 'Listening… no acoustic events detected'
              : 'Press LISTEN to enable acoustic monitoring'}
          </div>
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 text-[11px] bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2"
              style={{ animation: a.fresh ? 'slideIn 0.3s ease' : undefined }}
            >
              <span className="text-base flex-shrink-0">{ALERT_ICONS[a.label] ?? '⚠️'}</span>
              <span className="font-bold text-amber-300 flex-1 truncate">{a.label}</span>
              <div className="w-16 h-1.5 bg-[#1e293b] rounded-full flex-shrink-0">
                <div
                  className="h-1.5 rounded-full bg-amber-500"
                  style={{ width: `${Math.round(a.confidence * 100)}%` }}
                />
              </div>
              <span className="text-slate-500 w-8 text-right flex-shrink-0">
                {Math.round(a.confidence * 100)}%
              </span>
              <span className="text-slate-700 tabular-nums flex-shrink-0">{a.timestamp}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
