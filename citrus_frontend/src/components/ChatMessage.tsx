import React from "react";

interface ChatMessageProps {
  author: "user" | "assistant" | string;
  content: string;
  time?: string;
  highlight?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ author, content, time, highlight }) => {
  const isUser = author === "user";
  return (
    <div className={`message ${isUser ? "user" : "assistant"} mb-4 flex gap-3 items-end animate-fadeInUp ${highlight ? "ring-2 ring-primary/60" : ""}`}>
      {!isUser && (
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-lg">🍋</div>
      )}
      <div className={`glass p-4 rounded-glass shadow-glass max-w-[70vw] ${isUser ? "ml-auto" : ""}`}>
        <div className="message-header flex items-center gap-2 mb-1">
          <span className={`message-author text-xs font-bold ${isUser ? "text-primary" : "text-primary/80"}`}>{isUser ? "You" : "Citrus AI"}</span>
          {time && <span className="message-time text-xs text-gray-400 ml-2">{time}</span>}
        </div>
        <div className="message-content text-base font-body text-white/90 whitespace-pre-line">{content}</div>
      </div>
      {isUser && (
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg ml-2">🧑</div>
      )}
    </div>
  );
};

export default ChatMessage;
