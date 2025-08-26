<script lang="ts">
  export let data: {
    images: { id: number; name: string; url: string; x: number; y: number }[];
    focus?: { x: number; y: number } | null;
  };

  import { onMount } from 'svelte';

  let canvasEl: HTMLCanvasElement;
  let canvasWidth = 0;
  let canvasHeight = 0;
  const imageSize = 512;

  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;

  let mouseCanvasX = 0;
  let mouseCanvasY = 0;

  type ImgData = {
    id: number;
    img: HTMLImageElement;
    x: number;
    y: number;
    name: string;
  };

  let images: ImgData[] = [];

  let draggingIndex: number | null = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  function draw() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    for (const { img, x, y } of images) {
      ctx.drawImage(img, x, y, imageSize, imageSize);
    }

    ctx.restore();
  }

  function getMousePos(event: MouseEvent) {
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function hitTest(x: number, y: number): number | null {
    for (let i = images.length - 1; i >= 0; i--) {
      const img = images[i];
      const scaledX = img.x * scale + offsetX;
      const scaledY = img.y * scale + offsetY;
      if (
        x >= scaledX &&
        x <= scaledX + imageSize * scale &&
        y >= scaledY &&
        y <= scaledY + imageSize * scale
      ) {
        return i;
      }
    }
    return null;
  }

  function onMouseDown(event: MouseEvent) {
    const pos = getMousePos(event);
    const idx = hitTest(pos.x, pos.y);
    if (idx !== null) {
      draggingIndex = idx;
      dragOffsetX = pos.x - (images[idx].x * scale + offsetX);
      dragOffsetY = pos.y - (images[idx].y * scale + offsetY);
      const dragged = images.splice(idx, 1)[0];
      images.push(dragged);
      draggingIndex = images.length - 1;
      draw();
    }
  }

  function onMouseMove(event: MouseEvent) {
    const pos = getMousePos(event);
    mouseCanvasX = (pos.x - offsetX) / scale;
    mouseCanvasY = (pos.y - offsetY) / scale;

    if (draggingIndex === null) return;
    images[draggingIndex].x = (pos.x - dragOffsetX - offsetX) / scale;
    images[draggingIndex].y = (pos.y - dragOffsetY - offsetY) / scale;
    draw();
  }

  function onMouseUp() {
    draggingIndex = null;
  }

  function onWheel(event: WheelEvent) {
    const zoomIntensity = 0.001;
    const { offsetX: mx, offsetY: my } = event;
    const wheel = event.deltaY * zoomIntensity;
    const zoom = Math.exp(-wheel);

    const wx = (mx - offsetX) / scale;
    const wy = (my - offsetY) / scale;

    scale *= zoom;
    offsetX -= wx * (zoom - 1) * scale;
    offsetY -= wy * (zoom - 1) * scale;

    draw();
  }

  onMount(async () => {
    if (!canvasEl || data.images.length === 0) return;

    const loadedImages = await Promise.all(
      data.images.map(
        (img) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.src = img.url;
            image.onload = () => resolve(image);
            image.onerror = reject;
          })
      )
    );

    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvasEl.width = canvasWidth;
    canvasEl.height = canvasHeight;

    images = loadedImages.map((img, idx) => {
      const { id, x, y, name } = data.images[idx];
      return { id, img, x, y, name };
    });

    // Center canvas at focus coordinates
    if (data.focus) {
      offsetX = canvasWidth / 2 - data.focus.x * scale;
      offsetY = canvasHeight / 2 - data.focus.y * scale;
    }

    draw();

    // Auto-save
    setInterval(async () => {
      const updates = images.map(({ id, x, y }) => ({ id, x, y }));
      try {
        const res = await fetch('/canvas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });

        const json = await res.json();
        if (!json.success) {
          console.error('Auto-save failed');
        } else {
          console.log('Auto-save success');
        }
      } catch (err) {
        console.error('Auto-save error:', err);
      }
    }, 5000);
  });
</script>

<canvas
  bind:this={canvasEl}
  class="block bg-white"
  on:mousedown={onMouseDown}
  on:mouseup={onMouseUp}
  on:mouseleave={onMouseUp}
  on:mousemove={onMouseMove}
  on:wheel|preventDefault={onWheel}
/>

<!-- Coordinate Overlay -->
<div class="fixed bottom-2 right-4 text-xs font-mono bg-black/70 text-white px-3 py-1 rounded shadow">
  x: {mouseCanvasX.toFixed(1)}, y: {mouseCanvasY.toFixed(1)}
</div>

<style>
  canvas {
    width: 100vw;
    height: 100vh;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
</style>
