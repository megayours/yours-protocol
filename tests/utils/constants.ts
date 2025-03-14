import { encryption, newSignatureProvider } from 'postchain-client';

export const TIMEOUT_SETUP = 600000000;
export const TIMEOUT_TEST = 600000000;
export const ADMIN_PRIVKEY = '6dc0467700dcd993f3686ae39d81f06ababaa78bf3da4c330b9fc5297f0343fa';
export const ADMIN_SIGNATURE_PROVIDER = newSignatureProvider(encryption.makeKeyPair(ADMIN_PRIVKEY));

export const SUBSCRIBED_CHAIN = 'Ethereum';
export const SUBSCRIBED_ERC721_CONTRACT = Buffer.from('aB00000000000000000000000000000000000000', 'hex');
export const SUBSCRIBED_ERC20_CONTRACT = Buffer.from('aB11111111111111111111111111111111111111', 'hex');