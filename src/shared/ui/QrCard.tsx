import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { Equipment } from '../../domain/equipment';
import { useTranslation } from 'react-i18next';
import { equipmentText } from '../../domain/localizedEquipment';

export function QrCard({ equipment }: { equipment: Equipment }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language === 'en' ? 'en' : 'ar';
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
        context.fillText(t('qr.canvasLine1'), canvas.width / 2, 18);
        context.fillText(t('qr.canvasLine2'), canvas.width / 2, 35);
        context.drawImage(qrCanvas, 0, 46);
        setError('');
      })
      .catch(() => setError(t('qr.failed')));
  }, [equipment.slug, language, t]);

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
      <div className="qr-overline">{t('qr.digitalCard')}</div>
      <h2>{t('qr.title')}</h2>
      <p>{t('qr.hint')}</p>
      <div className="qr-frame">
        <canvas
          ref={canvasRef}
          aria-label={t('qr.canvasLabel', { name: equipmentText(equipment, 'name', language) })}
        />
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="qr-equipment">
        <strong dir="auto">{equipmentText(equipment, 'name', language)}</strong>
        <span>{equipment.code || equipment.slug}</span>
      </div>
      <button className="qr-download" onClick={download}>
        ↓ {t('qr.download')}
      </button>
      <button className="qr-print" onClick={() => window.print()}>
        {t('qr.print')}
      </button>
    </section>
  );
}
