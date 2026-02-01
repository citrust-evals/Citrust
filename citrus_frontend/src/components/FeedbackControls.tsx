import React from "react";

interface FeedbackControlsProps {
  onFeedback: (thumbs: "up" | "down") => void;
  disabled?: boolean;
}

const FeedbackControls: React.FC<FeedbackControlsProps> = ({ onFeedback, disabled }) => (
  <div className="flex gap-2 mt-2">
    <button
      className="rounded-full bg-success/20 text-success px-3 py-1 font-bold hover:bg-success/40 transition disabled:opacity-40"
      onClick={() => onFeedback("up")}
      disabled={disabled}
      title="Thumbs Up"
    >
      👍
    </button>
    <button
      className="rounded-full bg-error/20 text-error px-3 py-1 font-bold hover:bg-error/40 transition disabled:opacity-40"
      onClick={() => onFeedback("down")}
      disabled={disabled}
      title="Thumbs Down"
    >
      👎
    </button>
  </div>
);

export default FeedbackControls;
