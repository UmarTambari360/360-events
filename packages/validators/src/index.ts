import { z } from 'zod';

// Reusable schema for collection endpoint pagination
export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;