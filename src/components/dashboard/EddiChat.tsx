"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Send, Bot, Loader2, ExternalLink, BookOpen, FileText, Sparkles, MessageSquarePlus, Trash2, ChevronLeft, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { safeRedirect } from "@/lib/security/redirect-validator";
import { buildEddiContext, type PageType } from "@/lib/eddi/context-helpers";

// ============================================================================
// TYPES
// ============================================================================

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    displayList?: {
        listTitle: string;
        items: { title: string; path?: string; description?: string }[];
    };
    isFeatureUnavailable?: boolean;
    featureSuggestion?: string;
}

interface ConversationSummary {
    id: string;
    title: string;
    updatedAt: string;
    createdAt: string;
}

interface ActionPayload {
    action: 'navigate' | 'launch_quiz' | 'display_list' | 'draft_ticket' | 'feature_unavailable';
    path?: string;
    scrollToQuiz?: boolean;
    listTitle?: string;
    items?: { title: string; path?: string; description?: string }[];
    feature?: string;
    message?: string;
    suggestion?: string;
    ticket?: { subject: string; body: string; priority: string };
}

interface EddiChatProps {
    isOpen: boolean;
    onClose: () => void;
}

// ============================================================================
// CONTEXT-AWARE SUGGESTIONS
// ============================================================================

function getSuggestionsForPage(pageType: PageType): { text: string }[] {
    switch (pageType) {
        case 'module':
            return [
                { text: "Help with this quiz" },
                { text: "Quiz me" },
                { text: "What's next?" },
                { text: "How am I doing?" },
            ];
        case 'course':
            return [
                { text: "Show me all modules" },
                { text: "How am I doing?" },
                { text: "Continue this course" },
            ];
        case 'dashboard':
            return [
                { text: "What's next?" },
                { text: "What should I review?" },
                { text: "How am I doing?" },
            ];
        default:
            return [
                { text: "Show me all courses" },
                { text: "What should I review?" },
                { text: "Help with calculus" },
            ];
    }
}

function getQuickActionsForPage(pageType: PageType): { label: string; icon: 'book' | 'file'; text: string }[] {
    switch (pageType) {
        case 'module':
            return [
                { label: "Help with quiz", icon: 'book', text: "I need help with this quiz" },
                { label: "What's next?", icon: 'file', text: "What's next?" },
                { label: "Quiz me", icon: 'file', text: "Quiz me on this module" },
            ];
        case 'course':
            return [
                { label: "Continue course", icon: 'book', text: "Continue this course" },
                { label: "My progress", icon: 'file', text: "How am I doing in this course?" },
            ];
        default:
            return [
                { label: "What should I review?", icon: 'book', text: "What should I review?" },
                { label: "Start a quiz", icon: 'file', text: "Take me to a quiz" },
            ];
    }
}

