import net from 'node:net';
import { Buffer } from 'node:buffer';

/**
 * Minimal Modbus TCP server for lab bring-up.
 *
 * - Implements Function Code 0x03 (Read Holding Registers)
 * - Static register map: 0..9999 returns deterministic values
 *
 * This is intentionally tiny so we can validate board TCP transport and unit-id routing.
 */

const port = Number(process.env.MODBUS_TCP_PORT || 1502);

function u16(n: number) {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n & 0xffff, 0);
  return b;
}

function clampU16(n: number) {
  if (n < 0) return 0;
  if (n > 0xffff) return 0xffff;
  return n | 0;
}

function readHoldingRegister(addr: number): number {
  // deterministic value so end-to-end testing can assert expected ranges
  return clampU16((addr * 17 + 1234) % 65536);
}

const server = net.createServer((socket) => {
  socket.on('data', (chunk) => {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    // MBAP header: 7 bytes
    if (data.length < 8) return;
    const transactionId = data.readUInt16BE(0);
    const protocolId = data.readUInt16BE(2);
    const length = data.readUInt16BE(4);
    const unitId = data.readUInt8(6);
    const pdu = data.subarray(7);

    if (protocolId !== 0) return;
    if (length < 2) return;
    const fn = pdu.readUInt8(0);

    // Only FC=03 supported
    if (fn !== 0x03 || pdu.length < 5) {
      const exc = Buffer.from([fn | 0x80, 0x01]);
      const mbap = Buffer.concat([u16(transactionId), u16(0), u16(exc.length + 1), Buffer.from([unitId])]);
      socket.write(Buffer.concat([mbap, exc]));
      return;
    }

    const startAddr = pdu.readUInt16BE(1);
    const count = pdu.readUInt16BE(3);
    const safeCount = Math.min(Math.max(count, 0), 125);
    const byteCount = safeCount * 2;

    const values = Buffer.alloc(byteCount);
    for (let i = 0; i < safeCount; i++) {
      const v = readHoldingRegister(startAddr + i);
      values.writeUInt16BE(v, i * 2);
    }

    const respPdu = Buffer.concat([Buffer.from([0x03, byteCount]), values]);
    const mbap = Buffer.concat([u16(transactionId), u16(0), u16(respPdu.length + 1), Buffer.from([unitId])]);
    socket.write(Buffer.concat([mbap, respPdu]));
  });
});

server.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Modbus TCP lab simulator listening on 0.0.0.0:${port}`);
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));

