import { encryption } from 'postchain-client';
import { createAccount } from './utils/ft4';
import { getTestEnvironment, teardown, TestEnvironment } from './utils/setup';
import { TIMEOUT_SETUP, TIMEOUT_TEST } from './utils/constants';
import { op } from '@chromia/ft4';
import { createErc1155Properties, createProjectMetadata, createTokenMetadata } from './utils/metadata';
import { expect } from '@jest/globals';
import { randomCollectionName } from './utils/random';
import { serializeTokenMetadata, TokenMetadata } from '@megayours/sdk';

describe('Semi-Fungible Token', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await getTestEnvironment();
  }, TIMEOUT_SETUP);

  afterAll(async () => {
    await teardown(environment.network, environment.chromiaNode, environment.postgres);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }, TIMEOUT_SETUP);

  it(
    'able to create a Semi-Fungible Token',
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
            serializeTokenMetadata(tokenMetadata),
            [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
            'yours'
          )
        )
        .buildAndSend();
    },
    TIMEOUT_TEST
  );

  it(
    'able to mint a Semi-Fungible Token',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);

      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const collection = randomCollectionName();
      const tokenMetadata = createTokenMetadata(project, collection);
      const erc1155Properties = createErc1155Properties();
      const mintAmount = 2;
      await session
        .transactionBuilder()
        .add(
          op(
            'importer.sft',
            serializeTokenMetadata(tokenMetadata),
            [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
            'yours'
          )
        )
        .add(op('importer.mint', project.name, collection, 0, mintAmount))
        .buildAndSend();

      const balance = await session.query<number>('yours.balance', {
        account_id: session.account.id,
        project: project.name,
        collection,
        token_id: 0,
      });
      expect(balance).toBe(mintAmount);
    },
    TIMEOUT_TEST
  );

  it(
    'SFT has correct metadata',
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
            serializeTokenMetadata(tokenMetadata),
            [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
            'yours'
          )
        )
        .add(op('importer.mint', project.name, collection, 0, 1))
        .buildAndSend();

      const metadata = await session.query<TokenMetadata>('yours.metadata', {
        project: project.name,
        collection,
        token_id: 0,
      });
      expect(metadata.name).toBe(tokenMetadata.name);
      expect(metadata.properties['simple_property']).toEqual(tokenMetadata.properties.simple_property);
      expect(metadata.properties['rich_property']['name']).toEqual(tokenMetadata.properties.rich_property['name']);
      expect(metadata.properties['rich_property']['value']).toEqual(tokenMetadata.properties.rich_property['value']);
      expect(metadata.properties['rich_property']['display_value']).toEqual(tokenMetadata.properties.rich_property['display_value']);
      expect(metadata.properties['rich_property']['class']).toEqual(tokenMetadata.properties.rich_property['class']);
      expect(metadata.properties['rich_property']['css']['color']).toEqual(tokenMetadata.properties.rich_property['css']['color']);
      expect(metadata.properties['rich_property']['css']['font-weight']).toEqual(
        tokenMetadata.properties.rich_property['css']['font-weight']
      );
      expect(metadata.properties['rich_property']['css']['text-decoration']).toEqual(
        tokenMetadata.properties.rich_property['css']['text-decoration']
      );
      expect(metadata.yours.modules).toBeDefined();
      expect(metadata.yours.project).toEqual(tokenMetadata.yours.project);
      expect(metadata.yours.collection).toEqual(tokenMetadata.yours.collection);
    },
    TIMEOUT_TEST
  );

  it(
    'Unable to transfer soulbound SFT',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);

      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const collection = randomCollectionName();
      const tokenMetadata = createTokenMetadata(project, collection);
      const erc1155Properties = createErc1155Properties();

      // First, create the soulbound SFT and mint it
      await session
        .transactionBuilder()
        .add(
          op(
            'importer.sft',
            serializeTokenMetadata(tokenMetadata),
            [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
            'soulbound'
          )
        )
        .add(op('importer.mint', project.name, collection, 0, 1))
        .buildAndSend();

      // Now, try to transfer the soulbound SFT and expect it to fail
      await expect(
        session
          .transactionBuilder()
          .add(op('mkpl.transfer', project.name, collection, 0, 1, Buffer.from('DEADBEEF', 'hex')))
          .buildAndSend()
      ).rejects.toThrow('Only tokens of type yours can be transferred');
    },
    TIMEOUT_TEST
  );
});
