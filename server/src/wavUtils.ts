/**
 * Wraps raw 16-bit signed little-endian PCM bytes returned by Gemini Audio output
 * into a standard 44-byte RIFF WAV container so React Native (expo-av) can play it directly.
 */
export function ensurePlayableAudio(
  base64Data: string,
  mimeType = 'audio/L16;rate=24000'
): { audioBase64: string; mimeType: string } {
  const normalized = mimeType.toLowerCase();

  // Already a standard container format supported natively by expo-av
  if (
    normalized.includes('wav') ||
    normalized.includes('mp3') ||
    normalized.includes('mpeg') ||
    normalized.includes('ogg') ||
    normalized.includes('mp4') ||
    normalized.includes('aac')
  ) {
    return { audioBase64: base64Data, mimeType };
  }

  // Parse sample rate if present in mimeType (e.g., "audio/L16;codec=pcm;rate=24000")
  const rateMatch = mimeType.match(/rate=(\d+)/i);
  const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
  const numChannels = 1;
  const bitsPerSample = 16;

  const pcmBuffer = Buffer.from(base64Data, 'base64');
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const wavHeader = Buffer.alloc(44);

  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  wavHeader.writeUInt16LE(1, 20); // AudioFormat = 1 (PCM)
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(pcmBuffer.length, 40);

  const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
  return {
    audioBase64: wavBuffer.toString('base64'),
    mimeType: 'audio/wav',
  };
}
