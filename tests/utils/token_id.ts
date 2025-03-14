import crypto from 'crypto';

export function calculateERC721TokenId(chain: string, contract: Buffer, token_id: Buffer) {
    return Buffer.concat([Buffer.from(chain.toLowerCase(), 'utf8'), contract, token_id]);
}

export function bigintToBuffer(value: bigint) {
    // Convert to hex without padding and ensure even length
    let hex = value.toString(16);
    if (hex.length % 2 !== 0) hex = '0' + hex;

    // Add leading zero byte if highest bit is set (for positive numbers)
    if (hex.length >= 2 && /[89a-f]/i.test(hex[0])) {
        hex = '00' + hex;
    }

    const hexBuffer = Buffer.from(hex, 'hex');
    return hexBuffer;
}

export function randomTokenId() {
    return crypto.randomBytes(16);
}

export function randomTokenIdBigInt() {
    const randomBytes = crypto.randomBytes(8); // Returns a Buffer
    return BigInt("0x" + randomBytes.toString("hex"));
}
