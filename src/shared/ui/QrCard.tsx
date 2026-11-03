import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import type { Equipment } from '../../domain/equipment';
import { equipmentText } from '../../domain/localizedEquipment';
import { useEquipmentQrToken, useRotateEquipmentQrToken, isQrToken } from '../../features/equipment/qrQueries';
import { Modal } from './Modal';
import { ErrorMessage } from './ErrorMessage';
import { useToast } from './ToastProvider';

export function QrCard({ equipment }: { equipment: Equipment }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language === 'en' ? 'en' : 'ar';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tokenQuery = useEquipmentQrToken(equipment.id);
  const rotate = useRotateEquipmentQrToken(equipment.id);
  const toast = useToast();
  const [ready, setReady] = useState(false);
  const [canvasError, setCanvasError] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rotateError, setRotateError] = useState<unknown>(null);
  const token = tokenQuery.data;

  useEffect(() => {
    if (!token || !isQrToken(token)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let active = true;
    setReady(false);
    setCanvasError(false);
    const address = `${window.location.origin}${window.location.pathname}#/qr/${encodeURIComponent(token)}`;
    const qrCanvas = document.createElement('canvas');
    void QRCode.toCanvas(qrCanvas, address, { width: 190, margin: 1, color: { dark: '#0b2b34', light: '#ffffff' } })
      .then(() => {
        if (!active) return;
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
        setReady(true);
      })
      .catch(() => { if (active) setCanvasError(true); });
    return () => { active = false; };
  }, [token, language, t]);

  async function confirmRotation() {
    setRotateError(null);
    setReady(false);
    try {
      await rotate.mutateAsync();
      setConfirmOpen(false);
      toast.show(t('qr.rotated'));
    } catch (error) {
      setRotateError(error);
      setReady(true);
    }
  }

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
      {unavailable ? <ErrorMessage error={tokenQuery.error ?? new Error('QR_TOKEN_UNAVAILABLE')} retry={() => void tokenQuery.refetch()} /> : (
        <div className="qr-frame">
          <canvas ref={canvasRef} className={!ready || rotate.isPending ? 'qr-canvas-waiting' : ''} aria-label={t('qr.canvasLabel', { name: equipmentText(equipment, 'name', language) })} />
          {(tokenQuery.isPending || !ready || rotate.isPending) && !canvasError && <span className="qr-frame-loading" role="status">{t('qr.loading')}</span>}
        </div>
      )}
      {canvasError && <p role="alert">{t('qr.failed')}</p>}
      <div className="qr-equipment"><strong dir="auto">{equipmentText(equipment, 'name', language)}</strong><span>{equipment.code || equipment.slug}</span></div>
      <button className="qr-download" onClick={download} disabled={!ready || rotate.isPending || unavailable}>↓ {t('qr.download')}</button>
      <button className="qr-print" onClick={() => window.print()} disabled={!ready || rotate.isPending || unavailable}>{t('qr.print')}</button>
      <button className="qr-rotate" onClick={() => { setRotateError(null); setConfirmOpen(true); }} disabled={tokenQuery.isPending || unavailable || rotate.isPending}>{t('qr.rotate')}</button>
      {confirmOpen && <Modal title={t('qr.rotateTitle')} onClose={() => setConfirmOpen(false)}>
        <p className="qr-rotate-warning">{t('qr.rotateWarning')}</p>
        <ErrorMessage error={rotateError} />
        <div className="form-actions"><button className="outline-button" onClick={() => setConfirmOpen(false)}>{t('common.cancel')}</button><button className="primary-button" onClick={() => void confirmRotation()} disabled={rotate.isPending}>{rotate.isPending ? t('common.saving') : t('qr.rotateConfirm')}</button></div>
      </Modal>}
    </section>
  );
}
