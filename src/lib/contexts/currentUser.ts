import type { Id } from '$convex/_generated/dataModel';
import { createContext } from 'svelte';

export type CurrentUser = {
	id: Id<'users'> | null;
	analyticsId: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	profilePictureUrl: string | null;
	username: string | null;
};

// $app/state's page.data is unreliable inside async-boundary content on first
// hydration (empty until the router initializes), so the root layout shares
// the logged-in user through context instead. The value is a reader function
// so consumers stay reactive to layout data changes.
export const [getCurrentUser, setCurrentUser] = createContext<() => CurrentUser | null>();
