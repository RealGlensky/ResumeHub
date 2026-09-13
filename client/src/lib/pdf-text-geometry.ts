// Geometric (not DOM-Range-based) text selection for PDF pages.
//
// pdf.js's text layer positions each text run as an absolutely-positioned
// <span>, which the browser's native Selection API is unreliable over --
// its hit-testing is built for normal document flow, and can misjudge
// boundaries when spans vary in font size or their boxes overlap slightly
// between lines. Since each rendered span's box already reflects the PDF's
// real font size and position (pdf.js computed it from the page's actual
// glyph transforms), we can hit-test against that geometry directly instead.

export interface PdfTextItemGeometry {
  text: string;
  rect: DOMRect;
  startOffset: number;
  endOffset: number;
}

export interface PageTextGeometry {
  items: PdfTextItemGeometry[];
  fullText: string;
}

// Reads the already-rendered text-layer spans (after pdf.js's
// TextLayer.render() has run) to build per-item geometry and cumulative
// character offsets, in the same reading order the offsets are stored in.
export function buildPageTextGeometry(textLayerContainer: HTMLElement): PageTextGeometry {
  const spans = Array.from(textLayerContainer.querySelectorAll('span'));
  const items: PdfTextItemGeometry[] = [];
  let cumulative = 0;
  let fullText = '';

  for (const span of spans) {
    const text = span.textContent ?? '';
    if (!text) continue;
    const rect = span.getBoundingClientRect();
    items.push({ text, rect, startOffset: cumulative, endOffset: cumulative + text.length });
    cumulative += text.length;
    fullText += text;
  }

  return { items, fullText };
}

// Finds the character offset closest to a screen point, using each item's
// actual rendered box rather than DOM flow hit-testing.
export function offsetAtPoint(items: PdfTextItemGeometry[], x: number, y: number): number {
  if (items.length === 0) return 0;

  // Prefer an item whose box actually contains the point vertically.
  let candidates = items.filter((it) => y >= it.rect.top && y <= it.rect.bottom);
  if (candidates.length === 0) {
    // Otherwise fall back to whichever item is vertically closest.
    let best = items[0];
    let bestDist = Infinity;
    for (const it of items) {
      const dist = Math.abs((it.rect.top + it.rect.bottom) / 2 - y);
      if (dist < bestDist) {
        bestDist = dist;
        best = it;
      }
    }
    candidates = [best];
  }

  let item = candidates[0];
  if (candidates.length > 1) {
    const found = candidates.find((it) => x >= it.rect.left && x <= it.rect.right);
    if (found) {
      item = found;
    } else if (x < candidates[0].rect.left) {
      item = candidates[0];
    } else {
      item = candidates[candidates.length - 1];
    }
  }

  if (x <= item.rect.left) return item.startOffset;
  if (x >= item.rect.right) return item.endOffset;

  const fraction = item.rect.width > 0 ? (x - item.rect.left) / item.rect.width : 0;
  const charIndex = Math.round(fraction * item.text.length);
  return item.startOffset + Math.max(0, Math.min(item.text.length, charIndex));
}
