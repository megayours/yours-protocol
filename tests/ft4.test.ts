import { encryption } from 'postchain-client';
import { createAccount } from './utils/ft4';
import { getTestEnvironment, TestEnvironment } from './utils/setup';
import { expect, it } from 'bun:test';
import { beforeAll, describe } from 'bun:test';

describe('FT4', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await getTestEnvironment();
  });

  it('able to register an account to dapp1', async () => {
    const keyPair = encryption.makeKeyPair();
    const session = await createAccount(environment.dapp1Client, keyPair);
    expect(session).toBeDefined();
    expect(session.account).toBeDefined();
  });

  it('able to register an account to dapp2', async () => {
    const keyPair = encryption.makeKeyPair();
    const session = await createAccount(environment.dapp2Client, keyPair);
    expect(session).toBeDefined();
    expect(session.account).toBeDefined();
  });
});
