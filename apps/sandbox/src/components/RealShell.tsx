import React, { useState, useRef, useEffect, type KeyboardEvent } from 'react';

interface CommandHistoryEntry {
    command: string;
    output: string;
    exitCode: number;
    timestamp: number;
}

interface FileSystemState {
    files: Map<string, string>;
    cwd: string;
}

interface UndoEntry {
    command: string;
    previousState: FileSystemState;
    description: string;
}

export const RealShell: React.FC = () => {
    const [history, setHistory] = useState<CommandHistoryEntry[]>([]);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [input, setInput] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [cwd, setCwd] = useState('~');
    const [fileSystem, setFileSystem] = useState<Map<string, string>>(
        new Map([
            ['/home/readme.txt', 'Welcome to the shell!'],
            ['/home/test.txt', 'This is a test file.'],
        ])
    );
    const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
    const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom when history updates
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const saveState = (): FileSystemState => ({
        files: new Map(fileSystem),
        cwd
    });

    const restoreState = (state: FileSystemState) => {
        setFileSystem(new Map(state.files));
        setCwd(state.cwd);
    };

    const executeCommand = (cmd: string) => {
        if (!cmd.trim()) return;

        setIsExecuting(true);
        const timestamp = Date.now();

        // Add to command history for navigation
        setCommandHistory(prev => [...prev, cmd]);
        setHistoryIndex(-1);

        const parts = cmd.trim().split(/\s+/);
        const baseCmd = parts[0];
        const args = parts.slice(1);

        let output = '';
        let exitCode = 0;
        let isReversible = false;
        const previousState = saveState();

        try {
            switch (baseCmd) {
                case 'clear':
                    setHistory([]);
                    setIsExecuting(false);
                    return;

                case 'history':
                    output = commandHistory
                        .map((c, i) => `${i + 1}  ${c}`)
                        .join('\n');
                    break;

                case 'help':
                    output = `Available commands:
  
File System:
  ls [path]       - List files
  cat <file>      - Display file contents
  touch <file>    - Create empty file
  rm <file>       - Remove file
  echo <text>     - Print text
  pwd             - Print working directory

System:
  whoami          - Show current user
  date            - Show current date
  clear           - Clear screen
  history         - Show command history
  help            - Show this help

Undo/Redo:
  Ctrl+Z          - Undo last command
  Ctrl+Shift+Z    - Redo last undone command

Navigation:
  ↑/↓             - Navigate command history`;
                    break;

                case 'ls':
                    const path = args[0] || '/';
                    const files = Array.from(fileSystem.keys())
                        .filter(f => f.startsWith(path))
                        .map(f => f.replace(path, '').split('/').filter(Boolean)[0])
                        .filter((v, i, a) => a.indexOf(v) === i);
                    output = files.length > 0 ? files.join('\n') : 'No files found';
                    break;

                case 'cat':
                    if (args.length === 0) {
                        output = 'Usage: cat <filename>';
                        exitCode = 1;
                    } else {
                        const content = fileSystem.get(args[0]);
                        if (content !== undefined) {
                            output = content;
                        } else {
                            output = `cat: ${args[0]}: No such file`;
                            exitCode = 1;
                        }
                    }
                    break;

                case 'touch':
                    if (args.length === 0) {
                        output = 'Usage: touch <filename>';
                        exitCode = 1;
                    } else {
                        const newFS = new Map(fileSystem);
                        newFS.set(args[0], '');
                        setFileSystem(newFS);
                        isReversible = true;
                    }
                    break;

                case 'rm':
                    if (args.length === 0) {
                        output = 'Usage: rm <filename>';
                        exitCode = 1;
                    } else {
                        if (fileSystem.has(args[0])) {
                            const newFS = new Map(fileSystem);
                            newFS.delete(args[0]);
                            setFileSystem(newFS);
                            isReversible = true;
                        } else {
                            output = `rm: cannot remove '${args[0]}': No such file`;
                            exitCode = 1;
                        }
                    }
                    break;

                case 'echo':
                    output = args.join(' ');
                    break;

                case 'pwd':
                    output = cwd;
                    break;

                case 'whoami':
                    output = 'user';
                    break;

                case 'date':
                    output = new Date().toString();
                    break;

                default:
                    output = `Command not found: ${baseCmd}\nType 'help' for available commands`;
                    exitCode = 1;
            }

            // Add to undo stack if reversible
            if (isReversible) {
                setUndoStack(prev => [...prev, {
                    command: cmd,
                    previousState,
                    description: `Undo: ${cmd}`
                }]);
                setRedoStack([]); // Clear redo stack on new action
            }

            setHistory(prev => [...prev, {
                command: cmd,
                output,
                exitCode,
                timestamp
            }]);

        } catch (error: any) {
            setHistory(prev => [...prev, {
                command: cmd,
                output: error.message || 'Command execution failed',
                exitCode: 1,
                timestamp
            }]);
        }

        setIsExecuting(false);
    };

    const handleUndo = () => {
        if (undoStack.length === 0) {
            setHistory(prev => [...prev, {
                command: 'undo',
                output: 'Nothing to undo',
                exitCode: 1,
                timestamp: Date.now()
            }]);
            return;
        }

        const lastAction = undoStack[undoStack.length - 1];
        setUndoStack(prev => prev.slice(0, -1));

        // Restore previous state
        restoreState(lastAction.previousState);

        // Add to redo stack
        setRedoStack(prev => [...prev, lastAction]);

        setHistory(prev => [...prev, {
            command: 'undo',
            output: lastAction.description,
            exitCode: 0,
            timestamp: Date.now()
        }]);
    };

    const handleRedo = () => {
        if (redoStack.length === 0) {
            setHistory(prev => [...prev, {
                command: 'redo',
                output: 'Nothing to redo',
                exitCode: 1,
                timestamp: Date.now()
            }]);
            return;
        }

        const lastUndo = redoStack[redoStack.length - 1];
        setRedoStack(prev => prev.slice(0, -1));

        // Re-execute original command
        executeCommand(lastUndo.command);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // History navigation
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length === 0) return;

            const newIndex = historyIndex === -1
                ? commandHistory.length - 1
                : Math.max(0, historyIndex - 1);

            setHistoryIndex(newIndex);
            setInput(commandHistory[newIndex]);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex === -1) return;

            const newIndex = historyIndex + 1;
            if (newIndex >= commandHistory.length) {
                setHistoryIndex(-1);
                setInput('');
            } else {
                setHistoryIndex(newIndex);
                setInput(commandHistory[newIndex]);
            }
        }
        // Undo/Redo
        else if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            handleUndo();
        } else if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
            e.preventDefault();
            handleRedo();
        }
        // Clear screen
        else if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            setHistory([]);
        }
        // Cancel input
        else if (e.ctrlKey && e.key === 'c') {
            e.preventDefault();
            setInput('');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isExecuting) return;

        const cmd = input.trim();
        setInput('');
        executeCommand(cmd);
    };

    return (
        <div className="flex flex-col h-full bg-black text-green-400 font-mono text-sm">
            {/* Status Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 text-xs">
                <div className="flex items-center gap-4">
                    <span className="text-gray-400">CWD:</span>
                    <span className="text-green-400">{cwd}</span>
                </div>
                <div className="flex items-center gap-4 text-gray-400">
                    <span>History: {commandHistory.length}</span>
                    <span>Undo: {undoStack.length}</span>
                    <span>Redo: {redoStack.length}</span>
                </div>
            </div>

            {/* Terminal Output */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1" ref={scrollRef}>
                {history.slice(-50).map((entry, i) => (
                    <div key={i} className="space-y-1">
                        <div className="text-white">
                            <span className="text-green-600">user@sandbox</span>
                            <span className="text-gray-500">:</span>
                            <span className="text-blue-400">~</span>
                            <span className="text-gray-500">$ </span>
                            <span>{entry.command}</span>
                        </div>
                        {entry.output && (
                            <div className={`whitespace-pre-wrap pl-2 ${entry.exitCode === 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {entry.output}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-gray-800 bg-gray-900">
                <span className="text-green-600">user@sandbox</span>
                <span className="text-gray-500">:</span>
                <span className="text-blue-400">~</span>
                <span className="text-gray-500">$</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isExecuting}
                    className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-700 disabled:opacity-50"
                    placeholder="Type a command... (↑/↓ for history, Ctrl+Z to undo)"
                    autoFocus
                />
                {isExecuting && (
                    <span className="text-yellow-400 animate-pulse">Executing...</span>
                )}
            </form>

            {/* Help Text */}
            <div className="px-4 py-2 bg-gray-950 border-t border-gray-800 text-xs text-gray-500">
                <span className="mr-4">↑/↓: History</span>
                <span className="mr-4">Ctrl+Z: Undo</span>
                <span className="mr-4">Ctrl+Shift+Z: Redo</span>
                <span className="mr-4">Ctrl+L: Clear</span>
                <span>Ctrl+C: Cancel</span>
            </div>
        </div>
    );
};
