import { encryption } from 'postchain-client';
import { createAccount } from './utils/ft4';
import { getTestEnvironment, TestEnvironment } from './utils/setup';
import { TIMEOUT_TEST } from './utils/constants';
import { op } from '@chromia/ft4';
import { createErc1155Properties, createProjectMetadata, createTokenMetadata } from './utils/metadata';
import { randomCollectionName } from './utils/random';
import { TokenMetadata } from '@megayours/sdk';
import { beforeAll, describe, expect, it } from 'bun:test';

describe('Non-Fungible Token', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await getTestEnvironment();
  });

  it(
    'able to create a Non-Fungible Token',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);

      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const collection = randomCollectionName();
      const tokenMetadata = createTokenMetadata(project, collection);
      const erc1155Properties = createErc1155Properties();

      const tokenId = BigInt(0);

      await session
        .transactionBuilder()
        .add(
          op(
            'importer.nft',
            project.name,
            collection,
            tokenMetadata.name,
            tokenId,
            JSON.stringify(tokenMetadata.properties),
            [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
            'yours'
          )
        )
        .buildAndSend();

      const balance = await session.query<bigint>('yours.balance', {
        account_id: session.account.id,
        project_name: project.name,
        project_blockchain_rid: project.blockchain_rid,
        collection,
        token_id: tokenId,
      });
      expect(balance).toBe(BigInt(1));
    },
    TIMEOUT_TEST
  );

  it(
    'NFT has correct metadata',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);

      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const collection = randomCollectionName();
      const tokenMetadata = createTokenMetadata(project, collection);
      const erc1155Properties = createErc1155Properties();
      const tokenId = BigInt(1);

      await session
        .transactionBuilder()
        .add(
          op(
            'importer.nft',
            project.name,
            collection,
            tokenMetadata.name,
            tokenId,
            JSON.stringify(tokenMetadata.properties),
            [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
            'yours'
          )
        )
        .buildAndSend();

      const metadata = await session.query<TokenMetadata>('yours.metadata', {
        project_name: project.name,
        project_blockchain_rid: project.blockchain_rid,
        collection,
        token_id: tokenId,
      });
      expect(metadata.name).toBe(tokenMetadata.name);
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
    'Unable to transfer soulbound NFT',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);

      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const collection = randomCollectionName();
      const tokenMetadata = createTokenMetadata(project, collection);
      const erc1155Properties = createErc1155Properties();

      const tokenId = BigInt(1);

      // First, create the soulbound SFT and mint it
      await session
        .transactionBuilder()
        .add(
          op(
            'importer.nft',
            project.name,
            collection,
            tokenMetadata.name,
            tokenId,
            JSON.stringify(tokenMetadata.properties),
            [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
            'soulbound'
          )
        )
        .buildAndSend();

      // Now, try to transfer the soulbound SFT and expect it to fail
      try {
        await session
          .transactionBuilder()
          .add(op('mkpl.transfer', project.name, project.blockchain_rid, collection, tokenId, BigInt(1), Buffer.from('DEADBEEF', 'hex')))
          .buildAndSend();
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Only tokens of type yours can be transferred');
      }
    },
    TIMEOUT_TEST
  );

  it(
    'mint saves an history entry',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);

      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const collection = randomCollectionName();
      const tokenMetadata = createTokenMetadata(project, collection);
      const erc1155Properties = createErc1155Properties();

      const tokenId = BigInt(0);

      // First, create the soulbound SFT and mint it
      await session
        .transactionBuilder()
        .add(
          op(
            'importer.nft',
            project.name,
            collection,
            tokenMetadata.name,
            tokenId,
            JSON.stringify(tokenMetadata.properties),
            [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
            'soulbound'
          )
        )
        .buildAndSend();

      const history = await session.history.getTransfers({ account_id: session.account.id }, 1, null);

      expect(history.data.length).toBe(1);
      expect(history.data[0].amount).toBe(BigInt(1));
      expect(history.data[0].blockchain_rid).toBeNull(); // Not a crosschain transfer
      expect(history.data[0].decimals).toBe(0);
      expect(history.data[0].op_index).toBe(1);
      expect(history.data[0].type).toBe('received');
      expect(history.data[0].token).toBeDefined();
      expect(history.data[0].token.project).toBeDefined();
      expect(history.data[0].token.project.name).toBe(project.name);
      expect(history.data[0].token.project.blockchain_rid).toEqual(project.blockchain_rid);
      expect(history.data[0].token.collection).toBe(collection);
      expect(history.data[0].token.id).toBe(tokenId);
      expect(history.data[0].token.name).toBe(tokenMetadata.name);
    },
    TIMEOUT_TEST
  );

  it(
    'transfer saves two history entries',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);
      const session2 = await createAccount(environment.dapp1Client, encryption.makeKeyPair());

      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const collection = randomCollectionName();
      const tokenMetadata = createTokenMetadata(project, collection);
      const erc1155Properties = createErc1155Properties();

      const tokenId = BigInt(0);

      // First, create the soulbound SFT and mint it
      await session
        .transactionBuilder()
        .add(
          op(
            'importer.nft',
            project.name,
            collection,
            tokenMetadata.name,
            tokenId,
            JSON.stringify(tokenMetadata.properties),
            [erc1155Properties.description, erc1155Properties.image, erc1155Properties.animation_url],
            'yours'
          )
        )
        .buildAndSend();

      await session
        .transactionBuilder()
        .add(op('mkpl.transfer', project.name, project.blockchain_rid, collection, tokenId, BigInt(1), session2.account.id))
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
      expect(historySender.data[0].token.id).toBe(tokenId);
      expect(historySender.data[0].token.name).toBe(tokenMetadata.name);

      // Test paging logic
      const nextPage = await historySender.fetchNext();
      expect(nextPage.data.length).toBe(1);

      const nextPage2 = await nextPage.fetchNext();
      expect(nextPage2.data.length).toBe(0);

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
      expect(historyReceiver.data[0].token.id).toBe(tokenId);
      expect(historyReceiver.data[0].token.name).toBe(tokenMetadata.name);
    },
    TIMEOUT_TEST
  );
});
