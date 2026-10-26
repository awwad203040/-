const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

async function createQRCodes() {
  const downloadUrl = 'https://awwad2030.vercel.app/download';
  const directApkUrl = 'https://awwad2030.vercel.app/api/download-apk';

  // 1. High Resolution PNG for scanning
  await QRCode.toFile('public/noor-download-qr.png', downloadUrl, {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 2,
    width: 600,
    color: {
      dark: '#123B2A',
      light: '#FFFFFF'
    }
  });

  await QRCode.toFile('public/noor-apk-direct-qr.png', directApkUrl, {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 2,
    width: 600,
    color: {
      dark: '#123B2A',
      light: '#FFFFFF'
    }
  });

  // 2. High Resolution SVG
  const qrSvg = await QRCode.toString(downloadUrl, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 1,
    color: {
      dark: '#123B2A',
      light: '#FFFFFF'
    }
  });

  fs.writeFileSync('public/noor-download-qr.svg', qrSvg);

  // 3. Copy to Desktop for user convenience
  fs.copyFileSync('public/noor-download-qr.png', 'C:/Users/mou1/Desktop/باركود_تحميل_تطبيق_نور_القرآن.png');
  fs.copyFileSync('public/noor-download-qr.svg', 'C:/Users/mou1/Desktop/باركود_تحميل_تطبيق_نور_القرآن.svg');

  console.log('All QR Codes and Barcode files generated successfully!');
}

createQRCodes().catch(console.error);
