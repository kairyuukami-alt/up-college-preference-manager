type PdfTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type PdfCell = PdfTextItem;

type PdfLine = {
  page: number;
  y: number;
  cells: PdfCell[];
};

type PdfColumn = {
  x: number;
  label: string;
};

export type PdfResultExtraction = {
  matrix: string[][];
  pageCount: number;
  warnings: string[];
};

function cleanText(value: string) {
  return value.replace(/\s+/gu, " ").trim();
}

function headerScore(value: string) {
  const text = value.toLowerCase();
  return [
    /registration|application|candidate\s*(?:id|no)|roll\s*(?:no|number)/u,
    /candidate\s*name|student\s*name/u,
    /neet\s*(?:air|rank)|all\s*india\s*rank|merit\s*rank/u,
    /allotted\s*(?:college|institute)|college|institute/u,
    /course|programme/u,
    /quota/u,
    /allotted\s*category|category/u,
    /remark|status|result/u,
  ].reduce((score, pattern) => score + Number(pattern.test(text)), 0);
}

function mergeLineCells(items: PdfTextItem[]) {
  const cells: PdfCell[] = [];
  for (const item of [...items].sort((a, b) => a.x - b.x)) {
    const previous = cells.at(-1);
    if (!previous) {
      cells.push({ ...item });
      continue;
    }
    const gap = item.x - (previous.x + previous.width);
    const mergeGap = Math.max(3.5, Math.min(previous.height, item.height) * 0.45);
    if (gap <= mergeGap) {
      const separator = gap > 0.6 && !previous.text.endsWith(" ") ? " " : "";
      previous.text = cleanText(`${previous.text}${separator}${item.text}`);
      previous.width = Math.max(previous.width, item.x + item.width - previous.x);
      previous.height = Math.max(previous.height, item.height);
    } else {
      cells.push({ ...item });
    }
  }
  return cells.filter((cell) => cell.text);
}

function groupLines(items: PdfTextItem[], page: number) {
  const lines: Array<{ page: number; y: number; items: PdfTextItem[] }> = [];
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const tolerance = Math.max(2, item.height * 0.28);
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (line) {
      line.items.push(item);
      line.y = (line.y * (line.items.length - 1) + item.y) / line.items.length;
    } else {
      lines.push({ page, y: item.y, items: [item] });
    }
  }
  return lines
    .sort((a, b) => b.y - a.y)
    .map((line): PdfLine => ({ page: line.page, y: line.y, cells: mergeLineCells(line.items) }))
    .filter((line) => line.cells.length > 0);
}

function lineText(line: PdfLine) {
  return cleanText(line.cells.map((cell) => cell.text).join(" "));
}

function findHeaderWindow(lines: PdfLine[]) {
  let bestIndex = -1;
  let bestScore = 0;
  lines.forEach((line, index) => {
    const score = headerScore(lineText(line));
    if (score > bestScore || (score === bestScore && score > 0 && line.cells.length > (lines[bestIndex]?.cells.length ?? 0))) {
      bestIndex = index;
      bestScore = score;
    }
  });
  if (bestIndex < 0 || bestScore < 2) return null;
  const indices = [bestIndex];
  for (const index of [bestIndex - 1, bestIndex + 1]) {
    if (index >= 0 && index < lines.length && headerScore(lineText(lines[index])) > 0) indices.push(index);
  }
  return { indices: indices.sort((a, b) => a - b), score: bestScore };
}

function clusterHeaderColumns(headerLines: PdfLine[]) {
  const clusters: Array<{ x: number; cells: PdfCell[] }> = [];
  for (const cell of headerLines.flatMap((line) => line.cells)) {
    const cluster = clusters.find((candidate) => Math.abs(candidate.x - cell.x) <= 14);
    if (cluster) {
      cluster.cells.push(cell);
      cluster.x = Math.min(cluster.x, cell.x);
    } else {
      clusters.push({ x: cell.x, cells: [cell] });
    }
  }
  return clusters
    .sort((a, b) => a.x - b.x)
    .map((cluster, index): PdfColumn => ({
      x: cluster.x,
      label: cleanText(cluster.cells.map((cell) => cell.text).join(" ")) || `Column ${index + 1}`,
    }));
}

function fallbackColumns(lines: PdfLine[]) {
  const buckets: Array<{ x: number; count: number }> = [];
  for (const cell of lines.flatMap((line) => line.cells)) {
    const bucket = buckets.find((candidate) => Math.abs(candidate.x - cell.x) <= 8);
    if (bucket) {
      bucket.count += 1;
      bucket.x = (bucket.x * (bucket.count - 1) + cell.x) / bucket.count;
    } else {
      buckets.push({ x: cell.x, count: 1 });
    }
  }
  const minimumFrequency = Math.max(2, Math.floor(lines.length * 0.08));
  return buckets
    .filter((bucket) => bucket.count >= minimumFrequency)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .sort((a, b) => a.x - b.x)
    .map((bucket, index): PdfColumn => ({ x: bucket.x, label: `Column ${index + 1}` }));
}

function uniqueColumnLabels(columns: PdfColumn[]) {
  const used = new Map<string, number>();
  return columns.map((column, index) => {
    const base = cleanText(column.label) || `Column ${index + 1}`;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return { ...column, label: count ? `${base} (${count + 1})` : base };
  });
}

