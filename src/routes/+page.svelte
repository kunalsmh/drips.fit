<script lang="ts">
	import WorldHexGrid from '$lib/WorldHexGrid.svelte';
	import { goto } from '$app/navigation';
	import { xml } from 'd3';

	// Updated image type
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

	const validImages = data.images.filter((image) => image.name);

	$: filtered = search
		? validImages
				.filter((image) => image.name.toLowerCase().includes(search.toLowerCase()))
				.filter((image, index, self) => self.findIndex((i) => i.name === image.name) === index)
		: [];

	function handleClick(image: { x: number; y: number }) {
		goto(`/canvas/${image.x},${image.y}`);
	}
</script>

<div class="relative flex min-h-screen flex-col overflow-hidden bg-white text-black">
	<!-- Background Image with 20% opacity -->
	<img
		src="https://media.discordapp.net/attachments/856107075578888231/1409614930855989390/VAIIYA_Series_2000_1.png?ex=68ae05b4&is=68acb434&hm=6577104a172a0b22bb5150f6fd72c37ef107df25c02080a5dbb2646f99a52bec&=&format=webp&quality=lossless&width=1032&height=504"
		alt="Background"
		class="absolute z-1 h-full w-full object-cover opacity-5"
	/>

	<!-- Main Section -->
	<div
		class="mx-auto flex w-full max-w-6xl flex-grow flex-col items-center justify-center px-6 py-12 lg:flex-row lg:px-16 lg:py-20"
	>
		<!-- Left: Text -->
		<div class="relative z-10 space-y-6 text-center lg:w-1/2 lg:text-left">
			<h1 class="ds text-4xl leading-tight font-bold lg:text-5xl">
				The Finals<br />drip sandbox
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
					class="w-full max-w-md rounded-md border border-gray-300 px-4 py-2 text-black focus:ring-2 focus:ring-blue-400 focus:outline-none"
				/>
			</form>

			<!-- Filtered Results -->
			{#if filtered.length > 0}
				<ul
					class="mt-2 w-full max-w-md overflow-hidden rounded-md border border-gray-200 bg-white text-left text-sm shadow"
				>
					{#each filtered as image}
						<li
							class="cursor-pointer px-4 py-2 hover:bg-gray-100"
							on:click={() => handleClick(image)}
						>
							{image.name}
						</li>
					{/each}
				</ul>
			{:else if search}
				<p class="mt-2 text-sm text-gray-500">No matching results.</p>
			{/if}
		</div>

		<!-- Right: Map -->
		<div class="z-2 mt-12 flex justify-center lg:mt-0 lg:w-1/2">
			<WorldHexGrid />
		</div>
	</div>

	<footer
		class="flex w-full items-center justify-between overflow-hidden bg-black px-6 py-4 text-white"
	>
		<p class="text-right font-mono text-sm">
			Join the official Discord server and include <span class="text-blue-400">-vv</span> while submitting
			your drip in the #drip-check channel!
		</p>
		<div class="flex-shrink-0">
			<img
				src="https://media.discordapp.net/attachments/856107075578888231/1409613885660598364/logo.png?ex=68ae04bb&is=68acb33b&hm=8d735d87cacf15c0b55368c07fb03c021e87d490bfaea562805a167790f94314&=&format=webp&quality=lossless"
				alt="Vaiya Logo"
				class="object-contain"
				style="height: 48px; width: auto;"
			/>
		</div>
	</footer>
</div>
