import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Equipment } from '../../domain/equipment';
import { equipmentText } from '../../domain/localizedEquipment';
import { useEquipmentQrToken, isQrToken } from '../../features/equipment/qrQueries';
import { renderEquipmentQr } from '../../features/equipment/qrImage';
import { ErrorMessage } from './ErrorMessage';

export function QrCard({ equipment }: { equipment: Equipment }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language === 'en' ? 'en' : 'ar';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tokenQuery = useEquipmentQrToken(equipment.id);
  const [ready, setReady] = useState(false);
  const [canvasError, setCanvasError] = useState(false);
  const token = tokenQuery.data;

  useEffect(() => {
    if (!token || !isQrToken(token)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let active = true;
    setReady(false);
    setCanvasError(false);
    void renderEquipmentQr(canvas, {
      token,
      line1: t('qr.canvasLine1'),
      line2: t('qr.canvasLine2'),
    })
      .then(() => {
        if (!active) return;
        setReady(true);
      })
      .catch(() => {
        if (active) setCanvasError(true);
      });
    return () => {
      active = false;
    };
  }, [token, language, t, equipment]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const anchor = document.createElement('a');
    anchor.href = canvas.toDataURL('image/png');
    anchor.download = `${equipment.slug}-qr.png`;
    anchor.click();
  }

  const unavailable = tokenQuery.isError || (token !== undefined && !isQrToken(token));
  return (
    <section className="qr-panel">
      <div className="qr-overline">{t('qr.digitalCard')}</div>
      <h2>{t('qr.title')}</h2>
      <p>{t('qr.hint')}</p>
      {unavailable ? (
        <ErrorMessage
          error={tokenQuery.error ?? new Error('QR_TOKEN_UNAVAILABLE')}
          retry={() => void tokenQuery.refetch()}
        />
      ) : (
        <div className="qr-frame">
          <canvas
            ref={canvasRef}
            className={!ready ? 'qr-canvas-waiting' : ''}
            aria-label={t('qr.canvasLabel', { name: equipmentText(equipment, 'name', language) })}
          />
          {(tokenQuery.isPending || !ready) && !canvasError && (
            <span className="qr-frame-loading" role="status">
              {t('qr.loading')}
            </span>
          )}
        </div>
      )}
      {canvasError && <p role="alert">{t('qr.failed')}</p>}
      <div className="qr-equipment">
        <strong dir="auto">{equipmentText(equipment, 'name', language)}</strong>
        <span>{equipment.code || equipment.slug}</span>
      </div>
      <button className="qr-download" onClick={download} disabled={!ready || unavailable}>
        ↓ {t('qr.download')}
      </button>
      <button className="qr-print" onClick={() => window.print()} disabled={!ready || unavailable}>
        {t('qr.print')}
      </button>
    </section>
  );
}
