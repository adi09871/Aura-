"use client"; // Required for React interactivity
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';

export default function Home() {
  // Read live data from Dexie (Web equivalent of Room LiveData/Flow)
  const allMessages = useLiveQuery(() => db.sosMessages.toArray());
  const [isSending, setIsSending] = useState(false);

  // Action function when SOS button is clicked
  const handleBroadcastSOS = async () => {
    setIsSending(true);
    try {
      // Insert into local offline database
      await db.sosMessages.add({
        message: "Need immediate medical assistance at Main Gate!",
        timestamp: new Date().toLocaleTimeString(),
        isSynced: false // Stays false until mesh network finds another node
      });
    } catch (error) {
      console.error("Failed to save SOS:", error);
    }
    setIsSending(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 font-sans">
      
      {/* Top Navigation */}
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-cyan-400">AuraMesh</h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Command Center</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBroadcastSOS}
            disabled={isSending}
            className="bg-red-600 hover:bg-red-700 active:scale-95 text-white px-4 py-2 rounded text-sm font-bold transition-all"
          >
            {isSending ? "Saving..." : "Broadcast Mock SOS"}
          </button>
        </div>
      </header>

      {/* Bento-Box Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[80vh]">
        
        {/* Left Side: Offline Mesh Map */}
        <div className="col-span-1 lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">Local Mesh Network Map</h2>
          <div className="h-[90%] bg-black rounded-lg relative overflow-hidden flex items-center justify-center border border-gray-800">
            <div className="absolute w-full h-full opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900 via-black to-black"></div>
            <div className="absolute z-10 flex flex-col items-center">
               <div className="w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)]"></div>
               <span className="text-xs mt-2 text-cyan-400">Base Hub</span>
            </div>
          </div>
        </div>

        {/* Right Side: Alerts & SOS Feed */}
        <div className="col-span-1 flex flex-col gap-6">
          
          {/* Incoming SOS Panel (Now dynamic!) */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex-1 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">Offline SOS Messages</h2>
            
            <div className="flex flex-col gap-3">
              {allMessages?.length === 0 ? (
                <div className="bg-black/50 border border-gray-800 rounded p-4 text-center">
                  <p className="text-sm text-gray-500 italic">No offline messages yet...</p>
                </div>
              ) : (
                allMessages?.map((msg) => (
                  <div key={msg.id} className="bg-red-950/20 border border-red-900/50 p-3 rounded-lg flex flex-col gap-1 border-l-4 border-l-red-500">
                    <p className="text-gray-200 font-medium text-sm">{msg.message}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">{msg.timestamp}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-yellow-500 border border-yellow-700">
                        {msg.isSynced ? "Synced" : "Offline / Unsynced"}
                      </span>
                    </div>
                  </div>
                )).reverse() // Show newest at the top
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}