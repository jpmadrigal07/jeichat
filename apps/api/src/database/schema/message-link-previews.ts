import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { messages } from './messages';

/**
 * Unfurled metadata for a URL found in a message (Discord-style embed).
 * `kind = 'image'` renders `imageUrl` bare (direct image links, GIFs);
 * `kind = 'link'` renders a card with title, description and thumbnail.
 */
export const messageLinkPreviews = pgTable(
  'message_link_previews',
  {
    id: text('id').primaryKey(),
    messageId: text('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    position: integer('position').notNull(),
    kind: text('kind').notNull(),
    title: text('title'),
    description: text('description'),
    siteName: text('site_name'),
    imageUrl: text('image_url'),
    imageWidth: integer('image_width'),
    imageHeight: integer('image_height'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('message_link_previews_message_url_unq').on(
      table.messageId,
      table.url,
    ),
    index('message_link_previews_message_id_idx').on(table.messageId),
  ],
);
