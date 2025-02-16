import { encryption } from 'postchain-client';
import { createAccount } from './utils/ft4';
import { getTestEnvironment, TestEnvironment } from './utils/setup';
import { TIMEOUT_TEST } from './utils/constants';
import { op } from '@chromia/ft4';
import { createErc1155Properties, createProjectMetadata, createTokenMetadata } from './utils/metadata';
import { randomCollectionName } from './utils/random';
import { TokenMetadata } from '@megayours/sdk';
import { beforeAll, describe, expect, it } from 'bun:test';

describe('Semi-Fungible Token', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await getTestEnvironment();
  });

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
            project.name,
            collection,
            tokenMetadata.name,
            JSON.stringify(tokenMetadata.properties),
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
      const mintAmount = BigInt(2);
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
        .add(op('importer.mint', project.name, collection, BigInt(0), mintAmount))
        .buildAndSend();

      const balance = await session.query<bigint>('yours.balance', {
        account_id: session.account.id,
        project_name: project.name,
        project_blockchain_rid: session.blockchainRid,
        collection,
        token_id: BigInt(0),
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
            project.name,
            collection,
            tokenMetadata.name,
            JSON.stringify(tokenMetadata.properties),
            [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
            'yours'
          )
        )
        .add(op('importer.mint', project.name, collection, BigInt(0), BigInt(1)))
        .buildAndSend();

      const metadata = await session.query<TokenMetadata>('yours.metadata', {
        project_name: project.name,
        project_blockchain_rid: session.blockchainRid,
        collection,
        token_id: BigInt(0),
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
            project.name,
            collection,
            tokenMetadata.name,
            JSON.stringify(tokenMetadata.properties),
            [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
            'soulbound'
          )
        )
        .add(op('importer.mint', project.name, collection, BigInt(0), BigInt(1)))
        .buildAndSend();

      // Now, try to transfer the soulbound SFT and expect it to fail
      try {
        await session
          .transactionBuilder()
          .add(op('mkpl.transfer', project.name, project.blockchain_rid, collection, BigInt(0), BigInt(1), Buffer.from('DEADBEEF', 'hex')))
          .buildAndSend();
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Only tokens of type yours can be transferred');
      }
    },
    TIMEOUT_TEST
  );

  it(
    'mint saves a history entry',
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
            project.name,
            collection,
            tokenMetadata.name,
            JSON.stringify(tokenMetadata.properties),
            [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
            'soulbound'
          )
        )
        .add(op('importer.mint', project.name, collection, BigInt(0), BigInt(1)))
        .buildAndSend();

      const history = await session.history.getTransfers({ account_id: session.account.id }, 1, null);

      expect(history.data.length).toBe(1);
      expect(history.data[0].amount).toBe(BigInt(1));
      expect(history.data[0].blockchain_rid).toBeNull(); // Not a crosschain transfer
      expect(history.data[0].decimals).toBe(0);
      expect(history.data[0].op_index).toBe(3);
      expect(history.data[0].type).toBe('received');
      expect(history.data[0].token).toBeDefined();
      expect(history.data[0].token.project).toBeDefined();
      expect(history.data[0].token.project.name).toBe(project.name);
      expect(history.data[0].token.project.blockchain_rid).toEqual(project.blockchain_rid);
      expect(history.data[0].token.collection).toBe(collection);
      expect(history.data[0].token.id).toBe(BigInt(0));
      expect(history.data[0].token.name).toBe(tokenMetadata.name);
    },
    TIMEOUT_TEST
  );

  it(
    'transfer saves a history entry',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);
      const session2 = await createAccount(environment.dapp1Client, encryption.makeKeyPair());

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
        .add(op('importer.mint', project.name, collection, BigInt(0), BigInt(1)))
        .buildAndSend();

      await session
        .transactionBuilder()
        .add(op('mkpl.transfer', project.name, project.blockchain_rid, collection, BigInt(0), BigInt(1), session2.account.id))
        .buildAndSend();

      const historySender = await session.history.getTransfers({ account_id: session.account.id }, 1, null);

      expect(historySender.data.length).toBe(1);
      expect(historySender.data[0].amount).toBe(BigInt(1));
      expect(historySender.data[0].blockchain_rid).toBeNull(); // Not a crosschain transfer
      expect(historySender.data[0].decimals).toBe(0);
      expect(historySender.data[0].op_index).toBe(1);
      expect(historySender.data[0].type).toBe('sent');
      expect(historySender.data[0].token).toBeDefined();
      expect(historySender.data[0].token.project).toBeDefined();
      expect(historySender.data[0].token.project.name).toBe(project.name);
      expect(historySender.data[0].token.project.blockchain_rid).toEqual(project.blockchain_rid);
      expect(historySender.data[0].token.collection).toBe(collection);
      expect(historySender.data[0].token.id).toBe(BigInt(0));
      expect(historySender.data[0].token.name).toBe(tokenMetadata.name);

      const historyReceiver = await session.history.getTransfers({ account_id: session2.account.id }, 1, null);

      expect(historyReceiver.data.length).toBe(1);
      expect(historyReceiver.data[0].amount).toBe(BigInt(1));
      expect(historyReceiver.data[0].blockchain_rid).toBeNull(); // Not a crosschain transfer
      expect(historyReceiver.data[0].decimals).toBe(0);
      expect(historyReceiver.data[0].op_index).toBe(1);
      expect(historyReceiver.data[0].type).toBe('received');
      expect(historyReceiver.data[0].token).toBeDefined();
      expect(historyReceiver.data[0].token.project).toBeDefined();
      expect(historyReceiver.data[0].token.project.name).toBe(project.name);
      expect(historyReceiver.data[0].token.project.blockchain_rid).toEqual(project.blockchain_rid);
      expect(historyReceiver.data[0].token.collection).toBe(collection);
      expect(historyReceiver.data[0].token.id).toBe(BigInt(0));
      expect(historyReceiver.data[0].token.name).toBe(tokenMetadata.name);
    },
    TIMEOUT_TEST
  );
});
