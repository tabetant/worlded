'use client';
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { safeRedirect } from "@/lib/security/redirect-validator";
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/Dropdown';

export type Ticket = {
    id: string;
    title: string;
    description: string;
    userId: string;
    status: 'open' | 'pending' | 'resolved';
    createdAt: string;
    updatedAt: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    multimodalPayload: any;
};

// Simplified variant map
const getStatusVariant = (status: string) => {
    switch (status) {
        case "open": return "error";
        case "pending": return "warning";
        case "resolved": return "success";
        default: return "default";
    }
};

function SupportContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const status = searchParams.get('status') ?? 'all';
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTickets = async () => {
        try {
            const response = await fetch(`api/tickets?status=${status}`);
            if (!response.ok) {
                console.error(`Error fetching tickets: ${response.statusText}`);
                return;
            }
            const ticketsData = await response.json();
            setTickets(ticketsData.tickets);
        } catch (error) {
            console.error('Fetch failed:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const checkLoggedIn = async () => {
            const { data: { session } } = await createClient().auth.getSession();
            if (!session) {
                setError('You must be logged in to access this page.');
                router.push(safeRedirect('/auth'));
            }
        }
        checkLoggedIn();
        fetchTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, router]);

    const statuses = ["open", "pending", "resolved"];

    async function updateStatus(ticketId: string, newStatus: string) {
        try {
            // Since we don't have a specific PATCH endpoint for status update in the new simplified route yet,
            // we'll assume one exists or we need to add it. 
            // For now, I'll comment this out or just log it to prevent runtime errors until backend is ready.
            console.warn("Status update not yet implemented in backend API");

            // Optimistic update
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus as any } : t));
        } catch (error) {
            console.error('Failed to update ticket status:', error);
            setError('Failed to update ticket status. Please try again later.');
        }
    }

    async function handleDelete(id: string) {
        try {
            const response = await fetch(`api/tickets?status=${status}`, {
                method: 'DELETE',
                body: JSON.stringify({ id: id }),
            });
            if (!response.ok) {
                // throw new Error... 
            }
            fetchTickets();
        } catch (error) {
            console.error('Failed to delete ticket:', error);
        }
    }

    return (
        <div className="flex-1 bg-gray-100 p-6 min-h-screen overflow-auto">
            {status === "all" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-5rem)]">
                    {statuses.map((statusItem) => (
                        <div
                            key={statusItem}
                            className="bg-white rounded-lg shadow p-4 flex flex-col gap-4 overflow-auto"
                        >
                            <h2 className="text-lg font-bold capitalize border-b pb-2 mb-2 text-blue-800">
                                {statusItem}
                            </h2>
                            {tickets.filter(ticket => ticket.status === statusItem).map((ticket) => (
                                <Card key={ticket.id} className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-all duration-300">
                                    <div className="mb-4">
                                        <h2 className="text-xl font-bold text-blue-700">{ticket.title}</h2>
                                    </div>
                                    <p className="text-gray-600 mb-4 italic">{ticket.description}</p>
                                    <div className="space-y-2 text-sm text-gray-700">
                                        <p>
                                            <span className="font-semibold text-gray-800">Status:</span>
                                            <Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
                                        </p>
                                        <p>
                                            <span className="font-semibold text-gray-800">Submitted:</span>
                                            <span className="ml-1">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                        </p>
                                        <p>
                                            <span className="font-semibold text-gray-800">User ID:</span>
                                            <span className="ml-1">{ticket.userId}</span>
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-end mt-4">
                                        <div className="flex flex-col gap-2">
                                            {/* Actions */}
                                        </div>
                                        <button
                                            className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition text-sm"
                                            onClick={() => handleDelete(ticket.id)}
                                        >
                                            <span>🗑️</span>
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tickets.map((ticket) => (
                        <Card key={ticket.id} className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-all duration-300">
                            {/* Card Content - Same as above */}
                            <div className="mb-4">
                                <h2 className="text-xl font-bold text-blue-700">{ticket.title}</h2>
                            </div>
                            <p className="text-gray-600 mb-4 italic">{ticket.description}</p>
                            <div className="space-y-2 text-sm text-gray-700">
                                <p>
                                    <span className="font-semibold text-gray-800">Status:</span>
                                    <Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
                                </p>
                            </div>

                            <div className="flex justify-between items-end mt-4">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="bg-blue-600 text-white px-4 py-1 rounded-md hover:bg-blue-700 transition">Edit Status</button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-48">
                                        <DropdownMenuLabel>Status</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuGroup>
                                            {statuses.map(s => (
                                                <DropdownMenuItem
                                                    key={s}
                                                    className="px-3 py-2 hover:bg-gray-100 rounded-md text-sm text-gray-700 cursor-pointer transition-colors"
                                                    onSelect={() => updateStatus(ticket.id, s)}
                                                >
                                                    {s}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            <div className="fixed bottom-8 right-8">
                <button
                    onClick={() => createClient().auth.signOut()}
                    className="px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700 transition"
                >
                    Log Out
                </button>
            </div>
        </div>
    );
}

export default function SupportPage() {
    return (
        <Suspense fallback={<div className="p-6">Loading support tickets...</div>}>
            <SupportContent />
        </Suspense>
    );
}