import { encryption } from 'postchain-client';
import { createAccount } from './utils/ft4';
import { getTestEnvironment, TestEnvironment } from './utils/setup';
import { TIMEOUT_TEST } from './utils/constants';
import { createERC721TokenMetadata } from './utils/metadata';
import { randomName } from './utils/random';
import { beforeAll, describe, expect, it } from 'bun:test';
import { randomTokenId } from './utils/token_id';
import { define, mint } from './utils/operations/importer';

describe('Semi-Fungible Token', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await getTestEnvironment();
  });

  it('able to mint a Semi-Fungible Token', async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);

      const name = randomName();
      const tokenMetadata = createERC721TokenMetadata(session.blockchainRid, name);

      const tokenId = randomTokenId();
      const mintAmount = BigInt(2);

      await session
        .transactionBuilder()
        .add(define(tokenId, tokenMetadata, 'yours'))
        .add(mint(tokenId, mintAmount))
        .buildAndSend();

      const balance = await session.query<bigint>('yours.balance', {
        account_id: session.account.id,
        id: tokenId,
        issuing_chain: session.blockchainRid,
      });
      expect(balance).toBe(mintAmount);
    },
    TIMEOUT_TEST
  );
});
