// useAudioVisualizer — Web Audio API frequency analysis for voice visualization
import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioVisualizerReturn {
  frequencies: number[];
  volume: number;
  isActive: boolean;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
}

export const useAudioVisualizer = (barCount: number = 16): UseAudioVisualizerReturn => {
  const [frequencies, setFrequencies] = useState<number[]>(new Array(barCount).fill(0));
  const [volume, setVolume] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const analyze = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Downsample to barCount buckets
    const bucketSize = Math.floor(dataArray.length / barCount);
    const bars: number[] = [];
    let totalVolume = 0;

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < bucketSize; j++) {
        sum += dataArray[i * bucketSize + j];
      }
      const avg = sum / bucketSize / 255; // Normalize to 0-1
      bars.push(avg);
      totalVolume += avg;
    }

    setFrequencies(bars);
    setVolume(totalVolume / barCount);
    rafRef.current = requestAnimationFrame(analyze);
  }, [barCount]);

  const startCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      setIsActive(true);
      analyze();
    } catch (error) {
      console.error('Failed to capture audio:', error);
    }
  }, [analyze]);

  const stopCapture = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsActive(false);
    setFrequencies(new Array(barCount).fill(0));
    setVolume(0);
  }, [barCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCapture();
  }, [stopCapture]);

  return { frequencies, volume, isActive, startCapture, stopCapture };
};

export default useAudioVisualizer;
