"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen, FileText, X, Command } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { safeRedirect } from "@/lib/security/redirect-validator";

interface SearchResult {
    type: "course" | "module";
    id: string;
    title: string;
    description: string;
    href: string;
    icon: string | null;
}

export function SearchBar() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Debounced search
    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.results || []);
                }
            } catch {
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [query]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Keyboard shortcut: Cmd+K / Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                inputRef.current?.focus();
                setIsOpen(true);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
                inputRef.current?.blur();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Keyboard navigation in dropdown
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!isOpen || results.length === 0) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
            } else if (e.key === "Enter" && selectedIndex >= 0) {
                e.preventDefault();
                navigateTo(results[selectedIndex]);
            }
        },
        [isOpen, results, selectedIndex]
    );

    const navigateTo = (result: SearchResult) => {
        setQuery("");
        setResults([]);
        setIsOpen(false);
        setSelectedIndex(-1);
        router.push(safeRedirect(result.href));
    };

    const showDropdown = isOpen && (query.length >= 2 || results.length > 0);

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Search Input */}
            <div className="relative">
                <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    size={16}
                />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                        setSelectedIndex(-1);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search courses, modules..."
                    className="w-full pl-10 pr-20 py-2 text-sm bg-[var(--input-background)] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />

                {/* Keyboard hint + clear */}
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                    {query ? (
                        <button
                            onClick={() => {
                                setQuery("");
                                setResults([]);
                                inputRef.current?.focus();
                            }}
                            className="p-1 hover:bg-muted rounded transition-colors"
                        >
                            <X size={14} className="text-muted-foreground" />
                        </button>
                    ) : (
                        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-muted text-muted-foreground text-xs rounded border border-border font-mono">
                            <Command size={10} />K
                        </kbd>
                    )}
                </div>
            </div>

            {/* Results Dropdown */}
            <AnimatePresence>
                {showDropdown && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-border shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto"
                    >
                        {isLoading ? (
                            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                <div className="inline-block w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                                Searching...
                            </div>
                        ) : results.length > 0 ? (
                            <div className="py-1">
                                {/* Group by type */}
                                {results.some((r) => r.type === "course") && (
                                    <>
                                        <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Courses
                                        </p>
                                        {results
                                            .filter((r) => r.type === "course")
                                            .map((result) => {
                                                const idx = results.indexOf(result);
                                                return (
                                                    <button
                                                        key={result.id}
                                                        onClick={() => navigateTo(result)}
                                                        onMouseEnter={() => setSelectedIndex(idx)}
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${selectedIndex === idx
                                                            ? "bg-primary/5"
                                                            : "hover:bg-muted/50"
                                                            }`}
                                                    >
                                                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <BookOpen size={16} className="text-primary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-foreground truncate">
                                                                {result.title}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {result.description}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                    </>
                                )}

                                {results.some((r) => r.type === "module") && (
                                    <>
                                        <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t border-border mt-1">
                                            Modules
                                        </p>
                                        {results
                                            .filter((r) => r.type === "module")
                                            .map((result) => {
                                                const idx = results.indexOf(result);
                                                return (
                                                    <button
                                                        key={result.id}
                                                        onClick={() => navigateTo(result)}
                                                        onMouseEnter={() => setSelectedIndex(idx)}
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${selectedIndex === idx
                                                            ? "bg-primary/5"
                                                            : "hover:bg-muted/50"
                                                            }`}
                                                    >
                                                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <FileText size={16} className="text-orange-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-foreground truncate">
                                                                {result.title}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {result.description}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                    </>
                                )}
                            </div>
                        ) : query.length >= 2 ? (
                            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                No results found for &ldquo;{query}&rdquo;
                            </div>
                        ) : null}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
