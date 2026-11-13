// Pure TypeScript uncompressed ZIP (PKZip 2.0 / Store mode) archive builder.
// Requires zero npm dependencies; runs identically in modern browsers and Node.js.

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}

export function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFileInput {
  filename: string;
  content: string | Uint8Array;
}

export function createZipUint8Array(files: ZipFileInput[]): Uint8Array {
  const encoder = new TextEncoder();
  const fileEntries: {
    filenameBytes: Uint8Array;
    contentBytes: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  let currentOffset = 0;
  const localChunks: Uint8Array[] = [];

  for (const file of files) {
    const filenameBytes = encoder.encode(file.filename);
    const contentBytes =
      typeof file.content === 'string' ? encoder.encode(file.content) : file.content;
    const crc = computeCrc32(contentBytes);
    const offset = currentOffset;

    fileEntries.push({ filenameBytes, contentBytes, crc, offset });

    // Local file header (30 bytes)
    const header = new Uint8Array(30);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true); // Version needed to extract (2.0)
    view.setUint16(6, 0x0800, true); // General purpose bit flag (UTF-8 filename)
    view.setUint16(8, 0, true); // Compression method: 0 = Store
    view.setUint16(10, 0x4821, true); // Last mod file time (9:01 AM)
    view.setUint16(12, 0x5896, true); // Last mod file date (Nov 13, 2026)
    view.setUint32(14, crc, true); // CRC-32
    view.setUint32(18, contentBytes.length, true); // Compressed size
    view.setUint32(22, contentBytes.length, true); // Uncompressed size
    view.setUint16(26, filenameBytes.length, true); // Filename length
    view.setUint16(28, 0, true); // Extra field length

    localChunks.push(header, filenameBytes, contentBytes);
    currentOffset += 30 + filenameBytes.length + contentBytes.length;
  }

  const centralDirStart = currentOffset;
  const centralChunks: Uint8Array[] = [];

  for (const entry of fileEntries) {
    // Central directory file header (46 bytes)
    const header = new Uint8Array(46);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x02014b50, true); // Central directory signature
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 20, true); // Version needed to extract
    view.setUint16(8, 0x0800, true); // Flags (UTF-8)
    view.setUint16(10, 0, true); // Compression method: Store
    view.setUint16(12, 0x4821, true); // Mod time
    view.setUint16(14, 0x5896, true); // Mod date
    view.setUint32(16, entry.crc, true); // CRC-32
    view.setUint32(20, entry.contentBytes.length, true); // Compressed size
    view.setUint32(24, entry.contentBytes.length, true); // Uncompressed size
    view.setUint16(28, entry.filenameBytes.length, true); // Filename length
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // File comment length
    view.setUint16(34, 0, true); // Disk number start
    view.setUint16(36, 0, true); // Internal file attributes
    view.setUint32(38, 0, true); // External file attributes
    view.setUint32(42, entry.offset, true); // Relative offset of local header

    centralChunks.push(header, entry.filenameBytes);
    currentOffset += 46 + entry.filenameBytes.length;
  }

  const centralDirLength = currentOffset - centralDirStart;

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // End of central dir signature
  eocdView.setUint16(4, 0, true); // Number of this disk
  eocdView.setUint16(6, 0, true); // Disk where central directory starts
  eocdView.setUint16(8, fileEntries.length, true); // Number of central directory records on this disk
  eocdView.setUint16(10, fileEntries.length, true); // Total number of central directory records
  eocdView.setUint32(12, centralDirLength, true); // Size of central directory
  eocdView.setUint32(16, centralDirStart, true); // Offset of start of central directory
  eocdView.setUint16(20, 0, true); // Comment length

  // Assemble full byte array
  const totalLength = currentOffset + 22;
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of [...localChunks, ...centralChunks, eocd]) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}

export function createZipBlob(files: ZipFileInput[]): Blob {
  const bytes = createZipUint8Array(files);
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/zip' });
}
