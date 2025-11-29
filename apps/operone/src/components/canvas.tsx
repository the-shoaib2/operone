
import { X, CheckCircle2, Circle, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChatPanel } from "../features/chat/chat-layout";

export interface PlanStep {
    id: string;
    title: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    description?: string;
}

export interface CanvasProps {
    isOpen: boolean;
    onClose: () => void;
    plan?: {
        goal: string;
        steps: PlanStep[];
    };
    currentStepId?: string;
}

export function Canvas({ isOpen, onClose, plan, currentStepId }: CanvasProps) {
    if (!plan) return null;

    return (
        <ChatPanel isOpen={isOpen} width="400px" className="border-l">
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold text-lg">Task Plan</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">GOAL</h3>
                        <p className="text-sm">{plan.goal}</p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground">STEPS</h3>
                        <div className="space-y-3">
                            {plan.steps.map((step, index) => {
                                const isCurrent = step.id === currentStepId;
                                const isCompleted = step.status === 'completed';
                                const isPending = step.status === 'pending';
                                const isInProgress = step.status === 'in-progress';
                                const isFailed = step.status === 'failed';

                                return (
                                    <div
                                        key={step.id}
                                        className={cn(
                                            "flex gap-3 p-3 rounded-lg border transition-colors",
                                            isCurrent ? "bg-accent border-primary/50" : "bg-card",
                                            isCompleted ? "opacity-70" : ""
                                        )}
                                    >
                                        <div className="mt-0.5">
                                            {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                            {isPending && <Circle className="w-4 h-4 text-muted-foreground" />}
                                            {isInProgress && <Clock className="w-4 h-4 text-blue-500 animate-pulse" />}
                                            {isFailed && <X className="w-4 h-4 text-red-500" />}
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className={cn("text-sm font-medium", isCompleted && "line-through")}>
                                                    Step {index + 1}
                                                </span>
                                                {isCurrent && (
                                                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                            <p className={cn("text-sm", isCompleted && "line-through text-muted-foreground")}>
                                                {step.title}
                                            </p>
                                            {step.description && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {step.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </ScrollArea>

            <div className="p-4 border-t bg-muted/20">
                <Button className="w-full gap-2" variant="outline" onClick={() => { }}>
                    View Full Task Details
                    <ArrowRight className="w-4 h-4" />
                </Button>
            </div>
        </ChatPanel>
    );
}
