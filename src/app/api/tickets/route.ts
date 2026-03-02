import { db } from "@/app/db";
import { NextResponse } from "next/server";
import { tickets } from "@/app/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { errorResponse } from "@/lib/errors/error-handler";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // Basic validation
        if (!body.title || !body.description) {
            return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
        }

        const newTicket = await db.insert(tickets).values({
            userId: user.id,
            title: body.title,
            description: body.description,
            aiMetadata: body.multimodalPayload || {},
            status: 'open',
        }).returning();

        return NextResponse.json({ message: 'Ticket created successfully', ticket: newTicket[0] }, { status: 201 });
    } catch (error) {
        return errorResponse(error, 500, 'tickets:POST');
    }
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const results = status && status !== 'all'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? await db.select().from(tickets).where(eq(tickets.status, status as any))
            : await db.select().from(tickets);

        return NextResponse.json({ tickets: results }, { status: 200 });
    } catch (error) {
        return errorResponse(error, 500, 'tickets:GET');
    }
}