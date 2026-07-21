// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			auth: import('@workos/authkit-sveltekit').AuthKitAuth;
		}

		interface Platform {
			ctx: import('@cloudflare/workers-types').ExecutionContext;
			cf?: import('@cloudflare/workers-types').IncomingRequestCfProperties;
		}
	}
}

export {};
