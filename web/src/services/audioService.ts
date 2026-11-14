import { fetchGeminiAudioApi } from './api';

let activeAudioElement: HTMLAudioElement | null = null;

export function triggerGentleFeedback(pattern: number | number[] = 12): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore on desktop browsers
  }
}

export function stopCalmAudio(): void {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // Ignore
  }

  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch {
      // Ignore
    }
    activeAudioElement = null;
  }
}

export async function playCalmReadout(
  text: string,
  onDone?: () => void
): Promise<{ source: 'gemini-audio' | 'web-speech' }> {
  stopCalmAudio();

  try {
    const response = await fetchGeminiAudioApi(text);
    if (response.audioBase64) {
      const mime = response.mimeType || 'audio/wav';
      const audio = new Audio(`data:${mime};base64,${response.audioBase64}`);
      activeAudioElement = audio;

      audio.onended = () => {
        if (activeAudioElement === audio) activeAudioElement = null;
        onDone?.();
      };
      audio.onerror = () => {
        if (activeAudioElement === audio) activeAudioElement = null;
        speakViaWebSpeech(text, onDone);
      };

      await audio.play();
      return { source: 'gemini-audio' };
    }
  } catch {
    // Fall back to instant browser speech synthesis
  }

  speakViaWebSpeech(text, onDone);
  return { source: 'web-speech' };
}

function speakViaWebSpeech(text: string, onDone?: () => void): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    utterance.pitch = 0.98;
    utterance.onend = () => onDone?.();
    utterance.onerror = () => onDone?.();
    window.speechSynthesis.speak(utterance);
  } else {
    onDone?.();
  }
}
