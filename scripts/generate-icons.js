const fs = require('fs');
const path = require('path');

// Try requiring sharp
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  try {
    sharp = require(path.join(process.cwd(), 'node_modules/sharp'));
  } catch (err) {
    console.error('Sharp not found directly, using fallback');
  }
}

const svgIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1b4d37"/>
      <stop offset="100%" stop-color="#0d261b"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5C77A"/>
      <stop offset="50%" stop-color="#C8A85B"/>
      <stop offset="100%" stop-color="#9A7B32"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#grad)"/>
  
  <!-- Outer Gold Border -->
  <rect x="${size * 0.05}" y="${size * 0.05}" width="${size * 0.9}" height="${size * 0.9}" rx="${size * 0.18}" fill="none" stroke="url(#gold)" stroke-width="${size * 0.025}" opacity="0.8"/>
  
  <!-- Inner Decorative Arch / Frame -->
  <rect x="${size * 0.1}" y="${size * 0.1}" width="${size * 0.8}" height="${size * 0.8}" rx="${size * 0.14}" fill="none" stroke="url(#gold)" stroke-width="${size * 0.01}" stroke-dasharray="${size * 0.02} ${size * 0.015}" opacity="0.6"/>
  
  <!-- Open Quran Book Icon in Gold -->
  <g transform="translate(${size * 0.25}, ${size * 0.23}) scale(${size / 200})">
    <!-- Left Page -->
    <path d="M50 70 C35 62, 15 65, 5 70 C5 35, 15 25, 50 30 Z" fill="#FBF8EF" opacity="0.95"/>
    <path d="M50 70 C35 62, 15 65, 5 70" stroke="url(#gold)" stroke-width="2.5" fill="none"/>
    <path d="M12 40 L42 38 M12 48 L42 46 M12 56 L38 55" stroke="#123B2A" stroke-width="1.8" stroke-linecap="round" opacity="0.5"/>
    
    <!-- Right Page -->
    <path d="M50 70 C65 62, 85 65, 95 70 C95 35, 85 25, 50 30 Z" fill="#FBF8EF" opacity="0.95"/>
    <path d="M50 70 C65 62, 85 65, 95 70" stroke="url(#gold)" stroke-width="2.5" fill="none"/>
    <path d="M58 38 L88 40 M58 46 L88 48 M62 55 L88 56" stroke="#123B2A" stroke-width="1.8" stroke-linecap="round" opacity="0.5"/>
    
    <!-- Spine and Rihlah Stand -->
    <path d="M50 28 L50 72" stroke="url(#gold)" stroke-width="3" stroke-linecap="round"/>
    <path d="M40 73 L25 88 M60 73 L75 88 M30 84 L70 84" stroke="url(#gold)" stroke-width="3" stroke-linecap="round"/>
    
    <!-- Top Crescent / Star -->
    <circle cx="50" cy="14" r="4.5" fill="url(#gold)"/>
    <polygon points="50,4 52,10 58,10 53,14 55,20 50,16 45,20 47,14 42,10 48,10" fill="url(#gold)" transform="translate(0, -2) scale(0.6) translate(33, 4)"/>
  </g>
  
  <!-- Text Label "نور القرآن" -->
  <text x="50%" y="${size * 0.82}" text-anchor="middle" fill="url(#gold)" font-family="Amiri, serif, Arial" font-size="${size * 0.11}" font-weight="bold">نور القرآن</text>
</svg>
`;

async function generate() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  // 192x192
  const svg192 = Buffer.from(svgIcon(192));
  await sharp(svg192).png().toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Generated icon-192.png');
  
  // 512x512
  const svg512 = Buffer.from(svgIcon(512));
  await sharp(svg512).png().toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Generated icon-512.png');
  
  // favicon.png
  const svg64 = Buffer.from(svgIcon(64));
  await sharp(svg64).png().toFile(path.join(publicDir, 'favicon.png'));
  console.log('Generated favicon.png');
}

generate().catch(console.error);
