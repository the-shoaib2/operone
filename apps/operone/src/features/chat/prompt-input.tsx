import * as React from "react"
import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"

import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputModelSelector,
  type ModelInfo,
  type ModelCategory,
} from "@/components/ai/prompt-input"
import { ChatModeDropdown, type ChatMode } from "@/components/ai/chat-mode-selector"
import { PaperclipButton } from "@/components/ai/paperclip-button"
import { MicButton } from "@/components/ai/mic-button"
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
  chatMode?: ChatMode;
  onChatModeChange?: (mode: ChatMode) => void;
  onFocus?: () => void;
}


// Optimized ChatPromptInput Component with memoization
export const ChatPromptInput = React.memo(function ChatPromptInput({
  input,
  setInput,
  selectedModel,
  setSelectedModel,
  onSubmit,
  status,
  chatMode = 'chat',
  onChatModeChange,
  onFocus,
}: ChatPromptInputProps) {
  const { availableModels } = useModelDetector();
  const navigate = useNavigate();

  const handleAddModel = useCallback(() => {
    navigate('/settings/models/add');
  }, [navigate]);

  const handleSubmit = useCallback((message: { text: string; files: any[] }, event: React.FormEvent<HTMLFormElement>) => {
    onSubmit(message, event);
  }, [onSubmit]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.currentTarget.value);
  }, [setInput]);

  // Transform available models to ModelInfo format
  const transformedModels = useMemo(() => {
    return availableModels.map((model: any): ModelInfo => {
      // Determine category based on model name/description
      let category: ModelCategory = "text";
      const name = model.name?.toLowerCase() || model.id?.toLowerCase() || "";
      const description = model.description?.toLowerCase() || "";

      if (name.includes("dall-e") || name.includes("midjourney") || name.includes("stable diffusion") ||
        name.includes("image") || description.includes("image")) {
        category = "image";
      } else if (name.includes("whisper") || name.includes("tts") || name.includes("audio") ||
        description.includes("audio") || description.includes("speech")) {
        category = "audio";
      } else if (name.includes("video") || description.includes("video")) {
        category = "video";
      } else if (name.includes("gpt-4") || name.includes("claude") || name.includes("gemini") ||
        name.includes("multimodal") || description.includes("vision") || description.includes("image analysis")) {
        category = "multimodal";
      } else if (name.includes("codex") || name.includes("code") || name.includes("copilot") ||
        description.includes("code") || description.includes("programming")) {
        category = "code";
      }

      const isPremium = model.provider !== 'ollama';
      const isNew = model.isNew || false;

      return {
        id: model.id,
        name: model.name || model.id,
        category,
        description: model.description,
        provider: model.provider,
        isPremium,
        isNew,
      };
    });
  }, [availableModels]);

  return (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea
        data-testid="chat-input"
        value={input}
        onChange={handleInputChange}
        onFocus={onFocus}
        className="text-sm"
        rows={1}
      />
      <PromptInputFooter>
        <PromptInputTools>
          <PaperclipButton size="sm" />
          <MicButton size="sm" />
          <PromptInputModelSelector
            models={transformedModels}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            onAddModel={handleAddModel}
            maxContentHeight="200px"
            maxContentWidth="200px"
            showCategories={true}
            className="min-w-[120px]"
          />
          {onChatModeChange && (
            <ChatModeDropdown
              mode={chatMode}
              onModeChange={onChatModeChange}
              placeholder="Mode"
              maxContentHeight="200px"
              maxContentWidth="160px"
              className="min-w-[80px]"
            />
          )}
        </PromptInputTools>
        <PromptInputSubmit data-testid="send-button" disabled={!input.trim()} status={status} />
      </PromptInputFooter>
    </PromptInput>
  );
});
