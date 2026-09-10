import { getD1, getR2 } from "@/db";

const encoder = new TextEncoder();
const CRC_TABLE = new Uint32Array(256);
for (let value = 0; value < 256; value += 1) {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  CRC_TABLE[value] = crc >>> 0;
}

function updateCrc(crc: number, chunk: Uint8Array) {
  let value = crc;
  for (const byte of chunk) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return value >>> 0;
}

function header(size: number) {
  const bytes = new Uint8Array(size);
  return { bytes, view: new DataView(bytes.buffer) };
}

function dosDateTime(timestamp: number) {
  const date = new Date(timestamp);
  const year = Math.max(1980, date.getUTCFullYear());
  return {
    date: ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate(),
    time: (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2),
  };
}

function safeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|\r\n]+/gu, "-").replace(/^\.+/u, "").trim().slice(0, 180) || "document";
}

type CentralEntry = {
  name: Uint8Array;
  crc: number;
  size: number;
  offset: number;
  date: number;
  time: number;
};

export async function documentsZipResponse(listId: string) {
  const student = await getD1().prepare("SELECT student_name AS studentName FROM preference_lists WHERE id = ?").bind(listId).first();
  if (!student) return null;
  const rows = await getD1().prepare(`
    SELECT document_name AS documentName, original_filename AS originalFilename,
           object_key AS objectKey, uploaded_at AS uploadedAt
    FROM profile_documents WHERE list_id = ? ORDER BY uploaded_at ASC
  `).bind(listId).all();
  const documents = rows.results as Record<string, unknown>[];
  const archiveName = `${safeFilename(String(student.studentName)) || "student"}-documents.zip`;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let offset = 0;
      const entries: CentralEntry[] = [];
      const usedNames = new Map<string, number>();
      const emit = (bytes: Uint8Array) => { controller.enqueue(bytes); offset += bytes.byteLength; };
      try {
        for (const document of documents) {
          const base = safeFilename(`${String(document.documentName)} - ${String(document.originalFilename)}`);
          const seen = (usedNames.get(base) ?? 0) + 1;
          usedNames.set(base, seen);
          const filename = seen === 1 ? base : `${base}-${seen}`;
          const name = encoder.encode(filename);
          const stamp = dosDateTime(Number(document.uploadedAt));
          const localOffset = offset;
          const local = header(30 + name.length);
          local.view.setUint32(0, 0x04034b50, true);
          local.view.setUint16(4, 20, true);
          local.view.setUint16(6, 0x0808, true);
          local.view.setUint16(8, 0, true);
          local.view.setUint16(10, stamp.time, true);
          local.view.setUint16(12, stamp.date, true);
          local.view.setUint16(26, name.length, true);
          local.bytes.set(name, 30);
          emit(local.bytes);

          const object = await getR2().get(String(document.objectKey));
          if (!object?.body) throw new Error(`Stored file is unavailable: ${filename}`);
          const reader = object.body.getReader();
          let crc = 0xffffffff;
          let size = 0;
          while (true) {
            const result = await reader.read();
            if (result.done) break;
            const chunk = result.value;
            crc = updateCrc(crc, chunk);
            size += chunk.byteLength;
            emit(chunk);
          }
          crc = (crc ^ 0xffffffff) >>> 0;
          const descriptor = header(16);
          descriptor.view.setUint32(0, 0x08074b50, true);
          descriptor.view.setUint32(4, crc, true);
          descriptor.view.setUint32(8, size, true);
          descriptor.view.setUint32(12, size, true);
          emit(descriptor.bytes);
          entries.push({ name, crc, size, offset: localOffset, ...stamp });
        }

        const centralOffset = offset;
        for (const entry of entries) {
          const central = header(46 + entry.name.length);
          central.view.setUint32(0, 0x02014b50, true);
          central.view.setUint16(4, 20, true);
          central.view.setUint16(6, 20, true);
          central.view.setUint16(8, 0x0808, true);
          central.view.setUint16(10, 0, true);
          central.view.setUint16(12, entry.time, true);
          central.view.setUint16(14, entry.date, true);
          central.view.setUint32(16, entry.crc, true);
          central.view.setUint32(20, entry.size, true);
          central.view.setUint32(24, entry.size, true);
          central.view.setUint16(28, entry.name.length, true);
          central.view.setUint32(42, entry.offset, true);
          central.bytes.set(entry.name, 46);
          emit(central.bytes);
        }
        const end = header(22);
        end.view.setUint32(0, 0x06054b50, true);
        end.view.setUint16(8, entries.length, true);
        end.view.setUint16(10, entries.length, true);
        end.view.setUint32(12, offset - centralOffset, true);
        end.view.setUint32(16, centralOffset, true);
        emit(end.bytes);
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${archiveName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
