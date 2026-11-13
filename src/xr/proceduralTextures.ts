import * as THREE from 'three';

export interface WalnutTextureSet {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export function createWalnutWoodTextures(maxAnisotropy = 4): WalnutTextureSet {
  const width = 512;
  const height = 512;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const ctx = albedoCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rCtx = roughCanvas.getContext('2d')!;

  ctx.fillStyle = '#472c1b';
  ctx.fillRect(0, 0, width, height);

  rCtx.fillStyle = '#8a8a8a';
  rCtx.fillRect(0, 0, width, height);

  // Procedural wood grain streaks
  for (let y = 0; y < height; y += 2) {
    const wave = Math.sin(y * 0.045) * 10 + Math.cos(y * 0.12) * 4;
    const tone = 38 + Math.floor((Math.sin(y * 0.08) + 1) * 14);
    ctx.strokeStyle = `rgba(${tone + 26}, ${tone + 6}, ${Math.max(12, tone - 8)}, 0.42)`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(
      width * 0.33,
      y + wave,
      width * 0.66,
      y - wave,
      width,
      y
    );
    ctx.stroke();

    const rTone = 110 + Math.floor((Math.cos(y * 0.09) + 1) * 32);
    rCtx.strokeStyle = `rgb(${rTone}, ${rTone}, ${rTone})`;
    rCtx.lineWidth = 1.5;
    rCtx.beginPath();
    rCtx.moveTo(0, y);
    rCtx.lineTo(width, y);
    rCtx.stroke();
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 1);
  map.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 1);
  roughnessMap.anisotropy = maxAnisotropy;

  return {map, roughnessMap};
}

export function createPressureGaugeTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  ctx.fillStyle = '#f6f2ea';
  ctx.beginPath();
  ctx.arc(cx, cy, cx - 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#2b211a';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Green espresso extraction zone arc (8-10 bar)
  ctx.strokeStyle = '#15803d';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, cx - 28, -Math.PI * 0.65, -Math.PI * 0.15);
  ctx.stroke();

  // Tick marks
  for (let i = 0; i <= 12; i++) {
    const angle = Math.PI * 0.75 + (i / 12) * Math.PI * 1.5;
    const r1 = cx - 20;
    const r2 = cx - 38;
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = i % 3 === 0 ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    ctx.stroke();
  }

  // Needle pointing at 9 bar
  const needleAngle = -Math.PI * 0.42;
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(
    cx + Math.cos(needleAngle) * (cx - 34),
    cy + Math.sin(needleAngle) * (cx - 34)
  );
  ctx.stroke();

  ctx.fillStyle = '#292524';
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

export function createLatteArtTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  const grad = ctx.createRadialGradient(cx, cy, 12, cx, cy, size * 0.5);
  grad.addColorStop(0, '#c07a45');
  grad.addColorStop(0.72, '#8d4c23');
  grad.addColorStop(1, '#582c12');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Rosetta microfoam leaves
  ctx.fillStyle = '#f5ebe0';
  for (let i = 0; i < 6; i++) {
    const y = 78 + i * 18;
    const w = 46 - i * 4;
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.45, y, w * 0.42, 8, -0.32, 0, Math.PI * 2);
    ctx.ellipse(cx + w * 0.45, y, w * 0.42, 8, 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, 62, 16, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    4,
    size / 2,
    size / 2,
    size / 2
  );
  grad.addColorStop(0, 'rgba(8, 5, 3, 0.52)');
  grad.addColorStop(0.55, 'rgba(8, 5, 3, 0.22)');
  grad.addColorStop(1, 'rgba(8, 5, 3, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createTileBacksplashTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#251e19';
  ctx.fillRect(0, 0, size, size);

  const cols = 8;
  const rows = 16;
  const tileW = size / cols;
  const tileH = size / rows;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (tileW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const shade = 230 + ((r * 7 + c * 13) % 16) - 8;
      ctx.fillStyle = `rgb(${shade}, ${shade - 8}, ${shade - 18})`;
      ctx.fillRect(c * tileW + offset + 2, r * tileH + 2, tileW - 4, tileH - 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 1.5);
  texture.anisotropy = maxAnisotropy;
  return texture;
}
