import {
	WORKOS_API_KEY,
	WORKOS_CLIENT_ID,
	WORKOS_COOKIE_PASSWORD,
	WORKOS_REDIRECT_URI
} from '$env/static/private';
import { authKitHandle, configureAuthKit } from '@workos/authkit-sveltekit';

// Configure AuthKit with SvelteKit's environment variables
configureAuthKit({
	clientId: WORKOS_CLIENT_ID,
	apiKey: WORKOS_API_KEY,
	redirectUri: WORKOS_REDIRECT_URI,
	cookiePassword: WORKOS_COOKIE_PASSWORD
});

// There is a weird WorkOS error that says
// "Failed to revoke session on WorkOS." even though it does.
export const handle = authKitHandle({
	debug: false,
	onError: () => {}
});
