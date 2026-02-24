"use client";

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAudioListener } from '../hooks/useAudioListener';

interface MeshNode {
  id: string;
  x: number;
  y: number;
  type: 'peer' | 'relay';
}

export default function Home() {
    // Add missing handleBroadcastSOS function
    const handleBroadcastSOS = async (customMsg?: string) => {
      setIsSending(true);
      try {
        await db.sosMessages.add({
          message: customMsg || "Manual Emergency Assistance Required!",
          timestamp: new Date().toLocaleTimeString(),
          isSynced: false
        });
        setTimeout(async () => {
          const latest = await db.sosMessages.orderBy('id').last();
          if (latest?.id) await db.sosMessages.update(latest.id, { isSynced: true });
        }, 3000);
      } catch (err) {
        console.error("Dexie Error:", err);
      }
      setIsSending(false);
    };
  const allMessages = useLiveQuery(() => db.sosMessages.toArray());
  const [isSending, setIsSending] = useState(false);
  const [nodes, setNodes] = useState<MeshNode[]>([]);
  const [mounted, setMounted] = useState(false);
  
  // TABS LOGIC
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mesh'>('dashboard');
  
  const [activeDanger, setActiveDanger] = useState<{type: string, label: string, conf: number} | null>(null);
  const [transcriptLog, setTranscriptLog] = useState<string>("Listening for keywords...");

  useEffect(() => { setMounted(true); }, []);

  // 1. VOLUME & BACKGROUND ML 
  const { start, stop, isListening, volume, error } = useAudioListener(async () => {}, 5000); 

  // 2. REAL KEYWORD DETECTION + VIBRATION
  useEffect(() => {
    let recognition: any;

    if (isListening) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; 

        recognition.onresult = async (event: any) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript.toLowerCase();
          setTranscriptLog(`Heard: "${transcript}"`);

          let dangerType = null;
          let dangerLabel = "";

          if (transcript.includes('fire') || transcript.includes('aag')) {
            dangerType = 'FIRE';
            dangerLabel = 'Fire/Smoke Detected via Keyword';
          } else if (transcript.includes('help') || transcript.includes('emergency') || transcript.includes('bachao')) {
            dangerType = 'HUMAN_DISTRESS';
            dangerLabel = 'Verbal Cry for Help Detected';
          } else if (transcript.includes('glass') || transcript.includes('break')) {
            dangerType = 'INTRUSION';
            dangerLabel = 'Glass Break/Intrusion Keyword';
          }

          if (dangerType && !activeDanger) {
            setActiveDanger({ type: dangerType, label: dangerLabel, conf: 99 });
            
            // 📳 HAPTIC FEEDBACK (VIBRATION LOGIC)
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
              // SOS Pattern: 3 short, 3 long, 3 short vibrations
              navigator.vibrate([200, 100, 200, 100, 200, 400, 500, 100, 500, 100, 500, 400, 200, 100, 200, 100, 200]);
            }

            await handleBroadcastSOS(`[${dangerType}] ${dangerLabel} spotted at Main Node.`);
            setTimeout(() => setActiveDanger(null), 6000); 
          }
        };

        recognition.onerror = (e: any) => console.log("Speech Error:", e.error);
        recognition.start();
      }
    }

    return () => {
      if (recognition) recognition.stop();
    };
  }, [isListening, activeDanger]);

  // 3. MESH DISCOVERY (Active only when on Mesh Tab for performance)
  const [deviceId] = useState(() => {
  if (typeof window !== 'undefined') {
    let id = localStorage.getItem('aura_device_id');
    if (!id) {
      id = 'NODE_' + Math.random().toString(36).substr(2, 6).toUpperCase();
      localStorage.setItem('aura_device_id', id);
    }
    return id;
  }
  return 'NODE_UNKNOWN';
});

const [deviceType, setDeviceType] = useState('LAPTOP');

useEffect(() => {
  setMounted(true);
  if (typeof navigator !== 'undefined') {
    setDeviceType(navigator.userAgent.includes('Mobile') ? 'MOBILE' : 'LAPTOP');
  }
}, []);


