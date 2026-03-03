"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, Bell, User, Sparkles, Menu, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EddiChat } from '@/components/dashboard/EddiChat';
import { SearchBar } from '@/components/layout/SearchBar';
import { motion, AnimatePresence } from 'framer-motion';

interface AppShellProps {
    children: React.ReactNode;
    /** Pass true from server layout when the current user is an admin */
    isAdmin?: boolean;
}

export function AppShell({ children, isAdmin: isAdminUser = false }: AppShellProps) {
    const [isEddiOpen, setIsEddiOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    // Skip navbar on auth page
    const isAuthPage = pathname === '/auth';

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
        { id: 'courses', label: 'Courses', href: '/courses' },
        { id: 'progress', label: 'My Progress', href: '/progress' },
        { id: 'resources', label: 'Resources', href: '/resources' },
        // Conditionally include admin link
        ...(isAdminUser
            ? [{ id: 'admin', label: 'Admin', href: '/admin' }]
            : []
        ),
    ];

    const isActive = (href: string) => {
        if (href === '/dashboard') {
            return pathname === '/dashboard' || pathname === '/';
        }
        return pathname.startsWith(href);
    };

    if (isAuthPage) {
        return <>{children}</>;
    }

    return (
        <>
            {/* Navigation Bar */}
            <nav className="bg-white border-b border-border sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Left: Logo */}
                        <div className="flex items-center gap-2">
                            <Link href="/dashboard" className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-lg flex items-center justify-center shadow-lg">
                                    <Globe className="text-white" size={24} />
                                </div>
                                <div className="hidden sm:block">
                                    <h1 className="text-xl font-bold text-foreground">WorldEd</h1>
                                    <p className="text-xs text-muted-foreground -mt-1">Master anything, anywhere</p>
                                </div>
                            </Link>
                        </div>

                        {/* Center: Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-6">
                            {navItems.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={`
                    text-sm font-medium transition-colors pb-1 flex items-center gap-1
                    ${item.id === 'admin'
                                            ? (isActive(item.href) ? 'text-red-600 border-b-2 border-red-500' : 'text-red-500/70 hover:text-red-600')
                                            : (isActive(item.href)
                                                ? 'text-primary border-b-2 border-primary'
                                                : 'text-muted-foreground hover:text-foreground')
                                        }
                  `}
                                >
                                    {item.id === 'admin' && <Shield size={14} />}
                                    {item.label}
                                </Link>
                            ))}
                        </div>

                        {/* Search Bar - Desktop only */}
                        <div className="hidden lg:block w-80">
                            <SearchBar />
                        </div>

                        {/* Right Section */}
                        <div className="flex items-center gap-3">
                            {/* Eddi AI Button */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEddiOpen(true)}
                                className="bg-gradient-to-r from-[var(--worlded-purple)] to-[var(--worlded-pink)] text-white hover:opacity-90 shadow-md"
                            >
                                <Sparkles size={16} />
                                <span className="hidden sm:inline ml-2">Ask Eddi</span>
                            </Button>

                            {/* Notifications */}
                            <button className="p-2 hover:bg-muted rounded-lg transition-colors relative hidden sm:flex">
                                <Bell size={20} className="text-muted-foreground" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full"></span>
                            </button>

                            {/* User Avatar */}
                            <button className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white hover:opacity-90 transition-opacity shadow-sm">
                                <User size={18} />
                            </button>

                            {/* Mobile Menu Button */}
                            <button
                                className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
                                onClick={() => setIsMobileMenuOpen(true)}
                            >
                                <Menu size={20} className="text-muted-foreground" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Drawer */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/20 z-40 md:hidden"
                        />
                        <motion.div
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed left-0 top-0 bottom-0 w-72 bg-white shadow-2xl z-50 md:hidden flex flex-col"
                        >
                            <div className="flex items-center justify-between p-4 border-b">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                                        <Globe className="text-white" size={18} />
                                    </div>
                                    <span className="font-bold text-foreground">WorldEd</span>
                                </div>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-muted rounded-lg">
                                    <X size={20} className="text-muted-foreground" />
                                </button>
                            </div>

                            <div className="flex-1 p-4">
                                <nav className="space-y-1">
                                    {navItems.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={`
                        block px-4 py-3 rounded-lg text-sm font-medium transition-colors
                        ${isActive(item.href)
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                }
                      `}
                                        >
                                            {item.label}
                                        </Link>
                                    ))}
                                </nav>
                            </div>

                            <div className="p-4 border-t">
                                <Button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        setIsEddiOpen(true);
                                    }}
                                    className="w-full bg-gradient-to-r from-[var(--worlded-purple)] to-[var(--worlded-pink)] text-white"
                                >
                                    <Sparkles size={16} className="mr-2" />
                                    Ask Eddi
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main>
                {children}
            </main>

            {/* Eddi Chat Modal */}
            <EddiChat
                isOpen={isEddiOpen}
                onClose={() => setIsEddiOpen(false)}
            />
        </>
    );
}
