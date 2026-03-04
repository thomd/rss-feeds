import { z } from "zod";

// Raw shape from LLM (before validation)
export type RawFeedItem = Record<string, unknown>;

const FeedItemSchema = z.object({
  title: z.string().min(1),
  link: z.string().url(),
  description: z.string().min(1),
  pubDate: z.string().optional(),
});

export type FeedItem = z.infer<typeof FeedItemSchema>;

/**
 * Validate an array of raw LLM-extracted items against the feed item schema.
 * Invalid items are logged and skipped rather than crashing the process.
 */
export function validateItems(raw: RawFeedItem[]): FeedItem[] {
  const valid: FeedItem[] = [];

  for (let i = 0; i < raw.length; i++) {
    const result = FeedItemSchema.safeParse(raw[i]);
    if (result.success) {
      valid.push(result.data);
    } else {
      console.warn(
        `[validateItems] Item ${i} failed validation (skipped):`,
        result.error.flatten().fieldErrors
      );
    }
  }

  return valid;
}
