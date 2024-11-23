import { keccak256 } from 'ethereumjs-util';
import { publicKeyConvert } from 'secp256k1';
import { KeyPair } from 'postchain-client';

export function evmAddressFromKeyPair(keyPair: KeyPair) {
  const publicKey = keyPair.pubKey;
  const uncompressedPubKey = Buffer.from(publicKeyConvert(publicKey, false)).subarray(1);
  return Buffer.from(keccak256(uncompressedPubKey).slice(-20));
}
