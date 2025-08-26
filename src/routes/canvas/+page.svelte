<script lang="ts">
  import { onMount } from "svelte";

  export let data: {
    images: { id: number; name: string; url: string; x: number; y: number }[];
  };

  let canvasEl: HTMLCanvasElement;
  const imageSize = 512;

  type ImgData = {
    id: number;
    img: HTMLImageElement;
    x: number;
    y: number;
    name: string;
  };

  let images: ImgData[] = [];

  // Zoom & Pan
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  // Mouse position in canvas space
  let mouseCanvasX = 0;
  let mouseCanvasY = 0;

  // Drag image
  let draggingIndex: number | null = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  // Pan canvas
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;

  // Copied message state
  let copiedMessage = '';
  let copiedTimeout: ReturnType<typeof setTimeout>;

  function draw() {
    const ctx = canvasEl?.getContext("2d");
    if (!ctx) return;

    const width = canvasEl.width;
    const height = canvasEl.height;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // Apply pan & zoom
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Draw all images
    for (const { img, x, y } of images) {
      ctx.drawImage(img, x, y, imageSize, imageSize);
    }

    ctx.restore();
  }

  function getMouseCanvasCoords(event: MouseEvent | WheelEvent) {
    const rect = canvasEl.getBoundingClientRect();
    const x = (event.clientX - rect.left - offsetX) / scale;
    const y = (event.clientY - rect.top - offsetY) / scale;
    return { x, y };
  }

  function hitTest(x: number, y: number): number | null {
    for (let i = images.length - 1; i >= 0; i--) {
      const img = images[i];
      if (
        x >= img.x &&
        x <= img.x + imageSize &&
        y >= img.y &&
        y <= img.y + imageSize
      ) {
        return i;
      }
    }
    return null;
  }

  function onMouseDown(event: MouseEvent) {
    const pos = getMouseCanvasCoords(event);
    const idx = hitTest(pos.x, pos.y);

    if (idx !== null) {
      // Start dragging image
      draggingIndex = idx;
      dragOffsetX = pos.x - images[idx].x;
      dragOffsetY = pos.y - images[idx].y;

      // Bring image to front
      const dragged = images.splice(idx, 1)[0];
      images.push(dragged);
      draggingIndex = images.length - 1;
    } else {
      // Start panning
      isPanning = true;
      panStartX = event.clientX - offsetX;
      panStartY = event.clientY - offsetY;
    }

    draw();
  }

  function onMouseMove(event: MouseEvent) {
    const { x, y } = getMouseCanvasCoords(event);
    mouseCanvasX = Math.round(x);
    mouseCanvasY = Math.round(y);

    if (draggingIndex !== null) {
      images[draggingIndex].x = x - dragOffsetX;
      images[draggingIndex].y = y - dragOffsetY;
      draw();
    } else if (isPanning) {
      offsetX = event.clientX - panStartX;
      offsetY = event.clientY - panStartY;
      draw();
    }
  }

  function onMouseUp() {
    draggingIndex = null;
    isPanning = false;
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();

    const zoomFactor = 1.1;
    const rect = canvasEl.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Mouse position in canvas coords BEFORE zoom
    const canvasXBeforeZoom = (mouseX - offsetX) / scale;
    const canvasYBeforeZoom = (mouseY - offsetY) / scale;

    // Apply zoom
    const direction = event.deltaY < 0 ? 1 : -1;
    const factor = Math.pow(zoomFactor, direction);
    scale *= factor;
    scale = Math.max(0.1, Math.min(5, scale));

    // Adjust pan to keep zoom centered at mouse
    offsetX = mouseX - canvasXBeforeZoom * scale;
    offsetY = mouseY - canvasYBeforeZoom * scale;

    draw();
  }

  function onContextMenu(event: MouseEvent) {
    event.preventDefault(); // Prevent the default context menu

    const pos = getMouseCanvasCoords(event);
    const idx = hitTest(pos.x, pos.y);

    if (idx !== null) {
      const { x, y } = images[idx];

      const coordText = `https://dripchecks.vercel.app/canvas/${Math.round(x)},${Math.round(y)}`;
      navigator.clipboard.writeText(coordText)
        .then(() => {
          showCopiedMessage(coordText);
        })
        .catch(err => {
          console.error('Failed to copy coordinates:', err);
        });
    }
  }

  function showCopiedMessage(msg: string) {
    copiedMessage = `Copied ${msg}`;
    clearTimeout(copiedTimeout);
    copiedTimeout = setTimeout(() => {
      copiedMessage = '';
    }, 2000);
  }

  onMount(async () => {
    if (!canvasEl || data.images.length === 0) return;

    const loadedImages = await Promise.all(
      data.images.map(
        (img) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.src = img.url;
            image.onload = () => resolve(image);
            image.onerror = reject;
          })
      )
    );

    canvasEl.width = window.innerWidth;
    canvasEl.height = window.innerHeight;

    images = loadedImages.map((img, idx) => {
      const { id, x, y, name } = data.images[idx];
      return { id, img, x, y, name };
    });

    draw();

    // Auto-save every 5 seconds
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

<style>
  canvas {
    display: block;
    width: 100vw;
    height: 100vh;
    cursor: grab;
  }

  canvas:active {
    cursor: grabbing;
  }

  .coords {
    position: fixed;
    bottom: 8px;
    right: 16px;
    font-family: monospace;
    font-size: 14px;
    color: #333;
    background: rgba(255, 255, 255, 0.9);
    padding: 4px 8px;
    border-radius: 4px;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
    pointer-events: none;
    z-index: 10;
  }

  .copied-message {
    position: fixed;
    bottom: 40px;
    right: 16px;
    font-family: monospace;
    font-size: 14px;
    color: green;
    background: rgba(255, 255, 255, 0.95);
    padding: 4px 8px;
    border-radius: 4px;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
    pointer-events: none;
    z-index: 10;
  }
</style>

{#if data.images.length}
  <canvas
    bind:this={canvasEl}
    class="bg-white"
    on:mousedown={onMouseDown}
    on:mouseup={onMouseUp}
    on:mouseleave={onMouseUp}
    on:mousemove={onMouseMove}
    on:wheel={onWheel}
    on:contextmenu={onContextMenu}
  ></canvas>

  <div class="coords">
    x: {mouseCanvasX}, y: {mouseCanvasY}
  </div>

  {#if copiedMessage}
    <div class="copied-message">{copiedMessage}</div>
  {/if}
{/if}
