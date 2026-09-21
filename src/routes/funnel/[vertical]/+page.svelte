<script lang="ts">
	import FunnelLanding from '$lib/components/FunnelLanding.svelte';
	let { data, form } = $props();
</script>

<FunnelLanding {data} {form} />
