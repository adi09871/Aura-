/**
 * AuraMesh — Local Audio Classifier (TensorFlow.js)
 *
 * This module is the ML integration skeleton. It uses TensorFlow.js to run
 * inference entirely in the browser — no external API calls.
 *
 * HOW TO ACTIVATE THE REAL MODEL:
 * 1. Download YAMNet: https://tfhub.dev/google/yamnet/1
 *    or use: @tensorflow-models/speech-commands for browser-optimised weights
 * 2. Place model files in /public/models/yamnet/
 *    (model.json + shard files)
 * 3. Uncomment the tf.loadGraphModel block below
 * 4. Replace simulateClassification() calls with realClassify()
 *
 * Class labels reference: https://github.com/tensorflow/models/blob/master/research/audioset/yamnet/yamnet_class_map.csv
 */

// import * as tf from '@tensorflow/tfjs';

export interface ClassificationResult {
  label: string;
  confidence: number;
  isAlert: boolean;
}

// Alert-worthy sound classes (subset of YAMNet's 521 classes)
export const ALERT_CLASSES = [
  'Fire alarm',
  'Smoke detector',
  'Gunshot',
  'Explosion',
  'Glass break',
  'Siren',
  'Civil defense siren',
  'Screaming',
  'Baby cry',
] as const;

export const AMBIENT_CLASSES = [
  'Speech',
  'Music',
  'Wind',
  'Rain',
  'Silence',
  'Ambient noise',
];

// ─── REAL IMPLEMENTATION (uncomment when model is ready) ──────────────────────
// let model: tf.GraphModel | null = null;
//
// export async function loadModel(): Promise<void> {
//   if (model) return;
//   model = await tf.loadGraphModel('/models/yamnet/model.json');
//   console.log('[AuraMesh] YAMNet model loaded successfully');
// }
//
// export async function realClassify(audioBuffer: Float32Array): Promise<ClassificationResult> {
//   if (!model) await loadModel();
//
//   // Resample to 16kHz mono if needed
//   const tensor = tf.tensor1d(audioBuffer).expandDims(0);
//   const predictions = model!.predict(tensor) as tf.Tensor;
//   const scores = await predictions.data();
//
//   // Get top prediction
//   const maxIdx = scores.indexOf(Math.max(...Array.from(scores)));
//   const label = YAMNET_CLASS_LABELS[maxIdx];
//   const confidence = scores[maxIdx];
//
//   tensor.dispose();
//   predictions.dispose();
//
//   return {
//     label,
//     confidence,
//     isAlert: ALERT_CLASSES.includes(label as any),
//   };
// }
// ─────────────────────────────────────────────────────────────────────────────

// ─── SIMULATION (active while real model is not loaded) ───────────────────────
function simulateClassification(): ClassificationResult {
  // Weighted random: 80% ambient, 20% alert
  const isAlert = Math.random() < 0.20;

  if (isAlert) {
    const alerts = [...ALERT_CLASSES];
    const label = alerts[Math.floor(Math.random() * alerts.length)];
    return {
      label,
      confidence: 0.68 + Math.random() * 0.30,
      isAlert: true,
    };
  }

  const label = AMBIENT_CLASSES[Math.floor(Math.random() * AMBIENT_CLASSES.length)];
  return {
    label,
    confidence: 0.75 + Math.random() * 0.24,
    isAlert: false,
  };
}

/**
 * Main entry point — swap simulateClassification() for realClassify()
 * once YAMNet model files are in /public/models/yamnet/
 */
export async function classifyAudioChunk(
  _frequencyData: Uint8Array
): Promise<ClassificationResult> {
  // In production:
  // const floatBuffer = new Float32Array(_frequencyData.length);
  // for (let i = 0; i < _frequencyData.length; i++) {
  //   floatBuffer[i] = (_frequencyData[i] - 128) / 128.0; // normalize
  // }
  // return realClassify(floatBuffer);

  return simulateClassification();
}
