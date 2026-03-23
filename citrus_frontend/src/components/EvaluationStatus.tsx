import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';

export interface EvaluationStatusProps {
  score: number | null;
  metric: string;
  isDP?: boolean;
  epsilon?: number;
}

export const EvaluationStatus: React.FC<EvaluationStatusProps> = ({ 
  score, 
  metric, 
  isDP = false, 
  epsilon = 1.0 
}) => {
  if (score === null) {
    return <span className="text-gray-400 text-xs">No Eval</span>;
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/5 px-2 py-1 rounded border border-white/10">
      <span className="text-white">
        {metric}: <span className="font-bold">{score.toFixed(2)}</span>
      </span>
      {isDP && (
        <>
          <span className="text-[#FFB800] font-bold">[DP]</span>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-3 h-3 text-gray-400 hover:text-white transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              This score was generated using VaultGemma-1B with Differential Privacy (ε={epsilon}).
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
};
