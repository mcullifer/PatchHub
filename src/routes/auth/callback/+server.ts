import { authKit } from '@workos/authkit-sveltekit';
import type { RequestHandler } from './$types';

// Built lazily so AuthKit is not configured at module load, which runs
// during the build's route analysis before hooks.server.ts executes.
export const GET: RequestHandler = (event) => authKit.handleCallback()(event);
