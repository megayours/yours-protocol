import { encryption } from 'postchain-client';
import { TIMEOUT_SETUP, TIMEOUT_TEST } from './utils/constants';
import { randomCollectionName } from './utils/random';
import { getTestEnvironment, teardown, TestEnvironment } from './utils/setup';
import { createAccount } from './utils/ft4';
import { op } from '@chromia/ft4';
import { TokenMetadata } from '@megayours/sdk';

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
      const tokenId = 0;
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
        .add(op('tokenchain_simulator.emit_mint', project, collection, tokenId, tokenName, chain, contract, metadata, to, 1))
        .buildAndSend();

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const ownerAccountId = await environment.dapp2Client.query<Buffer>('yours.external.owner_account_id', {
        chain,
        contract,
        token_id: tokenId,
      });

      expect(ownerAccountId.toString('hex')).toEqual(to.toString('hex'));

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
      const tokenId = 1;
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
        .add(op('tokenchain_simulator.emit_mint', project, collection, tokenId, tokenName, chain, contract, metadata, from, 1))
        .add(op('tokenchain_simulator.emit_transfer', chain, contract, tokenId, from, to, 1))
        .buildAndSend();

      await new Promise((resolve) => setTimeout(resolve, 5000));

      const ownerAccountId = await environment.dapp2Client.query<Buffer>('yours.external.owner_account_id', {
        chain,
        contract,
        token_id: tokenId,
      });

      expect(ownerAccountId).toEqual(to);
    },
    TIMEOUT_TEST
  );
});
