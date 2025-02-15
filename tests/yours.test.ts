import { getTestEnvironment, TestEnvironment } from './utils/setup';
import { TIMEOUT_TEST } from './utils/constants';
import { createAccount } from './utils/ft4';
import { createErc1155Properties, createProjectMetadata, createTokenMetadata } from './utils/metadata';
import { randomCollectionName } from './utils/random';
import { encryption } from 'postchain-client';
import { op } from '@chromia/ft4';
import { beforeAll, describe, expect, it } from 'bun:test';

describe('Yours', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await getTestEnvironment();
  });

  it(
    'able to get module metadata',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);

      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const collection = randomCollectionName();
      const tokenMetadata = createTokenMetadata(project, collection);
      const erc1155Properties = createErc1155Properties();
      await session
        .transactionBuilder()
        .add(
          op(
            'importer.sft',
            project.name,
            collection,
            tokenMetadata.name,
            JSON.stringify(tokenMetadata.properties),
            [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
            'yours'
          )
        )
        .buildAndSend();

      const modules = await session.query<{ name: string; version: number; description: string }[]>('yours.get_supported_modules');
      expect(modules.length).toBe(1);
      expect(modules[0].name).toBe('tracker');
      expect(modules[0].version).toBe(3);
      expect(modules[0].description).toBe('Tracker module');
    },
    TIMEOUT_TEST
  );
});
