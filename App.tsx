import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';
import type { ChatMessage, ConnectionStatus } from './types';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { convertToWav } from './utils/audioUtils';
import ChatBubble from './components/ChatBubble';
import MicrophoneButton from './components/MicrophoneButton';
import StatusIndicator from './components/StatusIndicator';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isProcessing, setIsProcessing] = useState(false);
  const session = useRef<Session | null>(null);
  const audioPlayer = useRef<HTMLAudioElement>(null);
  const responseAudioChunks = useRef<string[]>([]);
  const responseText = useRef('');

  const handleMessage = (message: LiveServerMessage) => {
    if (message.serverContent?.modelTurn?.parts) {
      const part = message.serverContent.modelTurn.parts[0];
      if (part.text) {
        responseText.current += part.text;
      }
      if (part.inlineData?.data) {
        responseAudioChunks.current.push(part.inlineData.data);
      }
    }

    if (message.serverContent?.turnComplete) {
      setMessages(prev => [
        ...prev,
        { id: Date.now(), role: 'model', text: responseText.current },
      ]);
      
      if (responseAudioChunks.current.length > 0) {
        const firstPart = message.serverContent?.modelTurn?.parts?.find(p => p.inlineData);
        const mimeType = firstPart?.inlineData?.mimeType ?? 'audio/L16;rate=24000';
        const wavBlob = convertToWav(responseAudioChunks.current, mimeType);
        const audioUrl = URL.createObjectURL(wavBlob);
        if (audioPlayer.current) {
          audioPlayer.current.src = audioUrl;
          audioPlayer.current.play().catch(e => console.error("Audio playback failed:", e));
        }
      }

      responseText.current = '';
      responseAudioChunks.current = [];
      setIsProcessing(false);
    }
  };

  const connectToGemini = useCallback(async () => {
    if (session.current || connectionStatus === 'connected' || !process.env.API_KEY) {
        return;
    }
    setConnectionStatus('connecting');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const config = {
            responseModalities: [Modality.AUDIO, Modality.TEXT],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Zephyr' }
                }
            },
            systemInstruction: {
                parts: [{ text: `You are a friendly and professional restaurant receptionist assistant for "Triveni Express". Your primary role is to help customers with inquiries about the menu, prices, reservations, hours, and general restaurant information. Always greet the customer warmly. When customers ask about menu items or prices, refer to the provided restaurant menu data. Keep your responses concise but helpful, as this is a voice interface. End conversations by asking if there's anything else you can help them with today.
                ::::: menu.json ::::
                \`\`\`json
                [ { "restaurant_name": "Triveni Express, Richmod, TX", "contact_info": { "address": "W. 5th Avenue, Richmond, TX", "phone": "(500) 550-5000", "website": "www.triveniexpress.com" }, "menu": [ { "category_name": "Appetizers", "items": [ { "name": "Vegetable Samosa", "price": 4.25, "description": "Crispy fried dumplings stuffed with potatoes and vegetables" }, { "name": "Lamb Samosa", "price": 5.95, "description": "Crispy fried dumplings stuffed with lamb and vegetables" }, { "name": "Chicken Pakora", "price": 5.95, "description": "Chopped chicken and onions coated in a chickpea batter and fried" } ] }, { "category_name": "Dosas & Breads", "items": [ { "name": "Butter Naan", "price": 2.00 }, { "name": "Garlic Naan", "price": 3.00 }, { "name": "Masala Dosa", "price": 8.45, "description": "Two lentil and rice crepes stuffed with potato" } ] }, { "category_name": "Tandoori", "items": [ { "name": "Chicken Tandoori", "price": 11.95, "description": "Chicken on-the-bone marinated in yogurt and spices" }, { "name": "Tandoori Shrimp", "price": 13.95, "description": "Jumbo shrimp marinated and cooked on skewers" } ] }, { "category_name": "Biryani", "items": [ { "name": "Vegetable Biryani", "price": 9.25, "description": "Vegetable medley served over basmati rice" }, { "name": "Chicken Biryani", "price": 10.95, "description": "Tender marinated chicken served over basmati rice" } ] }, { "category_name": "Lamb Dishes", "items": [ { "name": "Lamb Vindaloo", "price": 14.25, "description": "Boneless chunks of lamb and potatoes cooked in a spicy sauce" } ] }, { "category_name": "Chicken Dishes", "items": [ { "name": "Butter Chicken", "price": 11.85, "description": "Chicken cooked in a mild buttery curry sauce" } ] }, { "category_name": "Desserts", "items": [ { "name": "Gulab Jamun", "price": 5.95, "description": "Milk balls deep-fried, soaked in honey and saffron" } ] } ] } ]
                \`\`\`` }]
            },
        };
        const newSession = await ai.live.connect({
            model: 'models/gemini-2.5-flash-preview-native-audio-dialog',
            callbacks: {
                onopen: () => setConnectionStatus('connected'),
                onmessage: handleMessage,
                onerror: () => setConnectionStatus('error'),
                onclose: () => setConnectionStatus('disconnected'),
            },
            config
        });
        session.current = newSession;
    } catch (error) {
        console.error("Connection failed:", error);
        setConnectionStatus('error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    connectToGemini();
    return () => {
        session.current?.close();
    };
  }, [connectToGemini]);

  const onTranscript = useCallback((transcript: string) => {
    if (!transcript || !session.current || connectionStatus !== 'connected') {
      return;
    }
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: transcript }]);
    setIsProcessing(true);
    session.current.sendClientContent({
      turns: [{ text: transcript }]
    });
  }, [connectionStatus]);

  const { isListening, startListening, stopListening } = useVoiceRecognition({ onTranscript });
  
  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      <header className="bg-gray-800 shadow-md p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
          <h1 className="text-xl font-bold">Live Agent Voice Chat</h1>
        </div>
        <StatusIndicator status={connectionStatus} />
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                <p className="text-lg">No messages yet.</p>
                <p>Click the microphone to start the conversation.</p>
            </div>
        )}
        {messages.map(msg => (
          <ChatBubble key={msg.id} role={msg.role} text={msg.text} />
        ))}
      </main>

      <footer className="bg-gray-800/50 backdrop-blur-sm p-4 flex flex-col items-center justify-center border-t border-gray-700">
        <MicrophoneButton
          isListening={isListening}
          isProcessing={isProcessing}
          onClick={handleMicClick}
          disabled={connectionStatus !== 'connected'}
        />
        <p className="text-xs text-gray-400 mt-2 h-4">
          {isListening ? 'Listening...' : (connectionStatus === 'connected' ? 'Click the mic to speak' : 'Connecting to agent...')}
        </p>
      </footer>
      <audio ref={audioPlayer} className="hidden" />
    </div>
  );
};

export default App;
