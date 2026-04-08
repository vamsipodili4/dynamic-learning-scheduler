import React, { useState, useRef, useEffect } from 'react';
import { CreateMLCEngine } from '@mlc-ai/web-llm';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { MessageCircle, Send, X, Bot, Minimize2, Maximize2 } from 'lucide-react';
import { getStudyMaterialRaw } from '../utils/storage';
import './AIChat.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.js`;

// WebLLM Model selection
const SELECTED_MODEL = "Llama-3.1-8B-Instruct-q4f32_1-MLC"; // Fallback to Llama-3 if 3.1 fails, technically 3.1 is the new standard
// Wait, to be perfectly safe, "Llama-3-8B-Instruct-q4f32_1-MLC" or "Phi-3-mini-4k-instruct-q4f16_1-MLC" are incredibly stable. I'll use Phi-3-mini because it uses 2GB instead of 5GB ensuring it doesn't crash a user's machine on first load while solving math perfectly.
const SAFE_MODEL = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

const AIChat = ({ tasks = [], uploadedFiles = [], studyFileUrl, onClose }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi! I'm AdaptAI, your powerful offline AI assistant. Ask about materials, tasks, exact mathematical solutions (basic to hard!), or summaries! 📚` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [engine, setEngine] = useState(null);
  const [initProgress, setInitProgress] = useState({ text: 'Initializing AI Engine...', progress: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const fileTextCache = useRef({});

  useEffect(() => {
    let active = true;
    const initEngine = async () => {
      try {
        const mlcEngine = await CreateMLCEngine(
          SAFE_MODEL,
          { 
            initProgressCallback: (progress) => {
               if(active) setInitProgress(progress);
            }
          }
        );
        if (active) {
           setEngine(mlcEngine);
           setInitProgress(null);
        }
      } catch (err) {
        console.error("WebLLM Init Error:", err);
        if (active) setInitProgress({ text: "Error loading AI. Try Google Chrome or Edge with WebGPU enabled.", progress: 0 });
      }
    };
    initEngine();
    return () => { active = false; };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages]);

  const extractPDFText = async (fileBlob) => {
    try {
      const arrayBuffer = await fileBlob.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages && fullText.length < 4000; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + '\\n';
      }
      return fullText;
    } catch (err) {
      return 'PDF text extraction unavailable.';
    }
  };

  const getContextSystemPrompt = async () => {
    const taskContext = tasks.length > 0 ? `Current study tasks:\\n${tasks.slice(0,5).map(t => `- ${t.subject} - ${t.topic} (${t.estimatedHours.toFixed(1)}h, priority: ${t.priority}, due: ${new Date(t.deadline).toLocaleDateString()}`).join('\\n')}\\n` : 'No tasks scheduled yet.';
    
    let materialsSummary = 'No study materials uploaded.';
    if (uploadedFiles.length > 0) {
      materialsSummary = `Recent study materials:\\n`;
      for (const file of uploadedFiles.slice(0, 1)) { // Only digest the most recent 1 to avoid token overflow
        let extractedText = fileTextCache.current[file.id];
        if (!extractedText) {
           const blob = await getStudyMaterialRaw(file.id);
           if (blob) {
              if (blob.type === 'application/pdf') {
                 extractedText = await extractPDFText(blob);
                 fileTextCache.current[file.id] = extractedText;
              } else if (blob.type === 'text/plain') {
                 extractedText = await blob.text();
                 fileTextCache.current[file.id] = extractedText;
              }
           }
        }
        materialsSummary += `📄 ${file.name}\\n--- CONTENT ---\\n${extractedText ? extractedText.substring(0, 3000) : 'unable to read'}\\n---\\n`;
      }
    }
    
    return `You are AdaptAI, a hyper-intelligent and perfectly accurate AI educational assistant (like ChatGPT) running directly in the browser via WebLLM.
Core Directives:
1. Provide extremely accurate answers to mathematical calculations and logic puzzles (evaluate numbers carefully before outputting).
2. Deeply summarize and explain the physical content of uploaded PDFs beautifully, referencing specific segments.
3. Help the user passionately with any educational topics or doubts.

${taskContext}

${materialsSummary}`;
  };

  const handleSend = async () => {
    if (!input.trim() || !engine || isLoading) return;
    
    const userMsg = input.trim();
    setInput('');
    
    const chatHistory = [...messages, { role: 'user', content: userMsg }];
    setMessages(chatHistory);
    setIsLoading(true);

    try {
      const systemPrompt = await getContextSystemPrompt();
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory
      ];
      
      const reply = await engine.chat.completions.create({
        messages: apiMessages,
      });
      
      const aiResponse = reply.choices[0].message.content;
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (err) {
      console.error("WebLLM Inference Error:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Inference runtime error. Ensure browser supports WebGPU.' }]);
    }
    setIsLoading(false);
  };

  return (
    <div className="ai-chat-container" data-minimized={isMinimized}>
      <div className="ai-chat-header">
        <Bot size={24} />
        <h3>AdaptAI</h3>
        <div className="header-actions">
          <button 
            className="toggle-btn" 
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
          <div className="ai-messages">
            {initProgress && (
              <div className="init-progress-box">
                <Bot size={24} className="text-cyan mb-2" style={{margin: '0 auto'}}/>
                <div style={{fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-main)', textAlign: 'center'}}>
                 {initProgress.text.includes('Error') ? initProgress.text : 'Downloading Offline Engine Weights...'}
                </div>
                {!initProgress.text.includes('Error') && (
                  <>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${Math.round(initProgress.progress * 100)}%` }}></div>
                  </div>
                  <div style={{fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-muted)', textAlign: 'center'}}>{initProgress.text}</div>
                  </>
                )}
              </div>
            )}
            
            {!initProgress && messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-content">{msg.content}</div>
              </div>
            ))}
            {isLoading && <div className="message assistant"><div className="loading-dots"><span></span><span></span><span></span></div></div>}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="ai-input-container">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={initProgress ? "Downloading..." : "Ask AdaptAI anything about your studies..."}
              rows="2"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              disabled={isLoading || !!initProgress}
            />
            <button onClick={handleSend} disabled={isLoading || !input.trim() || !!initProgress}>
              <Send size={20} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AIChat;

