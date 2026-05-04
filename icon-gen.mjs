import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';

mkdirSync('resources', { recursive: true });

const svg = readFileSync('src/assets/anchored-dark-icon.svg');

const scaled = await sharp(svg)
  .resize(780, 702, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: { r: 7, g: 15, b: 31, alpha: 255 } }
})
  .composite([{ input: scaled, gravity: 'center' }])
  .png()
  .toFile('resources/icon.png');

console.log('✅ resources/icon.png generated');
