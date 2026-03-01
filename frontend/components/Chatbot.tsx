
import React, { useState } from 'react';
import { chatWithAssistant } from '../services/gemini';

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    const userMsg = message;
    setMessage('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const response = await chatWithAssistant(userMsg, chatHistory);
      setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'ai', text: "I'm sorry, I'm having trouble connecting right now. Please check your API key." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end">
      {isOpen && (
        <div className="glass-card w-80 sm:w-96 h-[500px] mb-4 rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/20">
          <div className="bg-primary p-4 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">smart_toy</span>
              <span className="font-bold">StrokeAI Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {chatHistory.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <p>Hello! Ask me anything about stroke risk factors or how our platform works.</p>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl animate-pulse">
                  <div className="flex gap-1">
                    <div className="size-1 bg-slate-400 rounded-full"></div>
                    <div className="size-1 bg-slate-400 rounded-full"></div>
                    <div className="size-1 bg-slate-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-grow rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm"
            />
            <button 
              onClick={handleSend}
              className="size-10 bg-primary text-white rounded-xl flex items-center justify-center"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>
      )}

      <div className="relative group">
        <div className="absolute -top-12 right-0 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs font-bold pointer-events-none dark:text-white border border-primary/20">
          "What is a normal BMI?"
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="size-16 rounded-full bg-primary text-white shadow-2xl shadow-primary/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-3xl">smart_toy</span>
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
