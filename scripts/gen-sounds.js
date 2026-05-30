// Generates two short chime WAV files used for the reward loop.
// Run once with: node scripts/gen-sounds.js
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

function writeWav(filePath, samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  let o = 0;
  buffer.write('RIFF', o); o += 4;
  buffer.writeUInt32LE(36 + numSamples * 2, o); o += 4;
  buffer.write('WAVE', o); o += 4;
  buffer.write('fmt ', o); o += 4;
  buffer.writeUInt32LE(16, o); o += 4;
  buffer.writeUInt16LE(1, o); o += 2; // PCM
  buffer.writeUInt16LE(1, o); o += 2; // mono
  buffer.writeUInt32LE(SAMPLE_RATE, o); o += 4;
  buffer.writeUInt32LE(SAMPLE_RATE * 2, o); o += 4;
  buffer.writeUInt16LE(2, o); o += 2;
  buffer.writeUInt16LE(16, o); o += 2;
  buffer.write('data', o); o += 4;
  buffer.writeUInt32LE(numSamples * 2, o); o += 4;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE((s * 32767) | 0, o);
    o += 2;
  }
  fs.writeFileSync(filePath, buffer);
}

// A tone with a soft exponential decay (bell-like).
function tone(freq, durationS, startAt, samples, amp = 0.4) {
  const start = Math.floor(startAt * SAMPLE_RATE);
  const len = Math.floor(durationS * SAMPLE_RATE);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-4 * t);
    const idx = start + i;
    if (idx < samples.length) {
      samples[idx] += amp * env * Math.sin(2 * Math.PI * freq * t);
    }
  }
}

const outDir = path.join(__dirname, '..', 'assets', 'sounds');

// chime: a quick rising two-note ding (C6 -> E6)
{
  const total = Math.floor(0.5 * SAMPLE_RATE);
  const samples = new Float32Array(total);
  tone(1046.5, 0.35, 0.0, samples);
  tone(1318.5, 0.45, 0.06, samples);
  writeWav(path.join(outDir, 'chime.wav'), samples);
}

// celebrate: a three-note arpeggio (C6 -> E6 -> G6) for all-done
{
  const total = Math.floor(0.9 * SAMPLE_RATE);
  const samples = new Float32Array(total);
  tone(1046.5, 0.3, 0.0, samples, 0.35);
  tone(1318.5, 0.3, 0.12, samples, 0.35);
  tone(1568.0, 0.55, 0.24, samples, 0.4);
  writeWav(path.join(outDir, 'celebrate.wav'), samples);
}

console.log('Generated chime.wav and celebrate.wav');
