CREATE TYPE "public"."eddi_message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TABLE "eddi_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT 'New conversation' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "eddi_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "eddi_message_role" NOT NULL,
	"content" text NOT NULL,
	"action_payload" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "eddi_messages" ADD CONSTRAINT "eddi_messages_conversation_id_eddi_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."eddi_conversations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_eddi_conversations_user_id" ON "eddi_conversations" ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_eddi_messages_conversation_id" ON "eddi_messages" ("conversation_id");