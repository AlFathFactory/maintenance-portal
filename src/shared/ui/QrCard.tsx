import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { Equipment } from '../../domain/equipment';

export function QrCard({ equipment }: { equipment: Equipment }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const address = `${window.location.origin}${window.location.pathname}#/equipment/${encodeURIComponent(equipment.slug)}`;
    const qrCanvas = document.createElement('canvas');
    void QRCode.toCanvas(qrCanvas, address, {
      width: 190,
      margin: 1,
      color: { dark: '#0b2b34', light: '#ffffff' },
    })
      .then(() => {
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas is unavailable');

        canvas.width = 190;
        canvas.height = 236;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#0b2b34';
        context.font = 'bold 12px Arial, sans-serif';
        context.textAlign = 'center';
        context.fillText('Scan QR,', canvas.width / 2, 18);
        context.fillText('Maintenance equipment.', canvas.width / 2, 35);
        context.drawImage(qrCanvas, 0, 46);
        setError('');
      })
      .catch(() => setError('تعذر إنشاء رمز QR.'));
  }, [equipment.slug]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const anchor = document.createElement('a');
    anchor.href = canvas.toDataURL('image/png');
    anchor.download = `${equipment.slug}-qr.png`;
    anchor.click();
  }

  return (
    <section className="qr-panel">
      <div className="qr-overline">بطاقة المعدة الرقمية</div>
      <h2>رمز الوصول السريع</h2>
      <p>امسح الرمز لفتح ملف هذه المعدة على الهاتف.</p>
      <div className="qr-frame">
        <canvas ref={canvasRef} aria-label={`رمز QR للمعدة ${equipment.name}`} />
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="qr-equipment">
        <strong>{equipment.name}</strong>
        <span>{equipment.code || equipment.slug}</span>
      </div>
      <button className="qr-download" onClick={download}>
        ↓ تحميل رمز QR
      </button>
      <button className="qr-print" onClick={() => window.print()}>
        طباعة البطاقة
      </button>
    </section>
  );
}
