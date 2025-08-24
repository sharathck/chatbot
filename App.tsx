
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Session, MediaResolution } from '@google/genai';
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
    if (session.current || connectionStatus === 'connected') {
        return;
    }
    if (!process.env.API_KEY) {
      console.error("API_KEY environment variable not set. The application cannot connect to the Gemini API.");
      setConnectionStatus('error');
      return;
    }
    setConnectionStatus('connecting');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const config = {
            responseModalities: [Modality.AUDIO],
            mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Zephyr' }
                }
            },
            contextWindowCompression: {
                triggerTokens: '25600',
                slidingWindow: { targetTokens: '12800' },
            },
            systemInstruction: {
                parts: [{
                  text: `Always, greet the customer with , Welcome to the <restaurant_name>.You are a friendly and professional restaurant receptionist assistant. Your primary role is to help customers with inquiries about our menu, prices, reservations, hours, and general restaurant information. Please refer to the below menu items and prices in json format. When customers ask about menu items or prices, refer to the provided restaurant menu data file for accurate information. Always greet customers warmly, speak in a conversational tone, and be patient with their questions. If a customer wants to make a reservation, collect their preferred date, time, party size, and contact information. For menu recommendations, ask about dietary preferences, allergies, or cuisine preferences to provide personalized suggestions. If you don't have specific information about something (like ingredient details or preparation methods), politely let them know you'll have a staff member follow up with them.
Keep your responses concise but helpful, as this is a voice interface. Always confirm important details like reservation information or large orders by repeating them back to the customer. If customers ask about topics outside your scope (like directions to the restaurant, parking, or complex dietary restrictions), offer to connect them with a human staff member. Maintain a positive, helpful attitude throughout the conversation and thank customers for choosing your restaurant. End conversations by asking if there's anything else you can help them with today.

::::: menu.json ::::
\`\`\`json
[
  {
    "restaurant_name": "Triveni Express, Richmod, TX",
    "contact_info": {
      "address": "W. 5th Avenue, Richmond, TX",
      "phone": "(500) 550-5000",
      "website": "www.triveniexpress.com"
    },
    "menu": [
      {
        "category_name": "Appetizers",
        "items": [
          {
            "name": "Vegetable Samosa",
            "price": 4.25,
            "description": "Crispy fried dumplings stuffed with potatoes and vegetables",
            "tags": ["vegetarian", "appetizer"]
          },
          {
            "name": "Lamb Samosa",
            "price": 5.95,
            "description": "Crispy fried dumplings stuffed with lamb and vegetables",
            "tags": ["lamb", "appetizer"]
          },
          {
            "name": "Eggplant Pakora",
            "price": 4.25,
            "description": "Eggplant and onions coated in a chickpea batter and fried",
            "tags": ["vegetarian", "appetizer", "eggplant"]
          },
          {
            "name": "Chicken Pakora",
            "price": 5.95,
            "description": "Chopped chicken and onions coated in a chickpea batter and fried",
            "tags": ["chicken", "appetizer"]
          },
          {
            "name": "Vegetable Pakora",
            "price": 4.25,
            "description": "Chopped mixed vegetables coated in a chickpea batter and fried",
            "tags": ["vegetarian", "appetizer"]
          },
               {
            "name": "Vegetable Samosa",
            "price": 4.50,
            "description": "Crispy fried dumplings stuffed with potatoes and vegetables",
            "tags": ["vegetarian", "appetizer"]
          },
          {
            "name": "Lamb Samosa",
            "price": 5.95,
            "description": "Crispy fried dumplings stuffed with lamb and vegetables",
            "tags": ["lamb", "appetizer"]
          },
          {
            "name": "Eggplant Pakora",
            "price": 4.25,
            "description": "Eggplant and onions coated in a chickpea batter and fried",
            "tags": ["vegetarian", "appetizer", "eggplant"]
          },
          {
            "name": "Channa Chaat",
            "price": 5.25,
            "description": "Chickpeas mixed with potatoes, cucumbers, onions, topped with yogurt, cilantro and a spicy sauce",
            "tags": ["vegetarian", "appetizer", "chaat", "spicy"]
          },
          {
            "name": "Samosa Chaat",
            "price": 5.95,
            "description": "Two vegetable samosas, topped with cucumbers, onions, yogurt, cilantro and a spicy sauce",
            "tags": ["vegetarian", "appetizer", "chaat", "spicy"]
          }
        ]
      },
      {
        "category_name": "Dosas & Breads",
        "items": [
          {
            "name": "Butter Naan",
            "price": 2.00,
            "description": null,
            "tags": ["vegetarian", "bread", "naan"]
          },
          {
            "name": "Garlic Naan",
            "price": 3.00,
            "description": null,
            "tags": ["vegetarian", "bread", "naan", "garlic"]
          },
          {
            "name": "Keema Naan",
            "price": 3.95,
            "description": "Flatbread stuffed with spiced minced lamb and cilantro",
            "tags": ["lamb", "bread", "naan"]
          },
          {
            "name": "Cheese Naan",
            "price": 4.50,
            "description": "Flatbread baked in a tandoor and stuffed with cheese",
            "tags": ["vegetarian", "bread", "naan", "cheese"]
          },
          {
            "name": "Vegetarian Appetizer Platter",
            "price": 9.95,
            "description": "Assortment of samosa, pakoras, and pappadum, with raita, mint chutney, and tamarind sauce",
            "tags": ["vegetarian", "appetizer", "sharable"]
          },
          {
            "name": "Utthapam",
            "price": 8.95,
            "description": "Two lentil and rice crepes stuffed with tomato and onion, served with coconut chutney and lentil dal",
            "tags": ["vegetarian", "appetizer", "lentils"]
          },
          {
            "name": "Dosas",
            "price": 3.45,
            "description": "Two lentil and rice crepes served with coconut chutney and lentil dal",
            "tags": ["vegetarian", "appetizer", "dosa", "lentils"]
          },
          {
            "name": "Masala Dosa",
            "price": 8.45,
            "description": "Two lentil and rice crepes stuffed with potato, served with coconut chutney and lentil dal",
            "tags": ["vegetarian", "appetizer", "dosa", "potato", "lentils"]
          },
          {
            "name": "Sweet Masala Dosa",
            "price": 8.95,
            "description": "Two lentil and rice crepes stuffed with sweet potato, served with coconut chutney and lentil dal",
            "tags": ["vegetarian", "appetizer", "dosa", "sweet_potato", "lentils"]
          },
          {
            "name": "Rava Dosa",
            "price": 8.95,
            "description": "Thin crepe made with semolina flour, served with coconut chutney and lentil dal",
            "tags": ["vegetarian", "appetizer", "dosa", "lentils"]
          }
        ]
      },
      {
        "category_name": "Tandoori",
        "items": [
          {
            "name": "Chicken Tandoori",
            "price": 11.95,
            "description": "Chicken on-the-bone marinated in yogurt and spices, cooked in a tandoor, and served with sliced red bell peppers and onions",
            "tags": ["chicken", "tandoori"]
          },
          {
            "name": "Tandoori Shrimp",
            "price": 13.95,
            "description": "Jumbo shrimp marinated and cooked on skewers in a tandoor oven",
            "tags": ["seafood", "shrimp", "tandoori"]
          },
          {
            "name": "Tandoori Beef",
            "price": 12.95,
            "description": "Tender pieces of marinated beef cooked in a tandoor oven",
            "tags": ["beef", "tandoori"]
          },
          {
            "name": "Vegetable Tandoori",
            "price": 9.95,
            "description": "Vegetable medley marinated in spices and cooked in the tandoor oven",
            "tags": ["vegetarian", "tandoori"]
          },
          {
            "name": "Tandoori Mix Grill",
            "price": 15.75,
            "description": "A combination of our most popular tandoori items including shrimp, tandoori chicken tikka, seekh kabob, and boti kabob",
            "tags": ["tandoori", "mixed_grill", "seafood", "chicken", "lamb", "beef"]
          }
        ]
      },
      {
        "category_name": "Biryani",
        "items": [
          {
            "name": "Vegetable Biryani",
            "price": 9.25,
            "description": "Vegetable medley topped with cashews and cilantro, served over basmati rice",
            "tags": ["vegetarian", "biryani", "rice", "contains_nuts"]
          },
          {
            "name": "Chicken Biryani",
            "price": 10.95,
            "description": "Tender marinated chicken topped with cashews and cilantro, served over basmati rice",
            "tags": ["chicken", "biryani", "rice", "contains_nuts"]
          },
          {
            "name": "Paneer Biryani",
            "price": 9.25,
            "description": "Homemade cheese and root vegetables topped with cashews and cilantro, served over basmati rice",
            "tags": ["vegetarian", "paneer", "cheese", "biryani", "rice", "contains_nuts"]
          },
               {
            "name": "Vegetable Biryani",
            "price": 9.25,
            "description": "Vegetable medley topped with cashews and cilantro, served over basmati rice",
            "tags": ["vegetarian", "biryani", "rice", "contains_nuts"]
          },
          {
            "name": "Chicken Biryani",
            "price": 10.95,
            "description": "Tender marinated chicken, topped with cashews and cilantro, served over basmati rice",
            "tags": ["chicken", "biryani", "rice", "contains_nuts"]
          },
          {
            "name": "Shrimp and Scallop Biryani",
            "price": 16.95,
            "description": "Seared scallops and shrimp, topped with cashews and cilantro, served over basmati rice",
            "tags": ["seafood", "shrimp", "scallop", "biryani", "rice", "contains_nuts"]
          },
          {
            "name": "Eggplant Biryani",
            "price": 9.25,
            "description": "Roasted eggplant, topped with cashews and cilantro, served over basmati rice",
            "tags": ["vegetarian", "eggplant", "biryani", "rice", "contains_nuts"]
          },
          {
            "name": "Paneer Biryani",
            "price": 9.25,
            "description": "Homemade cheese and root vegetables, topped with cashews and cilantro, served over basmati rice",
            "tags": ["vegetarian", "paneer", "cheese", "biryani", "rice", "contains_nuts"]
          }
        ]
      },
      {
        "category_name": "Lamb Dishes",
        "items": [
          {
            "name": "Lamb Kashmiri",
            "price": 14.25,
            "description": "Lamb chops cooked in onion, garlic, ginger and peach sauce",
            "tags": ["lamb", "main_course"]
          },
          {
            "name": "Lamb Danshik",
            "price": 15.25,
            "description": "Boneless lamb, pineapples and lentils cooked with pineapple and herbs",
            "tags": ["lamb", "lentils", "main_course"]
          },
          {
            "name": "Lamb Broccoli",
            "price": 14.25,
            "description": "Boneless chunks of lamb and broccoli cooked in spicy sauce",
            "tags": ["lamb", "broccoli", "spicy", "main_course"]
          },
          {
            "name": "Lamb Vindaloo",
            "price": 14.25,
            "description": "Boneless chunks of lamb and potatoes cooked in a spicy sauce",
            "tags": ["lamb", "vindaloo", "spicy", "potato", "main_course"]
          },
          {
            "name": "Lamb Achari",
            "price": 13.95,
            "description": "Boneless chunks of lamb and pickling spices",
            "tags": ["lamb", "achari", "spicy", "main_course"]
          }
        ]
      },
      {
        "category_name": "Beef Dishes",
        "items": [
          {
            "name": "Beef Vindaloo",
            "price": 13.95,
            "description": "Boneless beef chunks and potato cooked in a spicy sauce",
            "tags": ["beef", "vindaloo", "spicy", "potato", "main_course"]
          },
          {
            "name": "Beef Broccoli",
            "price": 13.95,
            "description": "Boneless beef chunks and broccoli served cooked in a spicy sauce",
            "tags": ["beef", "broccoli", "spicy", "main_course"]
          },
          {
            "name": "Beef Shai Korma",
            "price": 14.25,
            "description": "Boneless beef chunks cooked in spicy sauce with almonds and cashews",
            "tags": ["beef", "korma", "spicy", "contains_nuts", "main_course"]
          },
          {
            "name": "Beef Saagwala",
            "price": 14.95,
            "description": "Boneless beef chunks cooked in spicy sauce with spinach and herbs",
            "tags": ["beef", "saag", "spinach", "spicy", "main_course"]
          }
        ]
      },
      {
        "category_name": "Chicken Dishes",
        "items": [
          {
            "name": "Chicken La-Jawab",
            "price": 13.25,
            "description": "Boneless chicken and chunks of apple cooked in ginger sauce with nuts",
            "tags": ["chicken", "contains_nuts", "main_course"]
          },
          {
            "name": "Chicken Kashmiri",
            "price": 12.95,
            "description": "Boneless chicken cooked in ginger and peach sauce",
            "tags": ["chicken", "main_course"]
          },
          {
            "name": "Chicken Makhani",
            "price": 13.95,
            "description": "Chicken breast cooked in a sauce of tomatoes and herbs",
            "tags": ["chicken", "makhani", "main_course"]
          },
          {
            "name": "Chicken Vindaloo",
            "price": 13.95,
            "description": "Chicken breast and thigh served with potatoes in a spicy sauce",
            "tags": ["chicken", "vindaloo", "spicy", "potato", "main_course"]
          },
          {
            "name": "Butter Chicken",
            "price": 11.85,
            "description": "Chicken cooked in a mild buttery curry sauce with fenugreek",
            "tags": ["chicken", "butter_chicken", "mild", "main_course"]
          }
        ]
      },
      {
        "category_name": "Vegetable Dishes",
        "items": [
          {
            "name": "Saag Paneer Curry",
            "price": 9.95,
            "description": "Spinach and homemade cheese cooked in a curry sauce",
            "tags": ["vegetarian", "saag", "paneer", "spinach", "cheese", "curry", "main_course"]
          },
          {
            "name": "Saag Aloo Curry",
            "price": 8.95,
            "description": "Spinach and potato cooked in a curry sauce",
            "tags": ["vegetarian", "saag", "aloo", "spinach", "potato", "curry", "main_course"]
          },
          {
            "name": "Vegetable Curry",
            "price": 8.95,
            "description": "Mixed vegetables cooked in a curry sauce",
            "tags": ["vegetarian", "curry", "main_course"]
          },
          {
            "name": "Eggplant Curry",
            "price": 9.95,
            "description": "Eggplant cooked in curry sauce",
            "tags": ["vegetarian", "eggplant", "curry", "main_course"]
          }
        ]
      },
      {
        "category_name": "Desserts",
        "items": [
          {
            "name": "Saffron Kulfi",
            "price": 4.95,
            "description": "Traditional saffron ice cream with nuts",
            "tags": ["vegetarian", "dessert", "ice_cream", "contains_nuts"]
          },
          {
            "name": "Gulab Jamun",
            "price": 5.95,
            "description": "Milk balls deep-fried, soaked in honey and saffron",
            "tags": ["vegetarian", "dessert"]
          },
          {
            "name": "Pistachio Kulfi",
            "price": 4.25,
            "description": "Pistachio ice cream",
            "tags": ["vegetarian", "dessert", "ice_cream", "contains_nuts"]
          }
        ]
      }
    ]
  }
]
\`\`\``,
                }]
            },
        };
        const newSession = await ai.live.connect({
            model: 'models/gemini-2.5-flash-preview-native-audio-dialog',
            callbacks: {
                onopen: () => setConnectionStatus('connected'),
                onmessage: handleMessage,
                onerror: (e: ErrorEvent) => {
                  console.error('Connection Error:', e.message);
                  setConnectionStatus('error');
                },
                onclose: (e: CloseEvent) => {
                  console.log('Connection Closed:', e.reason, `Code: ${e.code}`);
                  setConnectionStatus('disconnected');
                },
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
