import { authKit } from '@workos/authkit-sveltekit';

export async function GET(event) {
	return authKit.signOut(event);
}
