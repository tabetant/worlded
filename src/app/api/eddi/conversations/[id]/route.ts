import { NextResponse } from 'next/server';
import { db } from '@/db';
import { eddiConversations, eddiMessages } from '@/app/db/drizzle/schema';
import { eq, and, asc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';

// ============================================================================
// GET /api/eddi/conversations/[id] — Get conversation with messages
// ============================================================================

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Verify ownership
        const conversation = await db.select()
            .from(eddiConversations)
            .where(and(
                eq(eddiConversations.id, id),
                eq(eddiConversations.userId, user.id)
            ))
            .limit(1);

        if (conversation.length === 0) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        // Get messages in chronological order
        const conversationMessages = await db.select()
            .from(eddiMessages)
            .where(eq(eddiMessages.conversationId, id))
            .orderBy(asc(eddiMessages.createdAt));

        return NextResponse.json({
            conversation: conversation[0],
            messages: conversationMessages,
        });
    } catch (error) {
        console.error('[eddi:conversations] Error loading conversation:', error);
        return NextResponse.json({ error: 'Failed to load conversation' }, { status: 500 });
    }
}

// ============================================================================
// DELETE /api/eddi/conversations/[id] — Delete conversation (cascade deletes messages)
// ============================================================================

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Verify ownership before deleting
        const conversation = await db.select()
            .from(eddiConversations)
            .where(and(
                eq(eddiConversations.id, id),
                eq(eddiConversations.userId, user.id)
            ))
            .limit(1);

        if (conversation.length === 0) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        // Delete — cascade will remove messages too
        await db.delete(eddiConversations)
            .where(eq(eddiConversations.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[eddi:conversations] Error deleting conversation:', error);
        return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
    }
}
