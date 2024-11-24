import { encryption } from 'postchain-client';
import { TIMEOUT_SETUP, TIMEOUT_TEST } from './utils/constants';
import { randomCollectionName } from './utils/random';
import { getTestEnvironment, teardown, TestEnvironment } from './utils/setup';
import { createAccount } from './utils/ft4';
import { op } from '@chromia/ft4';
import { createMegaYoursClient, TokenMetadata } from '@megayours/sdk';
import { createProjectMetadata } from './utils/metadata';
import { evmAddressFromKeyPair } from './utils/address';

describe('External', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await getTestEnvironment();
  }, TIMEOUT_SETUP);

  afterAll(async () => {
    await teardown(environment.network, environment.chromiaNode, environment.postgres);
  }, TIMEOUT_SETUP);

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
        name: 'Pudgy Penguin',
        description: 'Pudgy Penguin',
        image: 'https://pudgypenguins.com/pudgy.png',
        animation_url: 'https://pudgypenguins.com/pudgy.mp4',
      });
      const to = Buffer.from('0x8309f9456fe37dce5a34339097803b51ba8d37b3'.replace('0x', ''), 'hex');

      await session
        .transactionBuilder()
        .add(op('tokenchain_simulator.emit_mint', project, collection, tokenId, tokenName, chain, contract, metadata, to, BigInt(1)))
        .buildAndSend();

      await new Promise((resolve) => setTimeout(resolve, 5000));

      const ownerAccountIds = await environment.dapp2Client.query<Buffer[]>('yours.external.owners_account_ids', {
        chain,
        contract,
        token_id: tokenId,
      });

      expect(ownerAccountIds.length).toEqual(1);
      expect(ownerAccountIds[0].toString('hex')).toEqual(to.toString('hex'));

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

      await new Promise((resolve) => setTimeout(resolve, 5000));

      const ownerAccountIds = await environment.dapp2Client.query<Buffer[]>('yours.external.owners_account_ids', {
        chain,
        contract,
        token_id: tokenId,
      });

      expect(ownerAccountIds.length).toEqual(1);
      expect(ownerAccountIds[0].toString('hex')).toEqual(to.toString('hex'));
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

      const ownerships = await dapp1Session.getTokenBalances(dapp1Session.account.id);
      expect(ownerships.length).toEqual(1);
      expect(ownerships[0].amount).toEqual(BigInt(1));

      await new Promise((resolve) => setTimeout(resolve, 5000));

      const ownerAccountIds = await environment.dapp2Client.query<Buffer[]>('yours.external.owners_account_ids', {
        chain,
        contract,
        token_id: tokenId,
      });
      expect(ownerAccountIds.length).toEqual(1);
      expect(ownerAccountIds[0].toString('hex')).toEqual(dapp2Session.account.id.toString('hex'));

      const megaClient = createMegaYoursClient(dapp1Session);
      await megaClient.transferCrosschain(dapp2Session.client, dapp2Session.account.id, project, collection, tokenId, BigInt(1));

      const dapp1Metadata = await dapp1Session.getMetadata(project, collection, tokenId);
      expect(dapp1Metadata).toBeNull();
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
      const tokenId = BigInt(3);
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

      const ownerships = await dapp1Session.getTokenBalances(dapp1Session.account.id);
      expect(ownerships.length).toEqual(1);
      expect(ownerships[0].amount).toEqual(BigInt(1));

      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Ensure the token was picked up by the other chain
      const ownerAccountIds = await environment.dapp2Client.query<Buffer[]>('yours.external.owners_account_ids', {
        chain,
        contract,
        token_id: tokenId,
      });
      expect(ownerAccountIds.length).toEqual(1);
      expect(ownerAccountIds[0].toString('hex')).toEqual(dapp2Session.account.id.toString('hex'));

      // Transfer the token to the other chain
      await dapp1Session.transferCrosschain(dapp2Session.client, dapp2Session.account.id, project, collection, tokenId, BigInt(1));

      // Transfer the token back to the original chain
      await dapp2Session.transferCrosschain(dapp1Session.client, dapp1Session.account.id, project, collection, tokenId, BigInt(1));

      const dapp1Metadata = await dapp1Session.getMetadata(project, collection, tokenId);
      expect(dapp1Metadata).toBeDefined();
      const dapp2Metadata = await dapp2Session.getMetadata(project, collection, tokenId);
      expect(dapp2Metadata).toBeNull();

      expect(dapp1Metadata.yours.type).toEqual('external');

      expect(dapp1Metadata.name).toEqual(tokenName);
      expect(dapp1Metadata.properties['animation_url']).toEqual('https://pudgypenguins.com/pudgy.mp4');
      expect(dapp1Metadata.properties['description']).toEqual('Pudgy Penguin');
      expect(dapp1Metadata.properties['image']).toEqual('https://pudgypenguins.com/pudgy.png');
      expect(dapp1Metadata.yours.collection).toEqual(collection);
      expect(dapp1Metadata.yours.project.name).toEqual(project.name);
      expect(dapp1Metadata.yours.project.blockchain_rid).toBeDefined();
      expect(dapp1Metadata.yours.modules).toEqual(['yours_external']);
    },
    TIMEOUT_TEST
  );
});
