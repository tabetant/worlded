// ============================================================================
// EDDI CONVERSATION HELPERS
// Utilities for managing Eddi chat conversations
// ============================================================================

/**
 * Generate a meaningful title from the first user message.
 * Strips common greeting prefixes and truncates to 50 chars.
 */
export function generateConversationTitle(firstMessage: string): string {
    // Remove common greeting/command prefixes
    let title = firstMessage
        .replace(/^(hey|hi|hello|yo|eddi|dear eddi|can you|could you|would you|please|i want to|i need to|i'd like to|help me)\s*/i, '')
        .trim();

    // Capitalize first letter
    if (title.length > 0) {
        title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    // Limit to 50 characters
    if (title.length > 50) {
        title = title.substring(0, 47) + '...';
    }

    return title || 'New conversation';
}
