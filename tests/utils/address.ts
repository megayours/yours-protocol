import { keccak256 } from 'ethereumjs-util';
import { publicKeyConvert } from 'secp256k1';
import { KeyPair } from 'postchain-client';
import crypto from 'crypto';

export function evmAddressFromKeyPair(keyPair: KeyPair) {
  const publicKey = keyPair.pubKey;
  const uncompressedPubKey = Buffer.from(publicKeyConvert(publicKey, false)).subarray(1);
  return Buffer.from(keccak256(uncompressedPubKey).slice(-20));
}

/**
 * Generates a random Ethereum-style wallet address
 * @returns A Buffer containing a random 20-byte Ethereum address
 */
export function generateRandomWallet(): Buffer {
  // Generate a random 20-byte buffer (Ethereum addresses are 20 bytes)
  const randomAddress = crypto.randomBytes(20);
  
  // Return the buffer directly - this matches the format used in the tests
  return randomAddress;
}

/**
 * Generates a random Ethereum-style wallet address and returns it in the 0x-prefixed hex format
 * @returns A string containing a 0x-prefixed hex Ethereum address
 */
export function generateRandomWalletHex(): string {
  return '0x' + generateRandomWallet().toString('hex');
}
