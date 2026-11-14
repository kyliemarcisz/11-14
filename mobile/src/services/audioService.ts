import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { fetchGeminiAudioApi } from './api';

let activeSound: Audio.Sound | null = null;

export async function stopCalmAudio(): Promise<void> {
  try {
    Speech.stop();
  } catch {
    // Ignore
  }
  if (activeSound) {
    try {
      await activeSound.stopAsync();
      await activeSound.unloadAsync();
    } catch {
      // Ignore
    }
    activeSound = null;
  }
}

export async function playCalmReadout(
  text: string,
  onDone?: () => void
): Promise<{ source: 'gemini-audio' | 'expo-speech' }> {
  await stopCalmAudio();

  try {
    const response = await fetchGeminiAudioApi(text);
    if (response.audioBase64) {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const mime = response.mimeType || 'audio/wav';
      let soundUri = `data:${mime};base64,${response.audioBase64}`;

      // On native iOS/Android, writing base64 WAV to cacheDirectory gives rock-solid AVPlayer playback
      if (Platform.OS !== 'web' && FileSystem.cacheDirectory) {
        const tempPath = `${FileSystem.cacheDirectory}harbor-tts-${Date.now()}.wav`;
        await FileSystem.writeAsStringAsync(tempPath, response.audioBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        soundUri = tempPath;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: soundUri },
        { shouldPlay: true }
      );
      activeSound = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          if (activeSound === sound) activeSound = null;
          onDone?.();
        }
      });

      return { source: 'gemini-audio' };
    }
  } catch {
    // Fall through to instant offline expo-speech fallback
  }

  // Instant calm offline speech fallback
  Speech.speak(text, {
    language: 'en-US',
    rate: 0.9,
    pitch: 0.98,
    onDone: () => onDone?.(),
    onStopped: () => onDone?.(),
    onError: () => onDone?.(),
  });

  return { source: 'expo-speech' };
}
