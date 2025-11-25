import * as React from "react"
import { useCallback, useMemo } from "react"
import { Loader2, ArrowUp, Mic } from "lucide-react"

import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputSelect,
  PromptInputSelectTrigger,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectValue,
} from "@/components/ai/prompt-input"
import { useModelDetector } from "@/contexts"
import type { ChatStatus } from "ai"

// Types
interface ChatPromptInputProps {
  input: string;
  setInput: (value: string) => void;
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  onSubmit: (message: { text: string; files: any[] }, event: React.FormEvent<HTMLFormElement>) => void;
  status: ChatStatus;
}


// Optimized ChatPromptInput Component with memoization
export const ChatPromptInput = React.memo(function ChatPromptInput({
  input,
  setInput,
  selectedModel,
  setSelectedModel,
  onSubmit,
  status,
}: ChatPromptInputProps) {
  const { availableModels, isLoading, isOllamaAvailable, getAuthStatus } = useModelDetector();

  const handleSubmit = useCallback((message: { text: string; files: any[] }, event: React.FormEvent<HTMLFormElement>) => {
    onSubmit(message, event);
  }, [onSubmit]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.currentTarget.value);
  }, [setInput]);

  const ollamaModels = useMemo(() => 
    availableModels.filter((model: any) => model.provider === 'ollama'),
    [availableModels]
  );

  const cloudModels = useMemo(() => 
    availableModels.filter((model: any) => model.provider !== 'ollama'),
    [availableModels]
  );

  return (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea
        value={input}
        onChange={handleInputChange}
        placeholder="Type your message..."
        className="resize-none"
        rows={3}
      />
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputButton variant="ghost" size="sm">
            <ArrowUp className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </PromptInputButton>
          <PromptInputButton variant="ghost" size="sm">
            <Mic className="h-4 w-4" />
            <span className="sr-only">Voice input</span>
          </PromptInputButton>
          <PromptInputSelect
            value={selectedModel}
            onValueChange={setSelectedModel}
            disabled={isLoading}
          >
            <PromptInputSelectTrigger>
              <PromptInputSelectValue>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  availableModels.find((m: any) => m.id === selectedModel)?.name || "Select model"
                )}
              </PromptInputSelectValue>
            </PromptInputSelectTrigger>
            <PromptInputSelectContent>
              {isOllamaAvailable && ollamaModels.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                    Local Models (Ollama)
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-xs text-green-600">Connected</span>
                    </div>
                  </div>
                  {ollamaModels.map((model: any) => (
                    <PromptInputSelectItem key={model.id} value={model.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col">
                          <span className="font-medium">{model.name}</span>
                          <span className="text-xs text-muted-foreground">{model.description}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-xs text-green-600">Local</span>
                        </div>
                      </div>
                    </PromptInputSelectItem>
                  ))}
                </>
              )}
              
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                Cloud Models
              </div>
              {cloudModels.map((model: any) => {
                const authStatus = getAuthStatus(model.id);
                return (
                  <PromptInputSelectItem key={model.id} value={model.id}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-muted-foreground">{model.description}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {authStatus === 'authenticated' && (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-xs text-green-600">Connected</span>
                          </>
                        )}
                        {authStatus === 'pending' && (
                          <>
                            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                            <span className="text-xs text-yellow-600">Auth Required</span>
                          </>
                        )}
                        {authStatus === 'failed' && (
                          <>
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            <span className="text-xs text-red-600">Failed</span>
                          </>
                        )}
                      </div>
                    </div>
                  </PromptInputSelectItem>
                );
              })}
              
              {availableModels.length === 0 && !isLoading && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                  No models available. Start Ollama or configure cloud models.
                </div>
              )}
              
              {!isOllamaAvailable && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground text-center border-t">
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <span>Ollama not detected. Start Ollama to use local models.</span>
                  </div>
                </div>
              )}
            </PromptInputSelectContent>
          </PromptInputSelect>
        </PromptInputTools>
        <PromptInputSubmit disabled={!input.trim()} status={status} />
      </PromptInputFooter>
    </PromptInput>
  );
});
