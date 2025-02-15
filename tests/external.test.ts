import { encryption } from 'postchain-client';
import { ADMIN_SIGNATURE_PROVIDER, TIMEOUT_TEST } from './utils/constants';
import { randomCollectionName } from './utils/random';
import { getTestEnvironment, TestEnvironment } from './utils/setup';
import { createAccount } from './utils/ft4';
import { op } from '@chromia/ft4';
import { createMegaYoursClient, Property, TokenMetadata } from '@megayours/sdk';
import { createProjectMetadata } from './utils/metadata';
import { evmAddressFromKeyPair } from './utils/address';
import { performOracleCrossChainTransfer } from './utils/crosschain';
import { beforeAll, describe, expect, it } from 'bun:test';

describe('External', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await getTestEnvironment();
  });

  it(
    'should emit and handle mint event',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);

      const project = 'Pudgy Penguins';
      const collection = randomCollectionName();
      const tokenId = BigInt(0);
      const tokenName = 'Pudgy Penguin #1';
      const chain = 'Ethereum';
      const contract = Buffer.from('0x524cab2ec69124574082676e6f654a18df49a048'.replace('0x', ''), 'hex');
      const metadata = JSON.stringify({
        name: tokenName,
        description: 'Pudgy Penguin',
        image: 'https://pudgypenguins.com/pudgy.png',
        animation_url: 'https://pudgypenguins.com/pudgy.mp4',
      });
      const to = Buffer.from('0x8309f9456fe37dce5a34339097803b51ba8d37b3'.replace('0x', ''), 'hex');

      await session
        .transactionBuilder()
        .add(op('tokenchain_simulator.emit_mint', project, collection, tokenId, tokenName, chain, contract, metadata, to, BigInt(1)))
        .buildAndSend();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const ownerAccountIds = await environment.dapp2Client.query<{ data: Buffer[] }>('yours.external.owners_account_ids', {
        chain,
        contract,
        token_id: tokenId,
        page_size: null,
        page_cursor: null,
      });

      expect(ownerAccountIds.data.length).toEqual(1);
      expect(ownerAccountIds.data[0].toString('hex')).toEqual(to.toString('hex'));

      const dapp2Metadata = await environment.dapp2Client.query<TokenMetadata>('yours.external.metadata', {
        chain,
        contract,
        token_id: tokenId,
      });

      expect(dapp2Metadata.name).toEqual(tokenName);
      expect(dapp2Metadata.properties['animation_url']).toEqual('https://pudgypenguins.com/pudgy.mp4');
      expect(dapp2Metadata.properties['description']).toEqual('Pudgy Penguin');
      expect(dapp2Metadata.properties['image']).toEqual('https://pudgypenguins.com/pudgy.png');
      expect(dapp2Metadata.yours.collection).toEqual(collection);
      expect(dapp2Metadata.yours.project.name).toEqual(project);
      expect(dapp2Metadata.yours.project.blockchain_rid).toBeDefined();
      expect(dapp2Metadata.yours.modules).toEqual(['yours_external']);
    },
    TIMEOUT_TEST
  );

  it(
    'should emit and handle transfer event',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);

      const project = 'Pudgy Penguins';
      const collection = randomCollectionName();
      const tokenId = BigInt(1);
      const tokenName = 'Pudgy Penguin #1';
      const chain = 'Ethereum';
      const contract = Buffer.from('0x524cab2ec69124574082676e6f654a18df49a048'.replace('0x', ''), 'hex');
      const metadata = JSON.stringify({
        name: 'Pudgy Penguin',
        description: 'Pudgy Penguin',
        image: 'https://pudgypenguins.com/pudgy.png',
        animation_url: 'https://pudgypenguins.com/pudgy.mp4',
      });
      const from = Buffer.from('0x8309f9456fe37dce5a34339097803b51ba8d37b3'.replace('0x', ''), 'hex');
      const to = Buffer.from('0x1209f9456fe37dce5a34339097803b51ba8d37b4'.replace('0x', ''), 'hex');

      await session
        .transactionBuilder()
        .add(op('tokenchain_simulator.emit_mint', project, collection, tokenId, tokenName, chain, contract, metadata, from, BigInt(1)))
        .add(op('tokenchain_simulator.emit_transfer', chain, contract, tokenId, from, to, BigInt(1)))
        .buildAndSend();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const ownerAccountIds = await environment.dapp2Client.query<{ data: Buffer[] }>('yours.external.owners_account_ids', {
        chain,
        contract,
        token_id: tokenId,
        page_size: null,
        page_cursor: null,
      });

      expect(ownerAccountIds.data.length).toEqual(1);
      expect(ownerAccountIds.data[0].toString('hex')).toEqual(to.toString('hex'));
    },
    TIMEOUT_TEST
  );

  it(
    'should handle crosschain transfer for external onchain tokens',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const evmAddress = evmAddressFromKeyPair(keyPair);

      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const collection = randomCollectionName();
      const tokenId = BigInt(2);
      const tokenName = 'Pudgy Penguin #2';
      const chain = 'Ethereum';
      const contract = Buffer.from('0x524cab2ec69124574082676e6f654a18df49a048'.replace('0x', ''), 'hex');
      const metadata = JSON.stringify({
        name: tokenName,
        description: 'Pudgy Penguin',
        image: 'https://pudgypenguins.com/pudgy.png',
        animation_url: 'https://pudgypenguins.com/pudgy.mp4',
      });

      await dapp1Session
        .transactionBuilder()
        .add(
          op(
            'tokenchain_simulator.emit_mint',
            project.name,
            collection,
            tokenId,
            tokenName,
            chain,
            contract,
            metadata,
            evmAddress,
            BigInt(1)
          )
        )
        .buildAndSend();

      const ownerships = await dapp1Session.getTokenBalances({ account_id: dapp1Session.account.id });
      expect(ownerships.data.length).toEqual(1);
      expect(ownerships.data[0].amount).toEqual(BigInt(1));

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const ownerAccountIds = await dapp2Session.getExternalOwnersAccountIds(chain, contract, tokenId);
      expect(ownerAccountIds.data.length).toEqual(1);
      expect(ownerAccountIds.data[0].toString('hex')).toEqual(dapp2Session.account.id.toString('hex'));

      const megaClient = createMegaYoursClient(dapp1Session);
      await megaClient.transferCrosschain(dapp2Session.client, dapp2Session.account.id, project, collection, tokenId, BigInt(1));

      const dapp1Balance = await dapp1Session.getTokenBalance(dapp1Session.account.id, project, collection, tokenId);
      expect(dapp1Balance.amount).toBeUndefined();

      const dapp2Metadata = await dapp2Session.getMetadata(project, collection, tokenId);
      expect(dapp2Metadata).toBeDefined();

      expect(dapp2Metadata.yours.type).toEqual('external');

      expect(dapp2Metadata.name).toEqual(tokenName);
      expect(dapp2Metadata.properties['animation_url']).toEqual('https://pudgypenguins.com/pudgy.mp4');
      expect(dapp2Metadata.properties['description']).toEqual('Pudgy Penguin');
      expect(dapp2Metadata.properties['image']).toEqual('https://pudgypenguins.com/pudgy.png');
      expect(dapp2Metadata.yours.collection).toEqual(collection);
      expect(dapp2Metadata.yours.project.name).toEqual(project.name);
      expect(dapp2Metadata.yours.project.blockchain_rid).toBeDefined();
      expect(dapp2Metadata.yours.modules).toEqual(['yours_external']);

      await new Promise((resolve) => setTimeout(resolve, 10000));
    },
    TIMEOUT_TEST
  );

  it(
    'should normalize erc721 attributes for external tokens',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const evmAddress = evmAddressFromKeyPair(keyPair);

      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const collection = randomCollectionName();
      const tokenId = BigInt(3);
      const tokenName = 'Pudgy Penguin #2';
      const chain = 'Ethereum';
      const contract = Buffer.from('0x524cab2ec69124574082676e6f654a18df49a048'.replace('0x', ''), 'hex');
      const metadata = JSON.stringify({
        name: tokenName,
        description: 'Pudgy Penguin',
        image: 'https://pudgypenguins.com/pudgy.png',
        animation_url: 'https://pudgypenguins.com/pudgy.mp4',
        attributes: [
          {
            trait_type: 'Background',
            value: 'Blue',
          },
        ],
      });

      await dapp1Session
        .transactionBuilder()
        .add(
          op(
            'tokenchain_simulator.emit_mint',
            project.name,
            collection,
            tokenId,
            tokenName,
            chain,
            contract,
            metadata,
            evmAddress,
            BigInt(1)
          )
        )
        .buildAndSend();

      const ownerships = await dapp1Session.getTokenBalances({ account_id: dapp1Session.account.id });
      expect(ownerships.data.length).toEqual(1);
      expect(ownerships.data[0].amount).toEqual(BigInt(1));

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const ownerAccountIds = await dapp2Session.getExternalOwnersAccountIds(chain, contract, tokenId);
      expect(ownerAccountIds.data.length).toEqual(1);
      expect(ownerAccountIds.data[0].toString('hex')).toEqual(dapp2Session.account.id.toString('hex'));

      const megaClient = createMegaYoursClient(dapp1Session);
      await megaClient.transferCrosschain(dapp2Session.client, dapp2Session.account.id, project, collection, tokenId, BigInt(1));

      const dapp1Balance = await dapp1Session.getTokenBalance(dapp1Session.account.id, project, collection, tokenId);
      expect(dapp1Balance.amount).toBeUndefined();

      const dapp2Metadata = await dapp2Session.getMetadata(project, collection, tokenId);
      expect(dapp2Metadata).toBeDefined();

      expect(dapp2Metadata.yours.type).toEqual('external');

      await new Promise((resolve) => setTimeout(resolve, 10000));

      expect(dapp2Metadata.properties['attributes']).toBeUndefined();
      expect(dapp2Metadata.properties['Background']).toEqual('Blue');
    },
    TIMEOUT_TEST
  );

  it(
    'should normalize erc1155 properties for external tokens',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const evmAddress = evmAddressFromKeyPair(keyPair);

      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const collection = randomCollectionName();
      const tokenId = BigInt(4);
      const tokenName = 'Pudgy Penguin #2';
      const chain = 'Ethereum';
      const contract = Buffer.from('0x524cab2ec69124574082676e6f654a18df49a048'.replace('0x', ''), 'hex');
      const metadata = JSON.stringify({
        name: tokenName,
        description: 'Pudgy Penguin',
        image: 'https://pudgypenguins.com/pudgy.png',
        animation_url: 'https://pudgypenguins.com/pudgy.mp4',
        properties: {
          Background: 'Blue',
          NestedObject: {
            NestedKey: 'NestedValue',
          },
        },
      });

      await dapp1Session
        .transactionBuilder()
        .add(
          op(
            'tokenchain_simulator.emit_mint',
            project.name,
            collection,
            tokenId,
            tokenName,
            chain,
            contract,
            metadata,
            evmAddress,
            BigInt(1)
          )
        )
        .buildAndSend();

      const ownerships = await dapp1Session.getTokenBalances({ account_id: dapp1Session.account.id });
      expect(ownerships.data.length).toEqual(1);
      expect(ownerships.data[0].amount).toEqual(BigInt(1));

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const ownerAccountIds = await dapp2Session.getExternalOwnersAccountIds(chain, contract, tokenId);
      expect(ownerAccountIds.data.length).toEqual(1);
      expect(ownerAccountIds.data[0].toString('hex')).toEqual(dapp2Session.account.id.toString('hex'));

      const megaClient = createMegaYoursClient(dapp1Session);
      await megaClient.transferCrosschain(dapp2Session.client, dapp2Session.account.id, project, collection, tokenId, BigInt(1));

      const dapp1Balance = await dapp1Session.getTokenBalance(dapp1Session.account.id, project, collection, tokenId);
      expect(dapp1Balance.amount).toBeUndefined();

      const dapp2Metadata = await dapp2Session.getMetadata(project, collection, tokenId);
      expect(dapp2Metadata).toBeDefined();

      expect(dapp2Metadata.yours.type).toEqual('external');

      await new Promise((resolve) => setTimeout(resolve, 10000));

      expect(dapp2Metadata.properties['attributes']).toBeUndefined();
      expect(dapp2Metadata.properties['Background']).toEqual('Blue');
      expect(dapp2Metadata.properties['NestedObject']).toEqual({
        NestedKey: 'NestedValue',
      } as unknown as Property);
    },
    TIMEOUT_TEST
  );

  it(
    'should handle crosschain transfer returning to the same chain for external onchain tokens',
    async () => {
      const keyPair = encryption.makeKeyPair();
      const evmAddress = evmAddressFromKeyPair(keyPair);

      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const collection = randomCollectionName();
      const tokenId = BigInt(5);
      const tokenName = 'Pudgy Penguin #2';
      const chain = 'Ethereum';
      const contract = Buffer.from('0x524cab2ec69124574082676e6f654a18df49a048'.replace('0x', ''), 'hex');
      const metadata = JSON.stringify({
        name: 'Pudgy Penguin',
        description: 'Pudgy Penguin',
        image: 'https://pudgypenguins.com/pudgy.png',
        animation_url: 'https://pudgypenguins.com/pudgy.mp4',
      });

      await dapp1Session
        .transactionBuilder()
        .add(
          op(
            'tokenchain_simulator.emit_mint',
            project.name,
            collection,
            tokenId,
            tokenName,
            chain,
            contract,
            metadata,
            evmAddress,
            BigInt(1)
          )
        )
        .buildAndSend();

      const ownerships = await dapp1Session.getTokenBalances({ account_id: dapp1Session.account.id });
      expect(ownerships.data.length).toEqual(1);
      expect(ownerships.data[0].amount).toEqual(BigInt(1));

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Ensure the token was picked up by the other chain
      const ownerAccountIds = await dapp2Session.getExternalOwnersAccountIds(chain, contract, tokenId);
      expect(ownerAccountIds.data.length).toEqual(1);
      expect(ownerAccountIds.data[0].toString('hex')).toEqual(dapp2Session.account.id.toString('hex'));

      // Transfer the token to the other chain
      await dapp1Session.transferCrosschain(dapp2Session.client, dapp2Session.account.id, project, collection, tokenId, BigInt(1));

      // Transfer the token back to the original chain
      await dapp2Session.transferCrosschain(dapp1Session.client, dapp1Session.account.id, project, collection, tokenId, BigInt(1));

      const dapp1Balance = await dapp1Session.getTokenBalance(dapp1Session.account.id, project, collection, tokenId);
      expect(dapp1Balance.amount).toBeUndefined();

      const dapp2Balance = await dapp2Session.getTokenBalance(dapp2Session.account.id, project, collection, tokenId);
      expect(dapp2Balance.amount).toBeUndefined();
    },
    TIMEOUT_TEST
  );

  it(
    'oracle can crosschain transfer external tokens',
    async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const evmAddress = evmAddressFromKeyPair(keyPair);

      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const collection = randomCollectionName();
      const tokenId = BigInt(6);
      const tokenName = 'Pudgy Penguin #2';
      const chain = 'Ethereum';
      const contract = Buffer.from('0x524cab2ec69124574082676e6f654a18df49a048'.replace('0x', ''), 'hex');
      const createMetadata = JSON.stringify({
        name: tokenName,
        description: 'Pudgy Penguin',
        image: 'https://pudgypenguins.com/pudgy.png',
        animation_url: 'https://pudgypenguins.com/pudgy.mp4',
      });

      await dapp1Session
        .transactionBuilder()
        .add(
          op(
            'tokenchain_simulator.emit_mint',
            project.name,
            collection,
            tokenId,
            tokenName,
            chain,
            contract,
            createMetadata,
            evmAddress,
            BigInt(1)
          )
        )
        .buildAndSend();

      const ownerships = await dapp1Session.getTokenBalances({ account_id: dapp1Session.account.id });
      expect(ownerships.data.length).toEqual(1);
      expect(ownerships.data[0].amount).toEqual(BigInt(1));

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const metadata: TokenMetadata = await dapp1Session.query<TokenMetadata>('yours.metadata', {
        project_name: project.name,
        project_blockchain_rid: project.blockchain_rid,
        collection: collection,
        token_id: tokenId,
      });

      // Act
      await performOracleCrossChainTransfer(
        environment.dapp1Client,
        environment.dapp2Client,
        ADMIN_SIGNATURE_PROVIDER,
        dapp1Session.account.id,
        dapp2Session.account.id,
        tokenId,
        BigInt(1),
        metadata
      );

      // Verify
      const sourceChainHistory = await dapp1Session.getTransferHistory({ account_id: dapp1Session.account.id }, 1, null);
      expect(sourceChainHistory.data.length).toBe(1);
      expect(sourceChainHistory.data[0].amount).toBe(BigInt(1));
      expect(sourceChainHistory.data[0].blockchain_rid).toEqual(dapp2Session.blockchainRid);
      expect(sourceChainHistory.data[0].decimals).toBe(0);
      expect(sourceChainHistory.data[0].op_index).toBe(0);
      expect(sourceChainHistory.data[0].type).toBe('sent');
      expect(sourceChainHistory.data[0].token).toBeDefined();
      expect(sourceChainHistory.data[0].token.project).toBeDefined();
      expect(sourceChainHistory.data[0].token.project.name).toBe(project.name);
      expect(sourceChainHistory.data[0].token.project.blockchain_rid).toEqual(project.blockchain_rid);
      expect(sourceChainHistory.data[0].token.collection).toBe(collection);
      expect(sourceChainHistory.data[0].token.id).toBe(tokenId);
      expect(sourceChainHistory.data[0].token.name).toBe(metadata.name);

      const targetChainHistory = await dapp2Session.getTransferHistory({ account_id: dapp2Session.account.id }, 1, null);
      expect(targetChainHistory.data.length).toBe(1);
      expect(targetChainHistory.data[0].amount).toBe(BigInt(1));
      expect(targetChainHistory.data[0].blockchain_rid).toEqual(dapp1Session.blockchainRid);
      expect(targetChainHistory.data[0].decimals).toBe(0);
      expect(targetChainHistory.data[0].op_index).toBe(1);
      expect(targetChainHistory.data[0].type).toBe('received');
      expect(targetChainHistory.data[0].token).toBeDefined();
      expect(targetChainHistory.data[0].token.project).toBeDefined();
      expect(targetChainHistory.data[0].token.project.name).toBe(project.name);
      expect(targetChainHistory.data[0].token.project.blockchain_rid).toEqual(project.blockchain_rid);
      expect(targetChainHistory.data[0].token.collection).toBe(collection);
      expect(targetChainHistory.data[0].token.id).toBe(tokenId);
      expect(targetChainHistory.data[0].token.name).toBe(metadata.name);
    },
    TIMEOUT_TEST
  );
});