// 2. 🚨 असली MESH DISCOVERY LOGIC 🚨
useEffect(() => {
  let interval: NodeJS.Timeout;
  
  if (isListening && activeTab === 'mesh') {
    const pingMeshNetwork = async () => {
      try {
        // A. खुद को नेटवर्क में रजिस्टर करो
        await fetch('/api/mesh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: deviceId, type: deviceType })
        });

        // B. नेटवर्क में बाकी कौन-कौन है, उनकी लिस्ट लाओ
        const res = await fetch('/api/mesh');
        const data = await res.json();
        
        // C. खुद की ID हटाकर बाकी असली डिवाइस को मैप पर सेट करो
        setNodes(data.filter((n: any) => n.id !== deviceId));
      } catch (err) {
        console.error("Mesh Network Offline");
      }
    };

    pingMeshNetwork(); // तुरंत चेक करो
    interval = setInterval(pingMeshNetwork, 3000); // हर 3 सेकंड में असली डिवाइस स्कैन करो
  } else {
    setNodes([]);
  }

  return () => clearInterval(interval);
}, [isListening, activeTab, deviceId, deviceType]);

  const getDangerColor = () => {
    if (!activeDanger) return 'bg-cyan-400 border-cyan-400';
    if (activeDanger.type === 'FIRE') return 'bg-orange-600 border-orange-500 shadow-[0_0_80px_orange] animate-pulse';
    if (activeDanger.type === 'INTRUSION') return 'bg-purple-600 border-purple-500 shadow-[0_0_80px_purple] animate-pulse';
    return 'bg-red-600 border-red-500 shadow-[0_0_80px_red] animate-pulse';
  };

  if (!mounted) return null;

  return (
    <div className={`min-h-screen font-mono transition-colors duration-500 ${activeDanger ? (activeDanger.type === 'FIRE' ? 'bg-orange-950/80' : 'bg-red-950/80') : 'bg-gray-950'} text-white flex flex-col`}>
      
      {/* MASSIVE DANGER OVERLAY */}
      {activeDanger && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none bg-black/50 backdrop-blur-sm p-4">
          <div className={`border-8 p-10 text-center rounded-3xl ${activeDanger.type === 'FIRE' ? 'border-orange-500 bg-orange-900/80 text-orange-400 shadow-[0_0_100px_orange]' : 'border-red-500 bg-red-900/80 text-red-400 shadow-[0_0_100px_red]'}`}>
            <h1 className="text-5xl md:text-7xl font-black tracking-widest uppercase mb-4 animate-bounce">⚠️ {activeDanger.type} ⚠️</h1>
            <p className="text-xl md:text-2xl mt-2 font-bold bg-black/50 inline-block px-4 py-2 rounded">Keyword Detected: "{activeDanger.label}"</p>
            <p className="text-sm mt-6 text-white animate-pulse">HAPTIC VIBRATION DEPLOYED TO DEVICE</p>
          </div>
        </div>
      )}

      {/* HEADER & GLOBAL CONTROLS */}
      <div className="p-6 pb-0">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative z-10 gap-4">
          <div>
            <h1 className="text-4xl font-black text-cyan-400 italic tracking-tighter">AURA MESH</h1>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Status: <span className={isListening ? "text-green-400" : "text-gray-400"}>{isListening ? "ACTIVE" : "STANDBY"}</span></p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button onClick={isListening ? stop : start} className={`px-6 py-3 text-xs font-bold border transition-all ${isListening ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
              {isListening ? "DEACTIVATE MIC" : "ACTIVATE EDGE SENSORS"}
            </button>
            <button onClick={() => handleBroadcastSOS()} disabled={isSending} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-xs font-black shadow-[0_0_20px_rgba(220,38,38,0.5)] active:scale-95">
              {isSending ? "TRANSMITTING..." : "BROADCAST SOS"}
            </button>
          </div>
        </header>

        {/* TABS NAVIGATION */}
        <nav className="flex gap-2 border-b border-gray-800 mb-6">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/20' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Mission Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('mesh')} 
            className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'mesh' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/20' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Mesh Topology
            {isListening && <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>}
          </button>
        </nav>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 px-6 pb-6 overflow-hidden relative z-10">
        
        {/* MODULE 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Live Feed & Mic status */}
            <div className="flex flex-col gap-6">
              <div className="p-4 bg-black/50 border border-gray-800 rounded-xl">
                <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-2">Live Speech Recognition Feed</h3>
                <div className="p-4 bg-gray-900 border border-cyan-900/50 rounded text-center text-sm text-green-400 font-mono h-20 flex items-center justify-center">
                  {isListening ? transcriptLog : "Mic Offline."}
                </div>
              </div>

              {/* Persistence Logs */}
              <div className="bg-gray-900/80 backdrop-blur-sm p-6 rounded-2xl border border-white/10 flex flex-col flex-1 h-[40vh] lg:h-auto">
                <h2 className="text-[10px] font-bold text-gray-500 uppercase mb-4 tracking-widest">Network_Transmission_Logs</h2>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {allMessages?.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-600 italic">No signals in database.</div>
                  ) : (
                    allMessages?.map(m => {
                      const isFire = m.message.includes('FIRE');
                      const isDistress = m.message.includes('DISTRESS');
                      return (
                        <div key={m.id} className={`p-4 rounded-xl border ${isFire ? 'bg-orange-950/30 border-orange-500/50' : isDistress ? 'bg-red-950/30 border-red-500/50' : 'bg-black/60 border-white/5'}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className={`text-[9px] font-bold ${isFire ? 'text-orange-400' : isDistress ? 'text-red-400' : 'text-cyan-400'}`}>LOG_{m.id}</span>
                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-black ${m.isSynced ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                              {m.isSynced ? "SYNCED" : "WAITING..."}
                            </span>
                          </div>
                          <p className={`text-xs mb-2 leading-relaxed ${isFire || isDistress ? 'text-white font-bold' : 'text-gray-300'}`}>{m.message}</p>
                          <span className="text-[8px] text-gray-500">{m.timestamp}</span>
                        </div>
                      );
                    }).reverse()
                  )}
                </div>
              </div>
            </div>

            {/* Acoustic Visualizer */}
            <div className="bg-black/60 rounded-2xl border border-white/10 flex flex-col items-center justify-center relative p-6 h-[50vh] lg:h-auto">
              <h3 className="absolute top-6 left-6 text-[10px] text-gray-500 uppercase tracking-widest">Volume Analyzer</h3>
              <div 
                className={`rounded-full border-2 transition-all duration-75 ${volume > 50 ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_60px_cyan]' : 'bg-gray-800/20 border-gray-700'}`}
                style={{ width: `${100 + volume * 3}px`, height: `${100 + volume * 3}px`, opacity: isListening ? 1 : 0.1 }}
              ></div>
              <div className="absolute bottom-6 font-bold text-cyan-500">{Math.round(volume)} dB</div>
            </div>
          </div>
        )}

        {/* MODULE 2: MESH TOPOLOGY */}
        {activeTab === 'mesh' && (
          <div className="h-[70vh] bg-black rounded-3xl border border-white/10 relative overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-8 duration-500 group">
            <div className="absolute top-6 left-6 z-20">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">AuraMesh Node Radar</h3>
              <p className="text-[10px] text-gray-500 font-mono mt-1">Scanning for offline peer devices...</p>
            </div>
            
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:50px_50px]"></div>
            
            {/* Radar Sweep Animation */}
            {isListening && <div className="absolute top-1/2 left-1/2 w-[150%] h-[150%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_70%,rgba(34,211,238,0.2)_100%)] rounded-full animate-[spin_4s_linear_infinite] pointer-events-none"></div>}
            
            {/* MAIN NODE (YOUR MOBILE) */}
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="relative flex flex-col items-center">
                 <div className={`rounded-full border-4 transition-all duration-300 flex items-center justify-center ${getDangerColor()}`} style={{ width: '80px', height: '80px' }}>
                   <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                 </div>
                 <div className="absolute top-full mt-4 bg-gray-950/80 backdrop-blur border border-cyan-500 px-4 py-2 rounded-lg text-center shadow-lg">
                   <span className="text-xs text-cyan-400 font-bold block">BASE_NODE</span>
                   <span className="text-[9px] text-white block mt-1">Status: {isListening ? 'Broadcasting' : 'Offline'}</span>
                 </div>
               </div>
            </div>

            {/* CONNECTED PEER NODES */}
            {nodes.map(n => (
              <div key={n.id} className="absolute transition-all duration-1000 flex flex-col items-center" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
                <div className="relative">
                  <div className={`w-4 h-4 rounded-full animate-ping absolute opacity-75 ${n.type === 'peer' ? 'bg-white' : 'bg-blue-400'}`}></div>
                  <div className={`w-4 h-4 rounded-full relative ${n.type === 'peer' ? 'bg-white shadow-[0_0_15px_white]' : 'bg-blue-400 shadow-[0_0_15px_blue]'}`}></div>
                </div>
                <div className="mt-3 bg-black/60 px-2 py-1 border border-gray-700 rounded text-center">
                   <span className="text-[9px] text-gray-200 block font-mono">{n.id}</span>
                   <span className="text-[7px] text-gray-500 block uppercase">{n.type} Device</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}