import QRCode from 'qrcode';
import { isQrToken } from './qrQueries';

const QR_SIZE = 1200;
const HEADER_HEIGHT = 200;
const FOOTER_HEIGHT = 190;

interface QrImageDetails {
  token: string;
  name: string;
  code: string;
  line1: string;
  line2: string;
}

export function equipmentQrUrl(token: string): string {
  return `${window.location.origin}${window.location.pathname}#/qr/${encodeURIComponent(token)}`;
}

export async function renderEquipmentQr(canvas: HTMLCanvasElement, details: QrImageDetails) {
  if (!isQrToken(details.token)) throw new Error('QR_TOKEN_UNAVAILABLE');
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, equipmentQrUrl(details.token), {
    width: QR_SIZE,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
  canvas.width = QR_SIZE;
  canvas.height = HEADER_HEIGHT + QR_SIZE + FOOTER_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#000000';
  context.textAlign = 'center';
  context.font = 'bold 58px Cairo, Arial, sans-serif';
  context.fillText(details.line1, QR_SIZE / 2, 72, QR_SIZE - 100);
  context.font = '44px Cairo, Arial, sans-serif';
  context.fillText(details.line2, QR_SIZE / 2, 140, QR_SIZE - 100);
  context.drawImage(qrCanvas, 0, HEADER_HEIGHT);
  context.font = 'bold 60px Cairo, Arial, sans-serif';
  context.fillText(details.name, QR_SIZE / 2, HEADER_HEIGHT + QR_SIZE + 80, QR_SIZE - 100);
  context.font = '44px Arial, sans-serif';
  context.fillText(details.code, QR_SIZE / 2, HEADER_HEIGHT + QR_SIZE + 145, QR_SIZE - 100);
}

export function qrCanvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('QR_IMAGE_UNAVAILABLE'));
    }, 'image/png');
  });
}
