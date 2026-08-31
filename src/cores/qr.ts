/**
 * تولید QR کد (SVG) — با qrcode-generator (همان کتابخانه‌ای که BPB استفاده می‌کند)
 */
import qrcode from 'qrcode-generator';

/** SVG متن‌کدشده — برای نمایش در صفحات */
export function makeQrSvg(text: string, cellSize = 8, margin = 2): string {
  if (!text) return '';
  try {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize, margin });
  } catch {
    return '';
  }
}

/** خروجی PNG (data URL) — در صورت نیاز */
export function makeQrDataUrl(text: string, cellSize = 8, margin = 2): string {
  if (!text) return '';
  try {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createDataURL(cellSize, margin);
  } catch {
    return '';
  }
}
