import React, { useState, useRef, useEffect } from 'react';
import { streamDualResponses, type ChatMessage, type StreamEvent, submitPreference } from '../api';
import { generateSessionId } from '../utils';
import { LoadingSpinner } from '../components/UIComponents';

interface DualResponse {
  id: number;
  content: string;
  model: string;
  isStreaming: boolean;
}

const ChatPlayground: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(generateSessionId());
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);
  const [dualResponses, setDualResponses] = useState<DualResponse[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, dualResponses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setDualResponses([]);
    setSelectedResponse(null);

    // Add user message to chat
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ];
    setMessages(newMessages);

    try {
      // Initialize dual responses with correct model names from backend
      const responses: DualResponse[] = [
        { id: 1, content: '', model: 'gemini-2.5-flash', isStreaming: true },
        { id: 2, content: '', model: 'gemini-1.5-flash', isStreaming: true },
      ];
      setDualResponses(responses);

      // Stream dual responses
      const stream = streamDualResponses({
        chat_history: newMessages.slice(0, -1),
        user_message: userMessage,
        session_id: sessionId,
      });

      for await (const event of stream) {
        if (event.type === 'trace_info' && event.trace_id) {
          setCurrentTraceId(event.trace_id);
        } else if (event.type === 'content' && event.response_id) {
          setDualResponses((prev) =>
            prev.map((resp) =>
              resp.id === event.response_id
                ? { ...resp, content: resp.content + (event.content || ''), model: event.model || resp.model }
                : resp
            )
          );
        } else if (event.type === 'streams_complete') {
          setDualResponses((prev) =>
            prev.map((resp) => ({ ...resp, isStreaming: false }))
          );
        } else if (event.type === 'error') {
          console.error('Stream error:', event.error);
        }
      }
    } catch (error) {
      console.error('Error streaming responses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectResponse = async (responseId: number) => {
    setSelectedResponse(responseId);
    const selectedResp = dualResponses.find(r => r.id === responseId);

    if (selectedResp) {
      // Add selected response to chat history
      setMessages([...messages, { role: 'assistant', content: selectedResp.content }]);

      // Submit preference to backend
      try {
        await submitPreference({
          session_id: sessionId,
          winner_index: responseId - 1,
          responses: dualResponses.map(r => r.content),
          user_prompt: messages[messages.length - 1]?.content,
        });
      } catch (error) {
        console.error('Failed to submit preference:', error);
      }

      // Clear dual responses
      setTimeout(() => {
        setDualResponses([]);
        setSelectedResponse(null);
      }, 500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background-dark">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[40px]">chat</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Citrus AI Chat</h2>
              <p className="text-gray-400">Compare responses from multiple models side-by-side</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-4 animate-fadeInUp ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-10 h-10 rounded-full bg-primary/20 ring-1 ring-primary/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[20px]">smart_toy</span>
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-2xl p-5 ${msg.role === 'user'
                  ? 'glass-panel rounded-tr-sm'
                  : 'bg-white/5 border border-white/10 rounded-tl-sm'
                  }`}
              >
                <p className="text-gray-100 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-10 h-10 rounded-full bg-white/10 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-gray-400 text-[20px]">person</span>
                </div>
              )}
            </div>
          ))}

          {/* Dual Responses */}
          {dualResponses.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="material-symbols-outlined text-[16px]">compare</span>
                <span>Compare Responses</span>
                {currentTraceId && (
                  <span className="ml-2 px-2 py-0.5 rounded bg-white/5 font-mono text-xs">
                    Trace: {currentTraceId.slice(0, 8)}...
                  </span>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {dualResponses.map((response) => (
                  <div
                    key={response.id}
                    className={`glass-panel rounded-2xl p-6 transition-all duration-300 cursor-pointer ${selectedResponse === response.id
                      ? 'ring-2 ring-primary scale-[1.02]'
                      : 'hover:bg-white/10'
                      }`}
                    onClick={() => !response.isStreaming && handleSelectResponse(response.id)}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-bold text-primary uppercase tracking-wide">
                        {response.model}
                      </span>
                      {response.isStreaming && (
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-100 whitespace-pre-wrap leading-relaxed min-h-[100px]">
                      {response.content || 'Generating...'}
                    </p>
                    {!response.isStreaming && !selectedResponse && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <span className="text-xs text-gray-400">Click to select this response</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="relative z-10 p-6 bg-gradient-to-t from-background-dark via-background-dark to-transparent">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="glass-panel rounded-2xl p-4 shadow-2xl shadow-black/50 ring-1 ring-white/10 focus-within:ring-primary/50 transition-all duration-300">
            <div className="flex items-start gap-3">
              <div className="pt-2">
                <span className="material-symbols-outlined text-gray-500 animate-pulse">
                  motion_photos_auto
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything or compare model responses..."
                className="flex-1 bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 resize-none py-2 text-base max-h-48 overflow-y-auto outline-none"
                rows={1}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex items-center gap-2 h-10 px-5 bg-primary hover:bg-primary/90 disabled:bg-primary/20 disabled:cursor-not-allowed text-background-dark text-sm font-bold rounded-xl transition-all duration-200 shadow-[0_0_15px_rgba(202,255,97,0.3)] hover:shadow-[0_0_20px_rgba(202,255,97,0.5)] active:scale-95"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <span>Send</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="text-center mt-2">
            <span className="text-[10px] text-gray-600 font-mono tracking-wider">
              CITRUS AI WORKSPACE • v2.4.0
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPlayground;