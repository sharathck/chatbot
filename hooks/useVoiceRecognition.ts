import { useState, useRef, useEffect, useCallback } from 'react';

// Define interfaces for the Web Speech API to provide type safety.
// This avoids errors with `window.SpeechRecognition` which is not in standard TS DOM libs.
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}
interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  start: () => void;
  stop: () => void;
}
interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// Extend the global Window interface to include the SpeechRecognition APIs
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}


interface VoiceRecognitionOptions {
  onTranscript: (transcript: string) => void;
}

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

export const useVoiceRecognition = ({ onTranscript }: VoiceRecognitionOptions) => {
  const [isListening, setIsListening] = useState(false);
  const recognition = useRef<SpeechRecognition | null>(null);
  const shouldBeListening = useRef(false);

  useEffect(() => {
    if (!SpeechRecognitionAPI) {
      console.error("Speech Recognition API is not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognitionAPI();
    // Set continuous to true to keep listening throughout the session
    // Set interimResults to false to only get final results immediately
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onend = () => {
      // Auto-restart listening if it was manually stopped due to silence
      // Only restart if we're supposed to be listening
      setIsListening(false);
      if (shouldBeListening.current) {
        setTimeout(() => {
          if (recognition.current && shouldBeListening.current) {
            recognition.current.start();
          }
        }, 100);
      }
    };

    rec.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      // Auto-restart on certain errors, but not on permission errors
      if (event.error !== 'not-allowed' && event.error !== 'service-not-allowed' && shouldBeListening.current) {
        setTimeout(() => {
          if (recognition.current && shouldBeListening.current) {
            recognition.current.start();
          }
        }, 1000);
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldBeListening.current = false;
      }
    };

    rec.onresult = (event) => {
      // Process only final results for immediate capture
      for (let i = event.results.length - 1; i >= 0; i--) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.trim();
          if (transcript) {
            onTranscript(transcript);
            break; // Only process the most recent final result
          }
        }
      }
    };
    
    recognition.current = rec;

    // Cleanup: ensure recognition is stopped when the component unmounts.
    return () => {
      rec.stop();
    };
  }, [onTranscript]);

  const startListening = useCallback(() => {
    if (recognition.current && !isListening) {
      shouldBeListening.current = true;
      recognition.current.start();
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    // This now acts as a "cancel" button during recognition.
    shouldBeListening.current = false;
    if (recognition.current && isListening) {
      recognition.current.stop();
    }
  }, [isListening]);

  return { isListening, startListening, stopListening };
};
