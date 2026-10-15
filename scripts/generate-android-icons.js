const path = require('path');
const sharp = require('sharp');

const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const srcIcon = path.join(__dirname, '..', 'public', 'icon-512.png');

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function run() {
  for (const [folder, size] of Object.entries(sizes)) {
    const targetFolder = path.join(resDir, folder);
    await sharp(srcIcon).resize(size, size).toFile(path.join(targetFolder, 'ic_launcher.png'));
    await sharp(srcIcon).resize(size, size).toFile(path.join(targetFolder, 'ic_launcher_round.png'));
    await sharp(srcIcon).resize(size, size).toFile(path.join(targetFolder, 'ic_launcher_foreground.png'));
    console.log(`Updated icons for ${folder} (${size}x${size})`);
  }
}

run().catch(console.error);
