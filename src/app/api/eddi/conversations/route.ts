import { NextResponse } from 'next/server';
import { db } from '@/db';
import { eddiConversations } from '@/app/db/drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { generateConversationTitle } from '@/lib/eddi/conversation-helpers';

// ============================================================================
// GET /api/eddi/conversations — List user's conversations
// ============================================================================

export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userConversations = await db.select()
            .from(eddiConversations)
            .where(eq(eddiConversations.userId, user.id))
            .orderBy(desc(eddiConversations.updatedAt))
            .limit(50);

        return NextResponse.json({ conversations: userConversations });
    } catch (error) {
        console.error('[eddi:conversations] Error listing conversations:', error);
        return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 });
    }
}

// ============================================================================
// POST /api/eddi/conversations — Create a new conversation
// ============================================================================

export async function POST(req: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const title = body.title
            ? generateConversationTitle(body.title)
            : 'New conversation';

        const newConversation = await db.insert(eddiConversations)
            .values({
                userId: user.id,
                title,
            })
            .returning();

        return NextResponse.json({ conversation: newConversation[0] });
    } catch (error) {
        console.error('[eddi:conversations] Error creating conversation:', error);
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }
}
