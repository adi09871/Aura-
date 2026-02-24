"use client";
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAudioListener } from '../hooks/useAudioListener'; // Hook connect kiya

export default function Home() {
  const allMessages = useLiveQuery(() => db.sosMessages.toArray());
  const [isSending, setIsSending] = useState(false);

  // Audio Listener Setup
  const { start, stop, isListening, volume, error } = useAudioListener((result) => {
    // Ye function tab chalega jab ML koi emergency sound detect karega
    handleBroadcastSOS(`Automatic Alert: ${result.label} detected!`);
  });

  const handleBroadcastSOS = async (customMsg?: string) => {
    setIsSending(true);
    try {
      await db.sosMessages.add({
        message: customMsg || "Need immediate medical assistance at Main Gate!",
        timestamp: new Date().toLocaleTimeString(),
        isSynced: false 
      });
    } catch (err) {
      console.error("Failed to save SOS:", err);
    }
    setIsSending(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 font-sans">
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-cyan-400">AuraMesh</h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Command Center</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Mic Button added */}
          <button 
            onClick={isListening ? stop : start}
            className={`px-4 py-2 rounded text-sm font-bold transition-all ${isListening ? 'bg-cyan-600' : 'bg-gray-700'}`}
          >
            {isListening ? "Listening..." : "Start Mic"}
          </button>
          
          <button 
            onClick={() => handleBroadcastSOS()}
            disabled={isSending}
            className="bg-red-600 hover:bg-red-700 active:scale-95 text-white px-4 py-2 rounded text-sm font-bold transition-all"
          >
            {isSending ? "Saving..." : "Broadcast Mock SOS"}
          </button>
        </div>
      </header>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[80vh]">
        <div className="col-span-1 lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">Acoustic Visualization</h2>
          <div className="h-[90%] bg-black rounded-lg relative overflow-hidden flex items-center justify-center border border-gray-800">
            {/* Live Volume Pulse */}
            <div 
              className="bg-cyan-400 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.8)] transition-all duration-75"
              style={{ 
                width: `${20 + volume}px`, 
                height: `${20 + volume}px`,
                opacity: isListening ? 1 : 0.2
              }}
            ></div>
            <span className="absolute bottom-10 text-xs text-cyan-400 font-mono">
              {isListening ? `Input Level: ${Math.round(volume)}%` : "Mic Offline"}
            </span>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex-1 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">Offline SOS Messages</h2>
          <div className="flex flex-col gap-3">
            {allMessages?.length === 0 ? (
              <p className="text-sm text-gray-500 italic text-center">No offline messages yet...</p>
            ) : (
              allMessages?.map((msg) => (
                <div key={msg.id} className="bg-red-950/20 border border-red-900/50 p-3 rounded-lg border-l-4 border-l-red-500">
                  <p className="text-gray-200 font-medium text-sm">{msg.message}</p>
                  <div className="flex justify-between items-center mt-2 text-[10px]">
                    <span className="text-gray-500">{msg.timestamp}</span>
                    <span className="text-yellow-500">{msg.isSynced ? "Synced" : "Offline"}</span>
                  </div>
                </div>
              )).reverse()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}