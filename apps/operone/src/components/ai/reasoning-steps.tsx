import { Brain, Zap, Eye, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// Re-export the type from the reasoning engine
export type ReasoningStep = {
  type: 'think' | 'act' | 'observe';
  content: string;
  timestamp: number;
  status?: 'completed' | 'in-progress' | 'pending' | 'failed';
  metadata?: any;
};

interface ReasoningStepsDisplayProps {
  steps: ReasoningStep[];
  className?: string;
}

const stepConfig = {
  think: {
    icon: Brain,
    label: 'Thinking',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  act: {
    icon: Zap,
    label: 'Acting',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  observe: {
    icon: Eye,
    label: 'Observing',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    borderColor: 'border-green-200 dark:border-green-800',
  },
};

export function ReasoningStepsDisplay({ steps, className }: ReasoningStepsDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!steps || steps.length === 0) {
    return null;
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  };

  return (
    <div className={cn('border rounded-lg bg-background', className)}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Reasoning Steps</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {steps.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-muted-foreground" />
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Steps */}
      {isExpanded && (
        <div className="border-t">
          {steps.map((step, index) => {
            const config = stepConfig[step.type];
            const Icon = config.icon;
            const isLast = index === steps.length - 1;

            return (
              <div
                key={`${step.type}-${step.timestamp}-${index}`}
                className={cn(
                  'flex items-start gap-3 p-3 border-b transition-colors',
                  config.bgColor,
                  !isLast && 'border-b'
                )}
              >
                {/* Step Icon */}
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full border',
                  config.borderColor,
                  config.bgColor
                )}>
                  <Icon className={cn('h-4 w-4', config.color)} />
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-xs font-medium', config.color)}>
                      {config.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(step.timestamp)}
                    </span>
                    {step.status && (
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        step.status === 'completed' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        step.status === 'in-progress' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                        step.status === 'pending' && 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
                        step.status === 'failed' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      )}>
                        {step.status}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-foreground break-words leading-relaxed">
                    {step.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Compact version for inline display
interface ReasoningStepsCompactProps {
  steps: ReasoningStep[];
  className?: string;
  maxSteps?: number;
}

export function ReasoningStepsCompact({ steps, className, maxSteps = 3 }: ReasoningStepsCompactProps) {
  if (!steps || steps.length === 0) {
    return null;
  }

  const displaySteps = steps.slice(-maxSteps);
  const hasMore = steps.length > maxSteps;

  return (
    <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
      <Brain className="h-3 w-3" />
      <span>Reasoning:</span>
      {displaySteps.map((step, index) => {
        const config = stepConfig[step.type];
        const Icon = config.icon;

        return (
          <div key={index} className="flex items-center gap-1">
            <Icon className={cn('h-3 w-3', config.color)} />
            <span className="truncate max-w-20">{step.content.slice(0, 30)}...</span>
          </div>
        );
      })}
      {hasMore && (
        <span className="text-muted-foreground">+{steps.length - maxSteps} more</span>
      )}
    </div>
  );
}
