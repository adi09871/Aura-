'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { classifyAudioChunk, type ClassificationResult } from '@/lib/audioClassifier';

export interface AudioListenerState {
  isListening: boolean;
  error: string | null;
  volume: number;          // 0–100
  frequencyData: Uint8Array | null;
}

export interface AudioListenerControls {
  start: () => Promise<void>;
  stop: () => void;
}

/**
 * useAudioListener
 *
 * Custom React hook that:
 * 1. Requests microphone access via navigator.mediaDevices.getUserMedia
 * 2. Creates a Web Audio API analyser node for real-time frequency data
 * 3. Drives a volume meter via requestAnimationFrame
 * 4. Calls classifyAudioChunk() (TensorFlow.js) every `classifyIntervalMs`
 * 5. Fires onAlert callback when a non-ambient sound is detected
 */
export function useAudioListener(
  onAlert: (result: ClassificationResult) => void,
  classifyIntervalMs = 3000
): AudioListenerState & AudioListenerControls {
  const [isListening, setIsListening]   = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [volume, setVolume]             = useState(0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);

  const streamRef    = useRef<MediaStream | null>(null);
  const ctxRef       = useRef<AudioContext | null>(null);
  const analyserRef  = useRef<AnalyserNode | null>(null);
  const rafRef       = useRef<number>(0);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const onAlertRef   = useRef(onAlert);

  // Keep callback ref fresh without triggering re-renders
  useEffect(() => { onAlertRef.current = onAlert; }, [onAlert]);

  const stop = useCallback(() => {
    // Stop all audio tracks
    streamRef.current?.getTracks().forEach((t) => t.stop());

    // Close AudioContext
    ctxRef.current?.close().catch(() => {});

    // Cancel animation + classification loops
    cancelAnimationFrame(rafRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Reset refs
    streamRef.current   = null;
    ctxRef.current      = null;
    analyserRef.current = null;

    setIsListening(false);
    setVolume(0);
    setFrequencyData(null);
  }, []);

  const start = useCallback(async () => {
    // Prevent double-init
    if (isListening) return;
    setError(null);

    try {
      // 1. Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,  // keep raw for ML
          sampleRate: 16000,        // YAMNet expects 16kHz
        },
        video: false,
      });
      streamRef.current = stream;

      // 2. Build Web Audio graph
      //    MediaStream → AnalyserNode (no output — we don't want speaker feedback)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 16000 });
      ctxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;         // higher resolution for ML
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      // NOTE: do NOT connect analyser to ctx.destination (prevents feedback)

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // 3. Real-time volume meter via requestAnimationFrame
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);

        // RMS-like volume: average of frequency magnitudes
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = sum / dataArray.length;
        setVolume(Math.min(100, avg * 2.8));
        setFrequencyData(new Uint8Array(dataArray)); // snapshot for visualisation

        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      // 4. TensorFlow.js classification interval
      intervalRef.current = setInterval(async () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        try {
          const result = await classifyAudioChunk(dataArray);
          if (result.isAlert) {
            onAlertRef.current(result);
          }
        } catch (classifyErr) {
          console.error('[AuraMesh] Classification error:', classifyErr);
        }
      }, classifyIntervalMs);

      setIsListening(true);
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow mic permissions and try again.'
          : err?.name === 'NotFoundError'
          ? 'No microphone found. Please connect a microphone.'
          : err?.message || 'Failed to start audio listener.';
      setError(msg);
      stop();
    }
  }, [isListening, classifyIntervalMs, stop]);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  return { isListening, error, volume, frequencyData, start, stop };
}
