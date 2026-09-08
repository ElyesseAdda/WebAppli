/**
 * Écriture d'un ZIP "store" (sans compression) + ZIP64, en streaming vers le disque.
 */

const ZIP64_LIMIT = 0xFFFFFFFF;
const encoder = new TextEncoder();

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let j = 0; j < 8; j += 1) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    table[i] = crc >>> 0;
  }
  return table;
})();

export function crc32(data, crc = 0) {
  const table = CRC_TABLE;
  let current = (~crc) >>> 0;
  const length = data.length;
  let index = 0;
  for (; index + 8 <= length; index += 8) {
    current = table[(current ^ data[index]) & 0xFF] ^ (current >>> 8);
    current = table[(current ^ data[index + 1]) & 0xFF] ^ (current >>> 8);
    current = table[(current ^ data[index + 2]) & 0xFF] ^ (current >>> 8);
    current = table[(current ^ data[index + 3]) & 0xFF] ^ (current >>> 8);
    current = table[(current ^ data[index + 4]) & 0xFF] ^ (current >>> 8);
    current = table[(current ^ data[index + 5]) & 0xFF] ^ (current >>> 8);
    current = table[(current ^ data[index + 6]) & 0xFF] ^ (current >>> 8);
    current = table[(current ^ data[index + 7]) & 0xFF] ^ (current >>> 8);
  }
  for (; index < length; index += 1) {
    current = table[(current ^ data[index]) & 0xFF] ^ (current >>> 8);
  }
  return (~current) >>> 0;
}

const concatParts = (parts) => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
};

const concat = (...parts) => concatParts(parts);

const u16 = (value) => {
  const buf = new Uint8Array(2);
  new DataView(buf.buffer).setUint16(0, value >>> 0, true);
  return buf;
};

const u32 = (value) => {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, value >>> 0, true);
  return buf;
};

const u64 = (value) => {
  const buf = new Uint8Array(8);
  const view = new DataView(buf.buffer);
  const big = BigInt(value);
  view.setUint32(0, Number(big & 0xFFFFFFFFn), true);
  view.setUint32(4, Number(big >> 32n), true);
  return buf;
};

const dosDateTime = (date) => {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const day = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date: day };
};

export function createZipStoreWriter(writable) {
  const entries = [];
  let offset = 0;

  const write = async (bytes) => {
    await writable.write(bytes);
    offset += bytes.length;
  };

  return {
    async addFile({ name, lastModified, stream, onChunk, sizeHint = 0 }) {
      const nameBytes = encoder.encode(name.replace(/\\/g, '/'));
      const startOffset = offset;
      const { time, date } = dosDateTime(lastModified);
      let useZip64 = startOffset > ZIP64_LIMIT || sizeHint > ZIP64_LIMIT;
      const flag = 0x08 | 0x800;
      const extra = useZip64 ? concat(u16(0x0001), u16(16), u64(0), u64(0)) : new Uint8Array(0);
      const sizeField = useZip64 ? ZIP64_LIMIT : 0;

      await write(concat(
        u32(0x04034b50),
        u16(useZip64 ? 45 : 20),
        u16(flag),
        u16(0),
        u16(time),
        u16(date),
        u32(0),
        u32(sizeField),
        u32(sizeField),
        u16(nameBytes.length),
        u16(extra.length),
        nameBytes,
        extra,
      ));

      let crc = 0;
      let size = 0;
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value || value.length === 0) continue;
        crc = crc32(value, crc);
        size += value.length;
        await write(value);
        onChunk?.(value.length);
      }

      useZip64 = useZip64 || size > ZIP64_LIMIT;
      const descriptor = useZip64
        ? concat(u32(0x08074b50), u32(crc), u64(size), u64(size))
        : concat(u32(0x08074b50), u32(crc), u32(size), u32(size));
      await write(descriptor);

      entries.push({
        nameBytes,
        crc,
        size,
        offset: startOffset,
        time,
        date,
        zip64: useZip64 || startOffset > ZIP64_LIMIT,
      });
    },

    async finalize() {
      const cdOffset = offset;
      const cdParts = [];
      entries.forEach((entry) => {
        const zip64 = entry.zip64 || entry.size > ZIP64_LIMIT || entry.offset > ZIP64_LIMIT;
        const extra = zip64
          ? concat(u16(0x0001), u16(24), u64(entry.size), u64(entry.size), u64(entry.offset))
          : new Uint8Array(0);
        cdParts.push(concat(
          u32(0x02014b50),
          u16((3 << 8) | (zip64 ? 45 : 20)),
          u16(zip64 ? 45 : 20),
          u16(0x08 | 0x800),
          u16(0),
          u16(entry.time),
          u16(entry.date),
          u32(entry.crc),
          u32(zip64 ? ZIP64_LIMIT : entry.size),
          u32(zip64 ? ZIP64_LIMIT : entry.size),
          u16(entry.nameBytes.length),
          u16(extra.length),
          u16(0),
          u16(0),
          u16(0),
          u32(0),
          u32(zip64 ? ZIP64_LIMIT : entry.offset),
          entry.nameBytes,
          extra,
        ));
      });
      const cdBytes = concatParts(cdParts);
      if (cdBytes.length) {
        await write(cdBytes);
      }

      const count = entries.length;
      const cdSize = cdBytes.length;
      const needsZip64 = count >= 0xFFFF
        || cdOffset > ZIP64_LIMIT
        || cdSize > ZIP64_LIMIT
        || entries.some((entry) => entry.size > ZIP64_LIMIT || entry.offset > ZIP64_LIMIT);

      if (needsZip64) {
        await write(concat(
          u32(0x06064b50),
          u64(44),
          u16(45),
          u16(45),
          u32(0),
          u32(0),
          u64(count),
          u64(count),
          u64(cdSize),
          u64(cdOffset),
        ));
        await write(concat(
          u32(0x07064b50),
          u32(0),
          u64(cdOffset + cdSize),
          u32(1),
        ));
      }

      await write(concat(
        u32(0x06054b50),
        u16(0),
        u16(0),
        u16(needsZip64 ? 0xFFFF : count),
        u16(needsZip64 ? 0xFFFF : count),
        u32(needsZip64 ? ZIP64_LIMIT : cdSize),
        u32(needsZip64 ? ZIP64_LIMIT : cdOffset),
        u16(0),
      ));
    },
  };
}

export const canSaveToDisk = () => typeof window.showSaveFilePicker === 'function';

export async function pickZipSaveHandle(fileName) {
  return window.showSaveFilePicker({
    suggestedName: fileName.endsWith('.zip') ? fileName : `${fileName}.zip`,
    types: [{
      description: 'Archive ZIP',
      accept: { 'application/zip': ['.zip'] },
    }],
  });
}