// ============================================================================
// HELPERS
// ============================================================================

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EddiChat({ isOpen, onClose }: EddiChatProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    // Conversation state
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [isLoadingConversations, setIsLoadingConversations] = useState(false);

    const router = useRouter();
    const pathname = usePathname();

    // Build context from current URL
    const eddiContext = useMemo(() => buildEddiContext(pathname), [pathname]);
    const suggestions = useMemo(() => getSuggestionsForPage(eddiContext.pageType), [eddiContext.pageType]);
    const quickActions = useMemo(() => getQuickActionsForPage(eddiContext.pageType), [eddiContext.pageType]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Load conversations list when chat opens
    const loadConversations = useCallback(async () => {
        setIsLoadingConversations(true);
        try {
            const response = await fetch('/api/eddi/conversations');
            if (response.ok) {
                const data = await response.json();
                setConversations(data.conversations || []);
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
        } finally {
            setIsLoadingConversations(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadConversations();
        }
    }, [isOpen, loadConversations]);

    // Load a specific conversation's messages
    const loadConversation = async (convId: string) => {
        try {
            const response = await fetch(`/api/eddi/conversations/${convId}`);
            if (response.ok) {
                const data = await response.json();
                const loadedMessages: Message[] = (data.messages || []).map(
                    (m: { id: string; role: string; content: string }, idx: number) => ({
                        id: m.id || `loaded-${idx}`,
                        role: m.role as 'user' | 'assistant',
                        content: m.content,
                    })
                );
                setMessages(loadedMessages);
                setConversationId(convId);
                setShowHistory(false);
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    };

    // Start a fresh conversation
    const startNewConversation = () => {
        setMessages([]);
        setConversationId(null);
        setShowHistory(false);
    };

    // Delete a conversation
    const deleteConversation = async (convId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent loading the conversation
        try {
            const response = await fetch(`/api/eddi/conversations/${convId}`, { method: 'DELETE' });
            if (response.ok) {
                setConversations(prev => prev.filter(c => c.id !== convId));
                if (convId === conversationId) {
                    startNewConversation();
                }
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setLoadingAction(null);

        try {
            const response = await fetch('/api/eddi/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                    conversationId,
                    context: {
                        currentPath: pathname,
                        pathname: eddiContext.pathname,
                        pageType: eddiContext.pageType,
                        courseId: eddiContext.courseId,
                        moduleId: eddiContext.moduleId,
                    },
                }),
            });

            if (!response.ok) {
                if (response.status === 429) {
                    const errorData = await response.json();
                    throw new Error(errorData.text || "Rate limit exceeded.");
                }
                throw new Error("Failed to get response from Eddi.");
            }

            const data = await response.json();

            // Debug logging
            console.log('=== EDDI FRONTEND RESPONSE ===', JSON.stringify(data, null, 2));

            // Track conversation ID (created on first message)
            if (data.conversationId && !conversationId) {
                setConversationId(data.conversationId);
                // Refresh conversation list to show the new one
                loadConversations();
            }

            // API returns "action" not "actionPayload"
            const actionPayload = data.action || data.actionPayload;

            if (actionPayload) {
                console.log('Action payload found:', actionPayload);
                handleAction(actionPayload, data.text);
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.text,
                displayList: actionPayload?.action === 'display_list'
                    ? { listTitle: actionPayload.listTitle, items: actionPayload.items }
                    : undefined,
                isFeatureUnavailable: actionPayload?.action === 'feature_unavailable',
                featureSuggestion: actionPayload?.suggestion,
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: error instanceof Error ? error.message : "Sorry, I encountered an error. Please try again.",
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            setLoadingAction(null);
        }
    };

    const handleAction = (actionPayload: ActionPayload, textResponse: string) => {
        switch (actionPayload.action) {
            case 'navigate':
                if (actionPayload.path) {
                    setLoadingAction(`Navigating to ${actionPayload.path}...`);
                    setTimeout(() => {
                        router.push(safeRedirect(actionPayload.path!));
                        onClose();
                    }, 500);
                }
                break;
            case 'launch_quiz':
                if (actionPayload.scrollToQuiz) {
                    setLoadingAction("Scrolling to quiz...");
                    setTimeout(() => {
                        const quizSection = document.getElementById('quiz-section');
                        if (quizSection) {
                            quizSection.scrollIntoView({ behavior: 'smooth' });
                        }
                        onClose();
                    }, 500);
                }
                break;
            case 'display_list':
                // Handled in message rendering
                break;
            case 'feature_unavailable':
                // Handled in message rendering
                break;
            default:
                break;
        }
    };

    const handleListItemClick = (path?: string) => {
        if (path) {
            router.push(safeRedirect(path));
            onClose();
        }
    };

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 z-40"
                    />

                    {/* Chat Panel - Slide from right */}
                    <motion.div
                        initial={{ opacity: 0, x: 400 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 400 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={`fixed right-0 top-0 bottom-0 bg-white shadow-2xl z-50 flex flex-col border-l border-border
                            ${isExpanded ? 'w-[800px]' : 'w-full sm:w-[400px]'}`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-[var(--worlded-purple)] to-[var(--worlded-pink)] text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                    <Sparkles className="text-white" size={20} />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-white">Eddi</h2>
                                    <p className="text-xs text-white/80">Your Learning Assistant</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {/* New Chat button */}
                                <button
                                    onClick={startNewConversation}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    title="New conversation"
                                >
                                    <MessageSquarePlus className="text-white" size={18} />
                                </button>
                                {/* History toggle */}
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-white/20' : 'hover:bg-white/10'}`}
                                    title="Conversation history"
                                >
                                    <History className="text-white" size={18} />
                                </button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-white hover:bg-white/20 hover:text-white hidden sm:flex"
                                    onClick={() => setIsExpanded(!isExpanded)}
                                >
                                    {isExpanded ? 'Collapse' : 'Expand'}
                                </Button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="text-white" size={20} />
                                </button>
                            </div>
                        </div>

                        {/* ============================================================ */}
                        {/* CONVERSATION HISTORY PANEL (slides over chat) */}
                        {/* ============================================================ */}
                        <AnimatePresence>
                            {showHistory && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="absolute top-[73px] left-0 right-0 bottom-0 bg-white z-10 flex flex-col"
                                >
                                    <div className="flex items-center justify-between px-4 py-3 border-b">
                                        <h3 className="text-sm font-semibold text-foreground">Conversation History</h3>
                                        <button
                                            onClick={() => setShowHistory(false)}
                                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <ChevronLeft size={16} className="inline mr-1" />
                                            Back
                                        </button>
                                    </div>

                                    {/* New Chat option at top */}
                                    <button
                                        onClick={startNewConversation}
                                        className="flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-dashed"
                                    >
                                        <div className="w-8 h-8 bg-gradient-to-r from-[var(--worlded-purple)] to-[var(--worlded-pink)] rounded-full flex items-center justify-center">
                                            <MessageSquarePlus className="text-white" size={14} />
                                        </div>
                                        <span className="text-sm font-medium text-primary">New conversation</span>
                                    </button>

                                    <div className="flex-1 overflow-y-auto">
                                        {isLoadingConversations ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="animate-spin text-muted-foreground" size={20} />
                                            </div>
                                        ) : conversations.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                                                <History className="w-10 h-10 mb-3 text-muted-foreground/30" />
                                                <p className="text-sm text-muted-foreground">No conversations yet</p>
                                                <p className="text-xs text-muted-foreground/60 mt-1">Start chatting and your history will appear here</p>
                                            </div>
                                        ) : (
                                            conversations.map((conv) => (
                                                <button
                                                    key={conv.id}
                                                    onClick={() => loadConversation(conv.id)}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b group
                                                        ${conversationId === conv.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate text-foreground">{conv.title}</p>
                                                        <p className="text-xs text-muted-foreground">{formatRelativeTime(conv.updatedAt)}</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => deleteConversation(conv.id, e)}
                                                        className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                                                        title="Delete conversation"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ============================================================ */}
                        {/* MESSAGES AREA */}
                        {/* ============================================================ */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground mt-10">
                                    <Sparkles className="w-12 h-12 mb-4 text-[var(--worlded-purple)]/30" />
                                    <p className="text-sm font-medium mb-2">Hi! I&apos;m Eddi, your learning assistant.</p>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        I can help you navigate courses, find content, start quizzes, and tutor you through tricky problems.
                                    </p>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {suggestions.map((s, idx) => (
                                            <SuggestionChip
                                                key={idx}
                                                text={s.text}
                                                onClick={() => setInput(s.text)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`
                                        max-w-[85%] rounded-2xl px-4 py-2.5
                                        ${msg.role === 'user'
                                            ? 'bg-primary text-white rounded-br-md'
                                            : 'bg-white border border-border rounded-bl-md shadow-sm'
                                        }
                                    `}>
                                        {msg.role === 'assistant' && (
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-5 h-5 bg-gradient-to-r from-[var(--worlded-purple)] to-[var(--worlded-pink)] rounded-full flex items-center justify-center">
                                                    <Sparkles className="text-white" size={12} />
                                                </div>
                                                <span className="text-xs font-medium text-muted-foreground">Eddi</span>
                                            </div>
                                        )}
                                        <p className={`text-sm leading-relaxed ${msg.role === 'user' ? 'text-white' : 'text-foreground'}`}>
                                            {msg.content}
                                        </p>

                                        {/* Display List */}
                                        {msg.displayList && (
                                            <div className="mt-3 space-y-2">
                                                <p className="text-xs font-medium text-muted-foreground">{msg.displayList.listTitle}</p>
                                                {msg.displayList.items.map((item, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleListItemClick(item.path)}
                                                        className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                                                    >
                                                        <BookOpen size={14} className="text-primary" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">{item.title}</p>
                                                            {item.description && (
                                                                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                                                            )}
                                                        </div>
                                                        <ExternalLink size={12} className="text-muted-foreground" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Feature Unavailable */}
                                        {msg.isFeatureUnavailable && msg.featureSuggestion && (
                                            <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                                                <p className="text-xs text-amber-700">{msg.featureSuggestion}</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {/* Loading Indicator */}
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex justify-start"
                                >
                                    <div className="bg-white border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                                        <div className="flex gap-1">
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                                                className="w-2 h-2 bg-muted-foreground/50 rounded-full"
                                            />
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                                                className="w-2 h-2 bg-muted-foreground/50 rounded-full"
                                            />
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                                                className="w-2 h-2 bg-muted-foreground/50 rounded-full"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        {messages.length <= 1 && (
                            <div className="px-4 py-2 border-t border-border bg-white">
                                <p className="text-xs text-muted-foreground mb-2">Quick Actions:</p>
                                <div className="flex gap-2 flex-wrap">
                                    {quickActions.map((action, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setInput(action.text)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 text-primary rounded-full text-xs font-medium hover:bg-primary/10 transition-colors"
                                        >
                                            {action.icon === 'book' ? <BookOpen size={14} /> : <FileText size={14} />}
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-4 border-t border-border bg-white">
                            <form onSubmit={handleSubmit} className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={handleInputChange}
                                    placeholder="Ask Eddi anything..."
                                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="w-10 h-10 bg-gradient-to-r from-[var(--worlded-purple)] to-[var(--worlded-pink)] text-white rounded-full flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-opacity shadow-md"
                                >
                                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SuggestionChip({ text, onClick }: { text: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="px-3 py-1.5 text-xs rounded-full bg-[var(--worlded-purple)]/5 hover:bg-[var(--worlded-purple)]/10 text-[var(--worlded-purple)] transition-colors border border-[var(--worlded-purple)]/20"
        >
            {text}
        </button>
    );
}
