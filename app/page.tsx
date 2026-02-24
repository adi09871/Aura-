"use client";

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAudioListener } from '../hooks/useAudioListener';

// Simulation for mesh nodes
interface MeshNode {
  id: string;
  x: number;
  y: number;
}

export default function Home() {
  const allMessages = useLiveQuery(() => db.sosMessages.toArray());
  const [isSending, setIsSending] = useState(false);
  const [nodes, setNodes] = useState<MeshNode[]>([]);

  // 1. Hook Integration: Connecting ML Alerts to DexieDB
  const { start, stop, isListening, volume, error } = useAudioListener(async (result) => {
    // This triggers automatically when the ML model detects an emergency sound
    if (result.isAlert) {
      console.log("AuraMesh: Emergency Sound Detected - ", result.label);
      await handleBroadcastSOS(`AI ALERT: Detected ${result.label} (Confidence: ${Math.round(result.score * 100)}%)`);
    }
  }, 1500); // 1.5s interval for better responsiveness

  // 2. Mesh Discovery Simulation: Background activity
  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        if (nodes.length < 4) {
          const newNode = {
            id: `NODE_${Math.floor(Math.random() * 1000)}`,
            x: Math.random() * 80 + 10,
            y: Math.random() * 80 + 10
          };
          setNodes(prev => [...prev, newNode]);
        }
      }, 5000);
      return () => clearInterval(interval);
    } else {
      setNodes([]);
    }
  }, [isListening, nodes.length]);

  const handleBroadcastSOS = async (customMsg?: string) => {
    setIsSending(true);
    try {
      // Direct Database Write
      await db.sosMessages.add({
        message: customMsg || "Manual Emergency Assistance Required!",
        timestamp: new Date().toLocaleTimeString(),
        isSynced: false 
      });
      
      // Simulate mesh sync after 3 seconds
      setTimeout(async () => {
        const latest = await db.sosMessages.orderBy('id').last();
        if (latest?.id) await db.sosMessages.update(latest.id, { isSynced: true });
      }, 3000);
      
    } catch (err) {
      console.error("Dexie Error:", err);
    }
    setIsSending(false);
  };

  return (
    <div className="min-h-screen bg-blue-950 text-white p-6 font-mono">
      {/* Header with System Status */}
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-3xl font-black text-cyan-400 tracking-tighter italic">AURA MESH</h1>
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">
            {isListening ? `>> Edge Listener Active // Sensors Hot` : `>> System Standby`}
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={isListening ? stop : start}
            className={`px-4 py-2 rounded text-[10px] font-bold border ${isListening ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
          >
            {isListening ? "DEACTIVATE_SENSORS" : "INITIALIZE_SENSORS"}
          </button>
          <button 
            onClick={() => handleBroadcastSOS()}
            className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded text-[10px] font-black shadow-[0_0_15px_rgba(220,38,38,0.3)]"
          >
            BROADCAST_SOS
          </button>
        </div>
      </header>

      {error && <div className="bg-red-900/20 border border-red-500 p-3 text-red-500 text-xs mb-6 uppercase">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Dynamic Map Area */}
        <div className="lg:col-span-2 bg-black rounded-3xl border border-white/5 relative h-[60vh] overflow-hidden group">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:30px_30px]"></div>
          
          {/* Central Pulse (Reactive to Volume) */}
          <div className="absolute inset-0 flex items-center justify-center">
             <div 
               className={`rounded-full transition-all duration-75 border ${volume > 70 ? 'bg-red-500/20 border-red-500' : 'bg-cyan-400/10 border-cyan-400'}`}
               style={{ 
                 width: `${40 + volume * 2}px`, 
                 height: `${40 + volume * 2}px`,
                 boxShadow: `0 0 ${volume}px ${volume > 70 ? 'rgba(239,68,68,0.5)' : 'rgba(34,211,238,0.5)'}`
               }}
             ></div>
          </div>

          {/* Simulated Peer Nodes */}
          {nodes.map(n => (
            <div key={n.id} className="absolute transition-all duration-1000" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
              <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse"></div>
              <span className="text-[8px] text-gray-600 mt-2 block">{n.id}</span>
            </div>
          ))}
        </div>

        {/* Persistence Feed (Real DB Logs) */}
        <div className="bg-gray-900/50 p-6 rounded-3xl border border-gray-800 flex flex-col h-[60vh]">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase mb-6 tracking-widest">Aura_Logs_Persistence</h2>
          <div className="flex-1 overflow-y-auto space-y-4">
            {allMessages?.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-700 italic">No network traffic detected...</div>
            ) : (
              allMessages?.map(m => (
                <div key={m.id} className="bg-black/40 border border-white/5 p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-cyan-400 font-bold">EVENT_{m.id}</span>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full ${m.isSynced ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                      {m.isSynced ? "MESH_SYNCED" : "LOCAL_ONLY"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mb-2 leading-relaxed">{m.message}</p>
                  <span className="text-[9px] text-gray-600 font-mono">{m.timestamp}</span>
                </div>
              )).reverse()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}