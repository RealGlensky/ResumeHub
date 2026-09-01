// Generic DOM text-range utilities shared by the DOCX (real HTML) and PDF
// (pdf.js text-layer overlay) viewers, so highlights/suggestions can anchor
// to a plain character offset within whichever container holds the text.

function offsetOfNode(container: Node, target: Node, targetOffset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let node = walker.nextNode();
  while (node) {
    if (node === target) {
      return offset + targetOffset;
    }
    offset += node.textContent?.length ?? 0;
    node = walker.nextNode();
  }
  return offset;
}

export interface SelectionOffsets {
  start: number;
  end: number;
  text: string;
}

// Returns the current window selection's [start, end) character offsets
// relative to `container`'s concatenated text, or null if there's no
// non-empty selection fully inside the container.
export function getSelectionOffsets(container: HTMLElement): SelectionOffsets | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return null;

  const text = range.toString();
  if (!text.trim()) return null;

  const start = offsetOfNode(container, range.startContainer, range.startOffset);
  const end = offsetOfNode(container, range.endContainer, range.endOffset);
  if (start === end) return null;

  return { start, end, text };
}

function findNodeAtOffset(container: HTMLElement, offset: number): { node: Text; offsetInNode: number } | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let cumulative = 0;
  let node = walker.nextNode() as Text | null;
  while (node) {
    const len = node.textContent?.length ?? 0;
    if (cumulative + len >= offset) {
      return { node, offsetInNode: offset - cumulative };
    }
    cumulative += len;
    node = walker.nextNode() as Text | null;
  }
  return null;
}

// Removes any highlight marks previously injected by applyHighlightMarks,
// restoring the container to plain text nodes. Call before reapplying, since
// the offset walk needs a clean text-node structure to stay accurate.
export function clearHighlightMarks(container: HTMLElement): void {
  container.querySelectorAll('mark[data-highlight-id]').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  });
  container.normalize();
}

export interface HighlightRange {
  id: number | string;
  start: number;
  end: number;
  className?: string;
}

// Wraps each range's text in a <mark data-highlight-id="..."> span. Applied
// from the highest offset down so inserting earlier marks doesn't shift the
// offsets of ranges still waiting to be applied.
export function applyHighlightMarks(container: HTMLElement, ranges: HighlightRange[]): void {
  const sorted = [...ranges].sort((a, b) => b.start - a.start);

  for (const { id, start, end, className } of sorted) {
    const startPos = findNodeAtOffset(container, start);
    const endPos = findNodeAtOffset(container, end);
    if (!startPos || !endPos) continue;

    const range = document.createRange();
    range.setStart(startPos.node, startPos.offsetInNode);
    range.setEnd(endPos.node, endPos.offsetInNode);

    const mark = document.createElement('mark');
    mark.dataset.highlightId = String(id);
    mark.className = className ?? 'resume-highlight';

    try {
      const contents = range.extractContents();
      mark.appendChild(contents);
      range.insertNode(mark);
    } catch (error) {
      console.error('Failed to apply highlight mark', id, error);
    }
  }
}
