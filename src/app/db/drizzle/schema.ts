import { pgTable, text, timestamp, uuid, jsonb, boolean, pgEnum, integer, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['student', 'mentor', 'admin']);
export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'pending', 'resolved']);

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    role: userRoleEnum('role').default('student'),
    bio: text('bio'),
    educationLevel: text('education_level'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const ticketPriorityEnum = pgEnum('ticket_priority', ['low', 'medium', 'high']);
export const ticketInputTypeEnum = pgEnum('ticket_input_type', ['text', 'audio', 'image', 'document']);

export const tickets = pgTable('tickets', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    status: ticketStatusEnum('status').default('open'),
    priority: ticketPriorityEnum('priority').default('medium'),
    inputType: ticketInputTypeEnum('input_type').default('text'),
    contentUrl: text('content_url'),
    aiMetadata: jsonb('ai_metadata'), // Stores depth estimation, object detection, etc.
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// ... existing users/tickets tables ...

export const courses = pgTable('courses', {
    id: text('id').primaryKey(), // slug like 'calculus', 'linear-algebra'
    title: text('title').notNull(),
    description: text('description').notNull(),
    iconName: text('icon_name').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const modules = pgTable('modules', {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: text('course_id').references(() => courses.id).notNull(),
    title: text('title').notNull(),
    orderIndex: integer('order_index').notNull(),
    contentMarkdown: text('content_markdown'),
    youtubeUrl: text('youtube_url'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const quizzes = pgTable('quizzes', {
    id: uuid('id').primaryKey().defaultRandom(),
    moduleId: uuid('module_id').references(() => modules.id).notNull(),
    question: text('question').notNull(),
    options: jsonb('options').notNull(), // Array of strings
    correctAnswer: text('correct_answer').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const resources = pgTable('resources', {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: text('course_id').references(() => courses.id), // Optional link to a specific course
    title: text('title').notNull(),
    type: text('type').notNull(), // 'video', 'article', 'pdf'
    url: text('url').notNull(),
    subject: text('subject').notNull(),
    contentSummary: text('content_summary'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const userProgress = pgTable('user_progress', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'cascade' }).notNull(),
    courseId: text('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    completed: boolean('completed').default(false),
    completedAt: timestamp('completed_at'),
    startedAt: timestamp('started_at').defaultNow(),
    quizScore: integer('quiz_score'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
    unique('unique_user_module').on(table.userId, table.moduleId),
]);

export const userStreaks = pgTable('user_streaks', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().unique(),
    currentStreak: integer('current_streak').default(0),
    longestStreak: integer('longest_streak').default(0),
    lastQuizDate: timestamp('last_quiz_date'),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const conversations = pgTable('conversations', {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketId: uuid('ticket_id').references(() => tickets.id),
    mentorId: uuid('mentor_id').references(() => users.id),
    studentId: uuid('student_id').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
});

export const messages = pgTable('messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
    senderId: uuid('sender_id').references(() => users.id).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
    user: one(users, {
        fields: [tickets.userId],
        references: [users.id],
    }),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
    modules: many(modules),
    resources: many(resources),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
    course: one(courses, {
        fields: [modules.courseId],
        references: [courses.id],
    }),
    quizzes: many(quizzes),
}));

export const quizzesRelations = relations(quizzes, ({ one }) => ({
    module: one(modules, {
        fields: [quizzes.moduleId],
        references: [modules.id],
    }),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
    course: one(courses, {
        fields: [resources.courseId],
        references: [courses.id],
    }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
    ticket: one(tickets, {
        fields: [conversations.ticketId],
        references: [tickets.id],
    }),
    mentor: one(users, {
        fields: [conversations.mentorId],
        references: [users.id],
        relationName: 'mentor_conversations',
    }),
    student: one(users, {
        fields: [conversations.studentId],
        references: [users.id],
        relationName: 'student_conversations',
    }),
    messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
    conversation: one(conversations, {
        fields: [messages.conversationId],
        references: [conversations.id],
    }),
    sender: one(users, {
        fields: [messages.senderId],
        references: [users.id],
    }),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
    module: one(modules, {
        fields: [userProgress.moduleId],
        references: [modules.id],
    }),
    course: one(courses, {
        fields: [userProgress.courseId],
        references: [courses.id],
    }),
}));

// ============================================================================
// EDDI CONVERSATION MEMORY
// Separate from mentor/student conversations — these persist Eddi chat history
// ============================================================================

export const eddiMessageRoleEnum = pgEnum('eddi_message_role', ['user', 'assistant']);

export const eddiConversations = pgTable('eddi_conversations', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // Supabase auth user ID
    title: text('title').notNull().default('New conversation'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const eddiMessages = pgTable('eddi_messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').references(() => eddiConversations.id, { onDelete: 'cascade' }).notNull(),
    role: eddiMessageRoleEnum('role').notNull(),
    content: text('content').notNull(),
    actionPayload: jsonb('action_payload'), // Store any tool results / navigation actions
    createdAt: timestamp('created_at').defaultNow(),
});

export const eddiConversationsRelations = relations(eddiConversations, ({ many }) => ({
    messages: many(eddiMessages),
}));

export const eddiMessagesRelations = relations(eddiMessages, ({ one }) => ({
    conversation: one(eddiConversations, {
        fields: [eddiMessages.conversationId],
        references: [eddiConversations.id],
    }),
}));

