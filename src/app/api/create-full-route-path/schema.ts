import { z } from 'zod';

export const createFullRoutePathSchema = z.object({
  origin: z.string().length(3).regex(/^[A-Z]{3}$/),
  destination: z.string().length(3).regex(/^[A-Z]{3}$/),
});

export type CreateFullRoutePathInput = z.infer<typeof createFullRoutePathSchema>; 