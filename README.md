# Aura-
# 🛰️ AuraMesh — Offline-First Emergency Command Center

A dark-mode, bento-box dashboard built with **Next.js 14**, **Dexie.js (IndexedDB)**, **Web Audio API**, and a **TensorFlow.js** skeleton for local acoustic sound classification.

---

## ⚡ Quick Start (3 commands)

```bash
# 1. Install dependencies
npm install

# 2. Run the dev server
npm run dev

# 3. Open in browser
open http://localhost:3000
```

---

## 📁 Project Structure

```
auramesh/
├── app/
│   ├── globals.css          # Tailwind + IBM Plex Mono font
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Entry point
├── components/
│   ├── Dashboard.tsx        # Main bento-grid layout
│   ├── MeshMap.tsx          # Animated SVG mesh network map
│   ├── AcousticAlertFeed.tsx# Mic listener + ML alert stream
│   ├── SOSFeed.tsx          # Offline SOS inbox + compose
│   └── VolumeMeter.tsx      # Real-time audio volume bars
├── hooks/
│   └── useAudioListener.ts  # 🎤 Custom hook: getUserMedia + WebAudio
├── lib/
│   ├── db.ts                # 💾 Dexie.js IndexedDB schema
│   └── audioClassifier.ts   # 🤖 TensorFlow.js YAMNET skeleton
└── README.md
```

---

## 🔧 Features

### ✅ Working Right Now
| Feature | Tech | Status |
|---|---|---|
| Dark bento-box UI | Tailwind CSS | ✅ Live |
| Animated mesh network map | SVG + React | ✅ Live |
| Real microphone access | `getUserMedia` | ✅ Live |
| Live volume meter | Web Audio API Analyser | ✅ Live |
| Acoustic event simulation | Weighted random | ✅ Live |
| Offline SOS storage | Dexie.js / IndexedDB | ✅ Live |
| SOS persists after refresh | IndexedDB | ✅ Live |
| Online/Offline detection | `navigator.onLine` events | ✅ Live |

### 🔜 Activate Real ML (TensorFlow.js)
The skeleton is in `lib/audioClassifier.ts`. To enable real inference:

1. **Download YAMNet model** (521 sound classes):
   ```bash
   # Option A: TF Hub YAMNET (TFLite → TFJS conversion needed)
   # Option B: Use the pre-converted browser version:
   npm install @tensorflow-models/speech-commands
   ```

2. **Place model files** in `/public/models/yamnet/`

3. **Uncomment** the `realClassify()` function in `lib/audioClassifier.ts`

4. **Replace** `simulateClassification()` with `realClassify(floatBuffer)`

---

## 💾 IndexedDB Schema (Dexie.js)

```
AuraMeshDB
├── sosMessages     (id, callsign, location, message, priority, synced, createdAt)
└── acousticEvents  (id, label, confidence, timestamp, createdAt)
```

All data survives browser refresh and works **completely offline**.

---

## 🎤 useAudioListener Hook

```typescript
import { useAudioListener } from '@/hooks/useAudioListener';

const { isListening, error, volume, start, stop } = useAudioListener(
  (result) => console.log('Alert:', result.label, result.confidence),
  3000  // classify every 3 seconds
);
```

The hook:
1. Requests mic via `navigator.mediaDevices.getUserMedia`
2. Builds: `MediaStream → AudioContext → AnalyserNode`
3. Drives volume meter via `requestAnimationFrame`
4. Calls TF.js classifier every `classifyIntervalMs`
5. Fires `onAlert` only for non-ambient sounds

---

## 🔒 Microphone Permissions

Chrome/Firefox will ask for mic permission when you click **▶ LISTEN**.  
If denied, you'll see a clear error message in the UI.

For localhost, permissions are granted automatically in most browsers.

---

## 🚀 Production Build

```bash
npm run build
npm start
```

