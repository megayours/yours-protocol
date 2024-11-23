import { IClient, KeyPair } from 'postchain-client';
import {
  createKeyStoreInteractor,
  createSingleSigAuthDescriptorRegistration,
  registerAccount,
  registrationStrategy,
  createInMemoryEvmKeyStore,
  AuthFlag,
  createInMemoryLoginKeyStore,
} from '@chromia/ft4';
import { createMegaYoursClient, IMegaYoursClient } from '@megayours/sdk';

export async function createAccount(client: IClient, keyPair: KeyPair): Promise<IMegaYoursClient> {
  const evmKeyStore = createInMemoryEvmKeyStore(keyPair);
  const keyStoreInteractor = createKeyStoreInteractor(client, evmKeyStore);

  const accounts = await keyStoreInteractor.getAccounts();
  if (accounts.length > 0) {
    throw new Error('Account already exists');
  }

  const authDescriptor = createSingleSigAuthDescriptorRegistration([AuthFlag.Account, AuthFlag.Transfer], evmKeyStore.id);

  const loginKeyStore = createInMemoryLoginKeyStore();
  const { session } = await registerAccount(
    client,
    evmKeyStore,
    registrationStrategy.open(authDescriptor, {
      loginKeyStore,
      config: {
        rules: null,
        flags: [],
      },
    })
  );

  return createMegaYoursClient(session);
}
