"use client";

import React, { useMemo, memo } from "react";
import { MessageResponse } from "./message";
import { CodeBlock, CodeBlockCopyButton } from "./code-block";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "./tool";
import { Artifact, ArtifactHeader, ArtifactTitle, ArtifactContent, ArtifactActions, ArtifactAction } from "./artifact";
import { CopyIcon, DownloadIcon } from "lucide-react";
import type { BundledLanguage } from "shiki";

// Types
export interface ToolCall {
    id: string;
    type: string;
    state: 'input-streaming' | 'input-available' | 'approval-requested' | 'approval-responded' | 'output-available' | 'output-error' | 'output-denied';
    input?: any;
    output?: any;
    errorText?: string;
}

export interface ArtifactData {
    id: string;
    type: string;
    title: string;
    content: string;
    language?: string;
}

export interface EnhancedMessageRendererProps {
    content: string;
    isStreaming?: boolean;
    toolCalls?: ToolCall[];
    artifacts?: ArtifactData[];
    onCopy?: () => void;
    onRetry?: () => void;
}

// Code block detection regex
const CODE_BLOCK_REGEX = /```(\w+)?\n([\s\S]*?)```/g;

// Parse content to extract code blocks
function parseContent(content: string) {
    const codeBlocks: Array<{ language: string; code: string; index: number }> = [];
    let match;

    // Reset regex state
    CODE_BLOCK_REGEX.lastIndex = 0;

    while ((match = CODE_BLOCK_REGEX.exec(content)) !== null) {
        codeBlocks.push({
            language: match[1] || 'text',
            code: (match[2] || '').trim(),
            index: match.index,
        });
    }

    return { codeBlocks };
}

// Render content with code blocks replaced by components
function renderContentWithCodeBlocks(content: string, isStreaming: boolean = false) {
    const { codeBlocks } = parseContent(content);

    // If no code blocks, just render markdown
    if (codeBlocks.length === 0) {
        return <MessageResponse>{content}</MessageResponse>;
    }

    // If streaming and content ends with incomplete code block, render as-is
    if (isStreaming && content.trimEnd().endsWith('```')) {
        return <MessageResponse>{content}</MessageResponse>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    codeBlocks.forEach((block, idx) => {
        // Add text before code block
        if (block.index > lastIndex) {
            const textBefore = content.substring(lastIndex, block.index);
            if (textBefore.trim()) {
                parts.push(
                    <MessageResponse key={`text-${idx}`}>
                        {textBefore}
                    </MessageResponse>
                );
            }
        }

        // Add code block
        const fullMatch = content.substring(block.index).match(/```(\w+)?\n([\s\S]*?)```/);
        if (fullMatch) {
            parts.push(
                <div key={`code-${idx}`} className="my-4">
                    <CodeBlock
                        code={block.code}
                        language={block.language as BundledLanguage}
                        showLineNumbers={block.code.split('\n').length > 10}
                    >
                        <CodeBlockCopyButton />
                    </CodeBlock>
                </div>
            );
            lastIndex = block.index + fullMatch[0].length;
        }
    });

    // Add remaining text after last code block
    if (lastIndex < content.length) {
        const textAfter = content.substring(lastIndex);
        if (textAfter.trim()) {
            parts.push(
                <MessageResponse key="text-final">
                    {textAfter}
                </MessageResponse>
            );
        }
    }

    return <div className="space-y-2">{parts}</div>;
}

/**
 * Enhanced Message Renderer
 * 
 * Intelligently renders AI messages with support for:
 * - Markdown rendering via MessageResponse (Streamdown)
 * - Code block syntax highlighting
 * - Tool call visualization
 * - Artifact display
 * - Streaming content
 */
export const EnhancedMessageRenderer = memo(({
    content,
    isStreaming = false,
    toolCalls = [],
    artifacts = [],
}: EnhancedMessageRendererProps) => {

    // Memoize rendered content
    const renderedContent = useMemo(() => {
        return renderContentWithCodeBlocks(content, isStreaming);
    }, [content, isStreaming]);

    return (
        <div className="space-y-4">
            {/* Main content */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
                {renderedContent}
            </div>

            {/* Tool calls */}
            {toolCalls.length > 0 && (
                <div className="space-y-2">
                    {toolCalls.map((toolCall) => (
                        <Tool key={toolCall.id}>
                            <ToolHeader
                                title={toolCall.type}
                                type={toolCall.type as any}
                                state={toolCall.state as any}
                            />
                            <ToolContent>
                                {toolCall.input && <ToolInput input={toolCall.input} />}
                                {(toolCall.output || toolCall.errorText) && (
                                    <ToolOutput
                                        output={toolCall.output}
                                        errorText={toolCall.errorText}
                                    />
                                )}
                            </ToolContent>
                        </Tool>
                    ))}
                </div>
            )}

            {/* Artifacts */}
            {artifacts.length > 0 && (
                <div className="space-y-2">
                    {artifacts.map((artifact) => (
                        <Artifact key={artifact.id}>
                            <ArtifactHeader>
                                <ArtifactTitle>{artifact.title}</ArtifactTitle>
                                <ArtifactActions>
                                    <ArtifactAction
                                        icon={CopyIcon}
                                        tooltip="Copy"
                                        onClick={() => navigator.clipboard.writeText(artifact.content)}
                                    />
                                    <ArtifactAction
                                        icon={DownloadIcon}
                                        tooltip="Download"
                                        onClick={() => {
                                            const blob = new Blob([artifact.content], { type: 'text/plain' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `${artifact.title}.${artifact.language || 'txt'}`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                    />
                                </ArtifactActions>
                            </ArtifactHeader>
                            <ArtifactContent>
                                {artifact.language ? (
                                    <CodeBlock
                                        code={artifact.content}
                                        language={artifact.language as BundledLanguage}
                                        showLineNumbers
                                    >
                                        <CodeBlockCopyButton />
                                    </CodeBlock>
                                ) : (
                                    <pre className="whitespace-pre-wrap text-sm">{artifact.content}</pre>
                                )}
                            </ArtifactContent>
                        </Artifact>
                    ))}
                </div>
            )}
        </div>
    );
});

EnhancedMessageRenderer.displayName = "EnhancedMessageRenderer";
