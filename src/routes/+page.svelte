<script lang="ts">
	import { onMount } from 'svelte';
	import WorldHexGrid from '$lib/WorldHexGrid.svelte';
	import { goto } from '$app/navigation';

	export let data: {
		images: {
			id: number;
			name: string;
			url: string;
			x: number;
			y: number;
		}[];
	};

	let search = '';
	let filtered = [];
	let loading = false;

	// Banner visibility toggle
	let showBanner = false;

	// Show banner after 5 seconds
	onMount(() => {
		setTimeout(() => {
			showBanner = true;
		}, 5000);
	});

	const validImages = data.images.filter((image) => image.name);

	$: filtered = search
		? validImages
				.filter((image) => image.name.toLowerCase().includes(search.toLowerCase()))
				.filter((image, index, self) => self.findIndex((i) => i.name === image.name) === index)
		: [];

	async function handleClick(image: { x: number; y: number }) {
		loading = true;
		await goto(`/canvas/${image.x},${image.y}`);
	}
</script>

<!-- Top Banner -->
<a href="https://kunalsh.com"
	class="fixed top-0 left-0 z-50 w-full bg-black text-white text-center py-2 transition-transform duration-500 ease-in-out transform"
	class:translate-y-0={showBanner}
	class:-translate-y-full={!showBanner}
>
	Made with ❤️ by hiftie
</a>

<!-- Main Layout -->
<div class="relative flex min-h-screen flex-col overflow-hidden bg-white text-black pt-10">
	<!-- Background Image with 5% opacity -->
	<img
		src="https://media.discordapp.net/attachments/856107075578888231/1409614930855989390/VAIIYA_Series_2000_1.png?ex=68ae05b4&is=68acb434&hm=6577104a172a0b22bb5150f6fd72c37ef107df25c02080a5dbb2646f99a52bec&=&format=webp&quality=lossless&width=1032&height=504"
		alt="Background"
		class="absolute z-1 h-full w-full object-cover opacity-5"
	/>

	<!-- Main Content -->
	<div
		class="mx-auto flex w-full max-w-6xl flex-grow flex-col items-center justify-center px-6 py-12 lg:flex-row lg:px-16 lg:py-20"
	>
		<!-- Left Section -->
		<div class="relative z-10 space-y-6 text-center lg:w-1/2 lg:text-left">
			<h1 class="ds text-4xl font-bold leading-tight lg:text-5xl">
				The Finals<br />drip canvas
			</h1>
			<p class="dss text-md font-mono text-gray-700">
				Press the region on the world map<br />
				or the search bar to checkout ur drip!
			</p>

			<!-- Search Bar -->
			<form class="mt-4" on:submit|preventDefault>
				<input
					type="text"
					placeholder="Search your drip..."
					bind:value={search}
					class="w-full max-w-md rounded-md border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
				/>
			</form>

			<!-- Filtered Results -->
			{#if loading}
				<p class="mt-4 text-sm text-gray-500">Loading...</p>
			{:else if filtered.length > 0}
				<ul class="mt-2 w-full max-w-md overflow-hidden rounded-md border border-gray-200 bg-white text-left text-sm shadow">
					{#each filtered as image}
						<li>
							<button
								type="button"
								class="w-full px-4 py-2 text-left hover:bg-gray-100"
								on:click={() => handleClick(image)}
							>
								{image.name}
							</button>
						</li>
					{/each}
				</ul>
			{:else if search}
				<p class="mt-2 text-sm text-gray-500">No matching results.</p>
			{/if}
		</div>

		<!-- Right Section (Map) -->
		<div class="z-2 mt-12 hidden justify-center lg:mt-0 lg:flex lg:w-1/2">
			<WorldHexGrid />
		</div>
	</div>

	<!-- Footer -->
	<footer class="flex w-full items-center justify-between bg-black px-6 py-4 text-white">
		<p class="text-right font-mono text-sm">
			Join the official Discord server and include <span class="text-blue-400">-vv</span> while submitting
			your drip in the #drip-check channel!
		</p>

		<!-- Logo (Desktop only) -->
		<div class="hidden flex-shrink-0 lg:block">
			<img
				src="https://media.discordapp.net/attachments/856107075578888231/1409613885660598364/logo.png?ex=68ae04bb&is=68acb33b&hm=8d735d87cacf15c0b55368c07fb03c021e87d490bfaea562805a167790f94314&=&format=webp&quality=lossless"
				alt="Vaiya Logo"
				class="object-contain"
				style="height: 48px; width: auto;"
			/>
		</div>
	</footer>
</div>