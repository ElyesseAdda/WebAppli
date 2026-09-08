"""
ZIP store (sans compression) + ZIP64, streamé par chunks.
Évite la limite 4 Go et le coût CPU du DEFLATE sur les gros fichiers.
"""

import struct
import zlib
from datetime import datetime
from typing import Dict, Generator, List, Optional, Tuple

ZIP64_LIMIT = 0xFFFFFFFF
CHUNK_SIZE = 8 * 1024 * 1024


def _dos_time(dt: Optional[datetime]) -> Tuple[int, int]:
    if dt is None:
        dt = datetime.now()
    return (
        (dt.hour << 11) | (dt.minute << 5) | (dt.second // 2),
        ((dt.year - 1980) << 9) | (dt.month << 5) | dt.day,
    )


def _should_skip_key(key: str, prefix: str) -> bool:
    return (
        key.endswith('/')
        or key.endswith('/.keep')
        or key.endswith('/.metadata.json')
        or key == prefix
    )


def _local_header(name: bytes, dt: Optional[datetime], zip64: bool) -> bytes:
    flag = 0x08 | 0x800  # data descriptor + UTF-8
    dos_time, dos_date = _dos_time(dt)
    version = 45 if zip64 else 20
    extra = struct.pack('<HHQQ', 0x0001, 16, 0, 0) if zip64 else b''
    size_field = ZIP64_LIMIT if zip64 else 0
    return struct.pack(
        '<IHHHHHIIIHH',
        0x04034B50,
        version,
        flag,
        0,
        dos_time,
        dos_date,
        0,
        size_field,
        size_field,
        len(name),
        len(extra),
    ) + name + extra


def _data_descriptor(crc: int, size: int, zip64: bool) -> bytes:
    crc &= 0xFFFFFFFF
    if zip64:
        return struct.pack('<IIQQ', 0x08074B50, crc, size, size)
    return struct.pack('<IIII', 0x08074B50, crc, size, size)


def _central_header(entry: Dict, zip64_eocd: bool) -> bytes:
    name = entry['name']
    crc = entry['crc'] & 0xFFFFFFFF
    size = entry['size']
    offset = entry['offset']
    dt = entry['dt']
    zip64 = size > ZIP64_LIMIT or offset > ZIP64_LIMIT
    dos_time, dos_date = _dos_time(dt)
    version = 45 if zip64 else 20

    extra = b''
    packed_size = size
    packed_offset = offset
    if zip64:
        extra = struct.pack('<HHQQQ', 0x0001, 24, size, size, offset)
        packed_size = ZIP64_LIMIT
        packed_offset = ZIP64_LIMIT

    return struct.pack(
        '<IHHHHHHIIIHHHHHII',
        0x02014B50,
        (3 << 8) | version,
        version,
        0x08 | 0x800,
        0,
        dos_time,
        dos_date,
        crc,
        packed_size,
        packed_size,
        len(name),
        len(extra),
        0,
        0,
        0,
        0,
        packed_offset,
    ) + name + extra


def _eocd(entries: List[Dict], cd_offset: int, cd_size: int) -> bytes:
    count = len(entries)
    needs_zip64 = (
        count >= 0xFFFF
        or cd_offset > ZIP64_LIMIT
        or cd_size > ZIP64_LIMIT
        or any(e['size'] > ZIP64_LIMIT or e['offset'] > ZIP64_LIMIT for e in entries)
    )
    parts = []
    if needs_zip64:
        parts.append(struct.pack(
            '<IQHHIIQQQQ',
            0x06064B50,
            44,
            45,
            45,
            0,
            0,
            count,
            count,
            cd_size,
            cd_offset,
        ))
        parts.append(struct.pack(
            '<IIQI',
            0x07064B50,
            0,
            cd_offset + cd_size,
            1,
        ))
        count_field = 0xFFFF
        size_field = ZIP64_LIMIT
        offset_field = ZIP64_LIMIT
    else:
        count_field = count
        size_field = cd_size
        offset_field = cd_offset

    parts.append(struct.pack(
        '<IHHHHIIH',
        0x06054B50,
        0,
        0,
        count_field,
        count_field,
        size_field,
        offset_field,
        0,
    ))
    return b''.join(parts)


def iter_s3_folder_zip(s3_client, bucket: str, prefix: str) -> Generator[bytes, None, None]:
    """
    Stream un ZIP store+ZIP64 d'un préfixe S3, sans charger les fichiers en mémoire.
    """
    if prefix and not prefix.endswith('/'):
        prefix += '/'

    paginator = s3_client.get_paginator('list_objects_v2')
    entries = []
    offset = 0

    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get('Contents') or []:
            key = obj['Key']
            if _should_skip_key(key, prefix):
                continue

            relative = key[len(prefix):]
            if not relative:
                continue

            name = relative.replace('\\', '/').encode('utf-8')
            known_size = int(obj.get('Size') or 0)
            zip64 = known_size > ZIP64_LIMIT or offset > ZIP64_LIMIT
            last_modified = obj.get('LastModified')
            dt = last_modified.replace(tzinfo=None) if last_modified else None
            local_offset = offset

            header = _local_header(name, dt, zip64)
            yield header
            offset += len(header)

            crc = 0
            actual_size = 0
            try:
                s3_obj = s3_client.get_object(Bucket=bucket, Key=key)
                body = s3_obj['Body']
                for chunk in body.iter_chunks(CHUNK_SIZE):
                    if not chunk:
                        continue
                    crc = zlib.crc32(chunk, crc)
                    actual_size += len(chunk)
                    yield chunk
                    offset += len(chunk)
            except Exception as e:
                print(f"Erreur lors du streaming de {key}: {e}")
                descriptor = _data_descriptor(0, 0, zip64)
                yield descriptor
                offset += len(descriptor)
                entries.append({
                    'name': name,
                    'crc': 0,
                    'size': 0,
                    'offset': local_offset,
                    'dt': dt,
                })
                continue

            zip64 = zip64 or actual_size > ZIP64_LIMIT
            descriptor = _data_descriptor(crc, actual_size, zip64)
            yield descriptor
            offset += len(descriptor)

            entries.append({
                'name': name,
                'crc': crc,
                'size': actual_size,
                'offset': local_offset,
                'dt': dt,
            })

    cd_offset = offset
    cd_chunks = []
    for entry in entries:
        record = _central_header(entry, False)
        cd_chunks.append(record)
        offset += len(record)
    cd_bytes = b''.join(cd_chunks)
    if cd_bytes:
        yield cd_bytes

    yield _eocd(entries, cd_offset, len(cd_bytes))
