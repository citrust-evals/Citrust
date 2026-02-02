import React, { useState, useRef, useEffect, useCallback } from 'react';
import { streamDualResponses, type ChatMessage, submitPreference } from '../api';
import { generateSessionId } from '../utils';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  ArrowUp,
  Paperclip,
  Code2,
  Lightbulb,
  Target,
  Zap,
  MessageSquare,
  Bot,
  User,
} from 'lucide-react';

interface DualResponse {
  id: number;
  content: string;
  model: string;
  isStreaming: boolean;
}

interface AutoResizeProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
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
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 56,
    maxHeight: 200,
  });

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
    adjustHeight(true);
    setIsLoading(true);
    setDualResponses([]);
    setSelectedResponse(null);

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ];
    setMessages(newMessages);

    try {
      const responses: DualResponse[] = [
        { id: 1, content: '', model: 'gemini-1.5-pro-latest', isStreaming: true },
        { id: 2, content: '', model: 'gemini-1.5-flash', isStreaming: true },
      ];
      setDualResponses(responses);

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
      setMessages([...messages, { role: 'assistant', content: selectedResp.content }]);

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

      setTimeout(() => {
        setDualResponses([]);
        setSelectedResponse(null);
      }, 500);
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    adjustHeight();
    textareaRef.current?.focus();
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-background-dark via-surface-dark to-background-dark">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full mix-blend-screen filter blur-[100px] opacity-25 animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-primary/3 rounded-full mix-blend-screen filter blur-[80px] opacity-20 animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {messages.length === 0 && dualResponses.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 backdrop-blur-sm">
                    <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                  </div>
                  <div className="absolute inset-0 w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/5 blur-xl"></div>
                </div>
                <h2 className="text-3xl font-bold text-white">Citrus AI Chat</h2>
                <p className="text-gray-400 max-w-md">
                  Compare responses from multiple models side-by-side and choose the best answer
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "flex gap-4 animate-fadeInUp",
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/30 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[70%] rounded-2xl p-5 backdrop-blur-sm transition-all duration-200",
                  msg.role === 'user'
                    ? 'bg-primary/10 border border-primary/20 rounded-tr-sm'
                    : 'bg-white/5 border border-white/10 rounded-tl-sm hover:bg-white/10'
                )}
              >
                <p className="text-gray-100 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-10 h-10 rounded-full bg-white/10 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
              )}
            </div>
          ))}

          {/* Dual Responses */}
          {dualResponses.length > 0 && (
            <div className="space-y-4 animate-fadeInUp">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MessageSquare className="w-4 h-4" />
                <span>Comparing Model Responses</span>
                {currentTraceId && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-white/5 font-mono text-xs">
                    {currentTraceId.slice(0, 8)}...
                  </span>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {dualResponses.map((response) => (
                  <div
                    key={response.id}
                    className={cn(
                      "rounded-2xl p-6 transition-all duration-300 cursor-pointer backdrop-blur-md",
                      "bg-black/40 border border-white/10 hover:border-white/20",
                      selectedResponse === response.id && "ring-2 ring-primary scale-[1.02] bg-primary/5",
                      !response.isStreaming && !selectedResponse && "hover:bg-white/5"
                    )}
                    onClick={() => !response.isStreaming && handleSelectResponse(response.id)}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-bold text-primary uppercase tracking-wide">
                        {response.model === 'gemini-1.5-pro-latest' ? 'Model A' : 'Model B'}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">{response.model}</span>
                      {response.isStreaming && (
                        <div className="flex gap-1 ml-auto">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-100 whitespace-pre-wrap leading-relaxed min-h-[100px]">
                      {response.content || (
                        <span className="text-gray-500 italic">Generating response...</span>
                      )}
                    </p>
                    {!response.isStreaming && !selectedResponse && (
                      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs text-gray-400">Click to select</span>
                        <Target className="w-4 h-4 text-gray-600" />
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

      {/* Input Section */}
      <div className="relative z-10 w-full pb-8 pt-4 px-6 bg-gradient-to-t from-background-dark via-background-dark/95 to-transparent">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && dualResponses.length === 0 && (
            <div className="flex items-center justify-center flex-wrap gap-2 mb-4 animate-fadeInUp">
              <QuickAction
                icon={<Code2 className="w-4 h-4" />}
                label="Generate Code"
                onClick={() => handleQuickAction("Help me write a function that...")}
              />
              <QuickAction
                icon={<Lightbulb className="w-4 h-4" />}
                label="Explain Concept"
                onClick={() => handleQuickAction("Explain the concept of...")}
              />
              <QuickAction
                icon={<Zap className="w-4 h-4" />}
                label="Optimize Code"
                onClick={() => handleQuickAction("How can I optimize this code...")}
              />
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="relative bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 hover:border-white/20 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300 shadow-2xl shadow-black/50">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask anything or compare model responses..."
                className={cn(
                  "w-full px-5 py-4 resize-none border-none",
                  "bg-transparent text-white text-base",
                  "focus-visible:ring-0 focus-visible:ring-offset-0",
                  "placeholder:text-gray-500 min-h-[56px]"
                )}
                style={{ overflow: 'hidden' }}
                disabled={isLoading}
              />

              <div className="flex items-center justify-between px-4 pb-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>

                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-200",
                    "bg-primary hover:bg-primary/90 text-background-dark font-bold",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "shadow-[0_0_15px_rgba(202,255,97,0.3)] hover:shadow-[0_0_25px_rgba(202,255,97,0.5)]",
                    "active:scale-95"
                  )}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin"></div>
                      <span className="text-sm">Generating</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">Send</span>
                      <ArrowUp className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          <div className="text-center mt-3">
            <p className="text-[10px] text-gray-600 font-mono tracking-widest">
              CITRUS AI • MULTI-MODEL COMPARISON • v2.4.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function QuickAction({ icon, label, onClick }: QuickActionProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border-white/10 bg-black/40 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 backdrop-blur-sm transition-all duration-200 text-xs h-9"
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
}

export default ChatPlayground;