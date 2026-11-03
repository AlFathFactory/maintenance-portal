import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Equipment } from '../../domain/equipment';
import { equipmentText } from '../../domain/localizedEquipment';
import { repository } from '../../services';
import { useToast } from '../../shared/ui/ToastProvider';
import { isQrToken } from './qrQueries';
import { qrCanvasToBlob, renderEquipmentQr } from './qrImage';

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function BulkQrDownloadButton({ equipment }: { equipment: Equipment[] }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [done, setDone] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(false);
  const language = i18n.language === 'en' ? 'en' : 'ar';

  async function downloadAll() {
    if (downloading || equipment.length === 0) return;
    setDownloading(true);
    setDone(0);
    setError(false);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const folders = {
        machine: zip.folder('Machines')!,
        crane: zip.folder('Cranes')!,
      };
      let nextIndex = 0;
      let failure: unknown = null;
      await Promise.all(
        Array.from({ length: Math.min(3, equipment.length) }, async () => {
          while (!failure && nextIndex < equipment.length) {
            try {
              const item = equipment[nextIndex++];
              const token = await repository.getEquipmentQrToken(item.id);
              if (!isQrToken(token)) throw new Error('QR_TOKEN_UNAVAILABLE');
              const canvas = document.createElement('canvas');
              await renderEquipmentQr(canvas, {
                token,
                name: equipmentText(item, 'name', language),
                code: item.code || item.slug,
                line1: t('qr.canvasLine1'),
                line2: t('qr.canvasLine2'),
              });
              const image = await qrCanvasToBlob(canvas);
              folders[item.type].file(
                `${safeFileName(item.slug)}-${item.id.slice(0, 8)}.png`,
                image,
              );
              setDone((count) => count + 1);
            } catch (cause) {
              failure = cause;
            }
          }
        }),
      );
      if (failure) throw failure;
      const archive = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const url = URL.createObjectURL(archive);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'maintenance-qr-codes.zip';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.show(t('qrBulk.complete', { count: equipment.length }));
    } catch {
      setError(true);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="qr-bulk-action">
      <button
        className="outline-button"
        type="button"
        onClick={() => void downloadAll()}
        disabled={downloading || equipment.length === 0}
      >
        {downloading
          ? t('qrBulk.progress', { done, total: equipment.length })
          : t('qrBulk.download')}
      </button>
      {error && (
        <span className="qr-bulk-error" role="alert">
          {t('qrBulk.failed')}
        </span>
      )}
    </div>
  );
}