function assignLine(line: PdfLine, columns: PdfColumn[]) {
  const values = columns.map(() => "");
  const boundaries = columns.slice(0, -1).map((column, index) => (column.x + columns[index + 1].x) / 2);
  for (const cell of line.cells) {
    let columnIndex = boundaries.findIndex((boundary) => cell.x < boundary);
    if (columnIndex < 0) columnIndex = columns.length - 1;
    values[columnIndex] = cleanText(`${values[columnIndex]} ${cell.text}`);
  }
  return values;
}

function identifierColumn(columns: PdfColumn[]) {
  const explicit = columns.findIndex((column) => /registration|application|candidate\s*(?:id|no)|roll\s*(?:no|number)|neet\s*(?:air|rank)|all\s*india\s*rank|merit\s*rank/i.test(column.label));
  if (explicit >= 0) return explicit;
  const serial = columns.findIndex((column) => /^(?:s\.?\s*no|sr\.?\s*no|serial)/i.test(column.label));
  return serial === 0 && columns.length > 1 ? 1 : 0;
}

function looksLikeIdentifier(value: string) {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/gu, "");
  if (!compact || compact.length > 24) return false;
  if (/^\d{1,12}$/u.test(compact)) return true;
  return compact.length >= 5 && /\d{3}/u.test(compact) && /^[A-Z0-9]+$/u.test(compact);
}

function appendContinuation(target: string[], continuation: string[]) {
  continuation.forEach((value, index) => {
    if (value) target[index] = cleanText(`${target[index]} ${value}`);
  });
}

function parseRows(pages: PdfLine[][], columns: PdfColumn[], headerIndices: Map<number, Set<number>>) {
  const rows: string[][] = [];
  const idColumn = identifierColumn(columns);
  let current: string[] | null = null;
  for (const lines of pages) {
    lines.forEach((line, lineIndex) => {
      if (headerIndices.get(line.page)?.has(lineIndex) || headerScore(lineText(line)) >= 3) return;
      const text = lineText(line);
      if (/^(?:page\s+)?\d+\s*(?:of\s*\d+)?$/iu.test(text) || /generated\s+on|printed\s+on/iu.test(text)) return;
      const values = assignLine(line, columns);
      if (looksLikeIdentifier(values[idColumn])) {
        if (current) rows.push(current);
        current = values;
      } else if (current && values.some(Boolean)) {
        appendContinuation(current, values);
      }
    });
    if (current) {
      rows.push(current);
      current = null;
    }
  }
  return rows.filter((row) => looksLikeIdentifier(row[idColumn]));
}

export async function extractPdfResultTable(file: File): Promise<PdfResultExtraction> {
  const [pdfjs, workerModule] = await Promise.all([
    import("pdfjs-dist/build/pdf.mjs"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    isEvalSupported: false,
    useWorkerFetch: false,
  });
  const document = await task.promise;
  const pages: PdfLine[][] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent({ disableNormalization: false });
      const items = content.items.flatMap((value): PdfTextItem[] => {
        if (!("str" in value) || !Array.isArray(value.transform)) return [];
        const text = cleanText(value.str);
        if (!text) return [];
        return [{
          text,
          x: Number(value.transform[4] ?? 0),
          y: Number(value.transform[5] ?? 0),
          width: Number(value.width ?? 0),
          height: Math.max(1, Number(value.height ?? value.transform[3] ?? 1)),
        }];
      });
      pages.push(groupLines(items, pageNumber));
    }
  } finally {
    // Some PDF.js/Vite worker combinations expose a document proxy whose
    // destroy method delegates to an unavailable worker method. Cleanup must
    // never turn a successful extraction into a failed import.
    try {
      const destroyLoadingTask = Reflect.get(task, "destroy");
      if (typeof destroyLoadingTask === "function") {
        await destroyLoadingTask.call(task);
      }
    } catch {
      // The browser can safely reclaim the reader after the import completes.
    }
  }

  const allLines = pages.flat();
  if (!allLines.length) throw new Error("This PDF has no selectable result text. Upload the authority's original digital PDF, not a scan or photo.");
  const primaryPage = pages.find((page) => findHeaderWindow(page)) ?? pages[0];
  const primaryHeader = findHeaderWindow(primaryPage);
  let columns = primaryHeader
    ? clusterHeaderColumns(primaryHeader.indices.map((index) => primaryPage[index]))
    : fallbackColumns(allLines);
  if (columns.length < 2) throw new Error("A result table could not be detected in this PDF.");
  columns = uniqueColumnLabels(columns);

  const headerIndices = new Map<number, Set<number>>();
  pages.forEach((page) => {
    const header = findHeaderWindow(page);
    if (header) headerIndices.set(page[0]?.page ?? 0, new Set(header.indices));
  });
  const rows = parseRows(pages, columns, headerIndices);
  if (!rows.length) throw new Error("No candidate result rows could be detected. Confirm that this is a public allotment-result PDF.");

  const warnings: string[] = [];
  if (!primaryHeader || primaryHeader.score < 4) warnings.push("The PDF headings were only partly recognised. Check the column mapping and preview carefully.");
  if (columns.some((column) => /^Column \d+$/u.test(column.label))) warnings.push("Some column names could not be read, so manual mapping is required.");
  return {
    matrix: [columns.map((column) => column.label), ...rows],
    pageCount: pages.length,
    warnings,
  };
}
