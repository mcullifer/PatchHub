<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<form method="post" action="?/login" class="h-full" use:enhance>
	<div class="flex h-full w-full items-center justify-center">
		<div class="card card-border bg-base-200 ring-primary shadow-lg ring-2">
			<div class="card-body">
				<div class="card-title">
					<h2>Login/Register</h2>
				</div>
				<label class="input flex items-center gap-2">
					<Icon icon="person" />
					<input name="username" placeholder="Username" />
				</label>
				<label class="input flex items-center gap-2">
					<Icon icon="key" />
					<input type="password" name="password" placeholder="Password" />
				</label>
				<div class="card-actions mt-4 justify-end">
					<button class="btn btn-primary">Login</button>
					<button formaction="?/register" class="btn btn-outline">Register</button>
				</div>
			</div>
		</div>
	</div>
</form>
<p style="color: red">{form?.message ?? ''}</p>
