import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { BOX_H, VGAP, TOP } from './layout';

// The PDF is a printed page, not a themed screen — it always renders with
// the light palette regardless of the app's current theme, and never
// carries the "checked in" highlight (that's a live-editing aid, not
// something that belongs on a printed draw).
const LIGHT_TOKENS = {
  '--court': '#5C1D10', '--court-soft': '#8C2814', '--court-tint': '#F6EEE4', '--tape': '#241009',
  '--cork': '#B4823C', '--cork-soft': '#F1E4C9', '--cork-strong': '#6E4A12',
  '--hall': '#FBF7EE', '--card': '#FFFFFF', '--panel-alt': '#FBF6EA', '--line': '#E7DCC7', '--hairline': '#EFE6D2',
  '--ink': '#241A12', '--ink-2': '#6B5D4C', '--ink-3': '#A69A85',
  '--win': '#EAF3E1', '--win-border': '#4C7A3E', '--win-ink': '#3C5E30',
  '--bye': '#F1ECDF',
  '--danger': '#B23A2A', '--danger-soft': '#E8C2B8', '--danger-tint': '#FBEEE6', '--danger-ink': '#8C3A1E',
  '--info': '#3E7BB0', '--info-tint': '#EAF2F8',
  '--gold-strong': '#E0A800', '--gold-tint': '#FFE9A8',
  '--shadow-1': '0 1px 2px rgba(36,26,18,.06),0 1px 0 rgba(36,26,18,.04)',
  '--shadow-2': '0 10px 28px rgba(36,26,18,.16),0 2px 6px rgba(36,26,18,.08)',
};

function forceLightTheme(el) {
  Object.entries(LIGHT_TOKENS).forEach(([k, v]) => el.style.setProperty(k, v));
  // Custom properties alone aren't enough — `color`/`background` on
  // elements below this point that don't re-declare them (most of the
  // bracket markup) would otherwise inherit the *computed* dark-theme
  // value from <body> rather than re-resolving var(--ink) locally.
  el.style.color = 'var(--ink)';
  el.style.background = 'var(--hall)';
}

export function safeFileName(value) {
  return (value || 'badminton-draw')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'badminton-draw';
}

function getExportLayout(canvasEl, brSize) {
  const width = parseFloat(canvasEl.style.width) || canvasEl.scrollWidth;
  const height = parseFloat(canvasEl.style.height) || canvasEl.scrollHeight;
  const pageWidth = 990;
  const pageHeight = 720;
  const targetPages = Math.max(1, Math.ceil(brSize / 32));
  const scale = Math.min(1, pageWidth / width, (pageHeight * targetPages) / height);
  return {
    width,
    height,
    scale,
    scaledWidth: Math.ceil(width * scale),
    scaledHeight: Math.ceil(height * scale),
  };
}

function cloneCanvasForExport(canvasEl, layout) {
  const clone = canvasEl.cloneNode(true);
  clone.removeAttribute('id');
  clone.classList.add('export-canvas');
  clone.style.width = layout.width + 'px';
  clone.style.height = layout.height + 'px';
  clone.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
  // "Checked in" is a live-editing aid, not something a printed draw needs.
  clone.querySelectorAll('.slot.present').forEach((el) => el.classList.remove('present'));
  return clone;
}

function createPdfPageNode(canvasEl, layout, pageIndex, slotsPerPage, brSize) {
  const unit = BOX_H + VGAP;
  const firstSlot = pageIndex * slotsPerPage;
  const slotCount = Math.min(slotsPerPage, brSize - firstSlot);
  const pageHeight = TOP + slotCount * unit;

  const host = document.createElement('div');
  host.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    `width:${layout.width}px`,
    `height:${pageHeight}px`,
    'overflow:hidden',
    'background:#fff',
    'pointer-events:none',
    'z-index:9999',
  ].join(';');
  forceLightTheme(host);

  const page = document.createElement('div');
  page.style.cssText = [
    'position:relative',
    `width:${layout.width}px`,
    `height:${pageHeight}px`,
    'overflow:hidden',
    'background:#fff',
  ].join(';');

  const body = cloneCanvasForExport(canvasEl, layout);
  body.style.position = 'absolute';
  body.style.left = '0';
  body.style.top = '0';
  body.style.transform = `translateY(${-firstSlot * unit}px)`;
  body.style.transformOrigin = '0 0';
  page.appendChild(body);

  if (pageIndex > 0) {
    const labelsClip = document.createElement('div');
    labelsClip.style.cssText = [
      'position:absolute',
      'left:0',
      'top:0',
      `width:${layout.width}px`,
      `height:${TOP}px`,
      'overflow:hidden',
      'background:#fff',
      'z-index:2',
    ].join(';');

    const labels = cloneCanvasForExport(canvasEl, layout);
    labels.style.position = 'absolute';
    labels.style.left = '0';
    labels.style.top = '0';
    labelsClip.appendChild(labels);
    page.appendChild(labelsClip);
  }

  host.appendChild(page);
  return { host, page, pageHeight };
}

export async function exportBracketPdf(canvasEl, bracket, fileBaseName, onStatus) {
  if (!bracket) {
    onStatus('generate bracket first', 'err');
    return;
  }
  const layout = getExportLayout(canvasEl, bracket.size);

  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    const slotsPerPage = 32;
    const pages = Math.max(1, Math.ceil(bracket.size / slotsPerPage));
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
    const margin = 24;
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const boxWidth = pdfWidth - margin * 2;
    const boxHeight = pdfHeight - margin * 2;

    for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
      onStatus(`building PDF ${pageIndex + 1}/${pages}`, 'busy');
      const slice = createPdfPageNode(canvasEl, layout, pageIndex, slotsPerPage, bracket.size);
      document.body.appendChild(slice.host);

      const imageCanvas = await html2canvas(slice.page, {
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
        logging: false,
        width: layout.width,
        height: slice.pageHeight,
        windowWidth: layout.width,
        windowHeight: slice.pageHeight,
      });
      slice.host.remove();

      if (pageIndex > 0) pdf.addPage('a3', 'landscape');

      const imageData = imageCanvas.toDataURL('image/png');
      const fit = Math.min(boxWidth / imageCanvas.width, boxHeight / imageCanvas.height);
      const imageWidth = imageCanvas.width * fit;
      const imageHeight = imageCanvas.height * fit;
      pdf.addImage(
        imageData,
        'PNG',
        (pdfWidth - imageWidth) / 2,
        margin,
        imageWidth,
        imageHeight,
        undefined,
        'FAST'
      );
    }

    pdf.save(safeFileName(fileBaseName) + '.pdf');
    onStatus(`PDF saved - ${pages} page${pages === 1 ? '' : 's'}`);
  } catch (err) {
    onStatus('PDF export failed', 'err');
    console.error(err);
  }
}
