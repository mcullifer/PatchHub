import { DAY, RateLimiter } from '@convex-dev/rate-limiter';
import { components } from '../_generated/api';

export const rateLimiter = new RateLimiter(components.rateLimiter, {
	createProject: { kind: 'token bucket', rate: 10, period: DAY, capacity: 3 },
	createProjectPost: { kind: 'token bucket', rate: 30, period: DAY, capacity: 5 }
});
