import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { BOX_H, VGAP, TOP } from './layout';

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
