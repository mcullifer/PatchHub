<script lang="ts">
	import { DotPattern } from '$lib/components/magic/dot-pattern';
	import type { ClassValue } from 'svelte/elements';

	let { class: className }: { class?: ClassValue } = $props();
</script>

<div
	class="absolute top-1/2 right-4 hidden -translate-y-1/2 sm:right-6 lg:right-8 lg:block"
	aria-hidden="true"
>
	<div class={['relative w-80 xl:w-[26rem]', className]}>
		<div class="absolute -inset-y-4 -right-4 -left-[26rem]">
			<DotPattern
				glow={true}
				animated={false}
				class="mask-[linear-gradient(to_right,transparent,white_30%,white_88%,transparent),linear-gradient(to_bottom,transparent,white_28%,white_72%,transparent)] [mask-composite:intersect]"
			/>
		</div>
	</div>
</div>
