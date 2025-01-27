import { encryption, newSignatureProvider } from 'postchain-client';

export const TIMEOUT_SETUP = 600000000;
export const TIMEOUT_TEST = 600000000;
export const ADMIN_PRIVKEY = '6dc0467700dcd993f3686ae39d81f06ababaa78bf3da4c330b9fc5297f0343fa';
export const ADMIN_SIGNATURE_PROVIDER = newSignatureProvider(encryption.makeKeyPair(ADMIN_PRIVKEY));
