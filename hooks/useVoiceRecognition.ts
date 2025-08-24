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

  useEffect(() => {
    if (!SpeechRecognitionAPI) {
      console.error("Speech Recognition API is not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognitionAPI();
    // Set continuous to false. The browser will automatically stop listening 
    // when it detects a pause in speech. This is ideal for a command-based chat interface.
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onend = () => {
      // onend fires automatically when recognition stops, either by API call or end of speech.
      setIsListening(false);
    };

    rec.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    rec.onresult = (event) => {
      // Since continuous is false, we'll only get one result event with the final transcript.
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) {
        onTranscript(transcript);
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
      recognition.current.start();
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    // This now acts as a "cancel" button during recognition.
    if (recognition.current && isListening) {
      recognition.current.stop();
    }
  }, [isListening]);

  return { isListening, startListening, stopListening };
};
