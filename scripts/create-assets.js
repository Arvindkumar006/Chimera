const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table & calculator
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(width, height, renderPixel) {
  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // deflate
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace none
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines: width * 4 + 1 filter byte per line
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  let pos = 0;

  for (let y = 0; y < height; y++) {
    rawData[pos++] = 0; // Filter byte: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderPixel(x, y, width, height);
      rawData[pos++] = r;
      rawData[pos++] = g;
      rawData[pos++] = b;
      rawData[pos++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Ensure assets directory
const assetsDir = path.join(__dirname, '..', 'client', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Tactical Emblem Renderer:
// Dark background: #0A0D14 (10, 13, 20)
// Cyan accent: #00F0FF (0, 240, 255)
// Titanium Slate: #8A99AD (138, 153, 173)
// Subtle Gold accent: #D4AF37 (212, 175, 55)
function renderTacticalEmblem(x, y, width, height, isSplash = false) {
  const cx = width / 2;
  const cy = height / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const radius = width * (isSplash ? 0.22 : 0.40);

  // Background: Deep Obsidian / Tactical Carbon #0A0D14
  let r = 10, g = 13, b = 20, a = 255;

  // Outer Hexagonal / Circular Tactical Radar Ring
  const ringWidth = width * 0.018;
  if (Math.abs(dist - radius) < ringWidth) {
    const intensity = 1 - Math.abs(dist - radius) / ringWidth;
    return [Math.round(0 * intensity + r), Math.round(240 * intensity + g), Math.round(255 * intensity + b), 255];
  }

  // Inner Tactical Chevron / Shield geometry
  // Normalized coords in [-1, 1] relative to radius
  const nx = dx / radius;
  const ny = dy / radius;

  // Upper V-blade (Titanium Slate & Cyan)
  const inChevronOuter = Math.abs(nx) < 0.7 && ny > -0.65 && ny < (0.6 - Math.abs(nx) * 0.8);
  const inChevronInner = Math.abs(nx) < 0.35 && ny > -0.25 && ny < (0.25 - Math.abs(nx) * 0.6);

  if (inChevronOuter && !inChevronInner) {
    // Sharp high-tech tactical angular bevel
    const isEdge = Math.abs(nx) > 0.6 || Math.abs(nx) < 0.1;
    if (isEdge) {
      return [0, 240, 255, 255]; // Cyan neon edge
    } else {
      // Sleek brushed titanium gradient
      const grad = 0.5 + 0.5 * Math.sin(nx * 3);
      return [
        Math.round(110 + 60 * grad),
        Math.round(130 + 80 * grad),
        Math.round(160 + 95 * grad),
        255
      ];
    }
  }

  // Core Reticle / Focal Diamond (Executive Gold Core)
  const diamondDist = Math.abs(nx) + Math.abs(ny);
  if (diamondDist < 0.20) {
    const edge = Math.abs(diamondDist - 0.20) < 0.04;
    if (edge) {
      return [212, 175, 55, 255]; // Executive Gold accent
    } else if (diamondDist < 0.08) {
      return [0, 240, 255, 255]; // Cyan Core
    } else {
      return [25, 35, 48, 255];
    }
  }

  // Subtle grid points for tactical HUD feel
  if (dist < radius * 1.3 && (Math.abs(dx) % Math.round(width * 0.06) < 2) && (Math.abs(dy) % Math.round(height * 0.06) < 2)) {
    return [30, 45, 65, 255];
  }

  return [r, g, b, a];
}

console.log('Generating Chimera Combat production assets...');

// 1. App Icon (1024x1024)
console.log('- Generating icon.png (1024x1024)...');
const iconBuf = createPng(1024, 1024, (x, y, w, h) => renderTacticalEmblem(x, y, w, h, false));
fs.writeFileSync(path.join(assetsDir, 'icon.png'), iconBuf);

// 2. Adaptive Icon (1024x1024)
console.log('- Generating adaptive-icon.png (1024x1024)...');
const adaptiveBuf = createPng(1024, 1024, (x, y, w, h) => renderTacticalEmblem(x, y, w, h, false));
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), adaptiveBuf);

// 3. Splash Screen (2048x2048)
console.log('- Generating splash.png (2048x2048)...');
const splashBuf = createPng(2048, 2048, (x, y, w, h) => renderTacticalEmblem(x, y, w, h, true));
fs.writeFileSync(path.join(assetsDir, 'splash.png'), splashBuf);

// 4. Favicon (48x48)
console.log('- Generating favicon.png (48x48)...');
const faviconBuf = createPng(48, 48, (x, y, w, h) => renderTacticalEmblem(x, y, w, h, false));
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), faviconBuf);

console.log('✔ All 4 assets created successfully in client/assets/');
