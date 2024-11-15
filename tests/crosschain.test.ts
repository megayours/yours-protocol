import { getTestEnvironment, teardown, TestEnvironment } from './utils/setup';
import { TIMEOUT_SETUP, TIMEOUT_TEST } from './utils/constants';
import { createAccount } from './utils/ft4';
import { createProjectMetadata, createTokenMetadata } from './utils/metadata';
import { randomCollectionName } from './utils/random';
import { encryption } from 'postchain-client';
import { performCrossChainTransfer, serializeTokenMetadata, TokenMetadata } from '@megayours/sdk';
import { CrosschainTestParams } from './utils/types';
import { testCrossChainTransfer } from './utils/crosschain';

describe('Crosschain', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await getTestEnvironment();
  }, TIMEOUT_SETUP);

  afterAll(async () => {
    await teardown(environment.network, environment.chromiaNode, environment.postgres);
  }, TIMEOUT_SETUP);

  it(
    'able to parse and update properties',
    async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const collection = randomCollectionName();
      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const tokenMetadata = createTokenMetadata(project, collection);

      const tokenId = 0;
      const params: CrosschainTestParams = {
        dapp1Session,
        dapp2Session,
        tokenType: 'nft',
        project,
        collection,
        tokenId,
        mintAmount: 1,
        tokenMetadata,
        transferAmount: 1,
      };

      // Act
      await testCrossChainTransfer(params);

      // Verify
      const metadataDapp2 = await dapp2Session.query<TokenMetadata>('yours.metadata', {
        project: project.name,
        collection,
        token_id: tokenId,
      });
      expect(metadataDapp2.properties['times_bridged']).toEqual(1);
    },
    TIMEOUT_TEST
  );

  it(
    'able to parse and update properties when returning from crosschain',
    async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const collection = randomCollectionName();
      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const tokenMetadata = createTokenMetadata(project, collection);

      const tokenId = 0;
      const params: CrosschainTestParams = {
        dapp1Session,
        dapp2Session,
        tokenType: 'nft',
        project,
        collection,
        tokenId,
        mintAmount: 1,
        tokenMetadata,
        transferAmount: 1,
      };

      // Act
      await testCrossChainTransfer(params);

      const destinationMetadata = await dapp2Session.query<TokenMetadata>('yours.metadata', {
        project: project.name,
        collection,
        token_id: tokenId,
      });

      await performCrossChainTransfer(
        dapp2Session,
        environment.dapp1Client,
        dapp1Session.account.id,
        tokenId,
        1,
        serializeTokenMetadata(destinationMetadata)
      );

      // Verify
      const sourceMetadata = await dapp1Session.query<TokenMetadata>('yours.metadata', {
        project: project.name,
        collection,
        token_id: tokenId,
      });

      expect(sourceMetadata.properties['times_bridged']).toEqual(2);
    },
    TIMEOUT_TEST
  );

  it(
    'able to bridge a Non-Fungible Token with expected properties following along',
    async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const collection = randomCollectionName();
      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const tokenMetadata = createTokenMetadata(project, collection);
      const tokenId = 0;
      const params: CrosschainTestParams = {
        dapp1Session,
        dapp2Session,
        tokenType: 'nft',
        project,
        collection,
        tokenId,
        mintAmount: 1,
        tokenMetadata,
        transferAmount: 1,
      };

      // Act
      await testCrossChainTransfer(params);

      // Verify
      const metadataDapp2 = await dapp2Session.query<TokenMetadata>('yours.metadata', {
        project: project.name,
        collection,
        token_id: tokenId,
      });
      expect(metadataDapp2.properties.simple_property).toEqual(tokenMetadata.properties.simple_property);
      expect(metadataDapp2.properties.rich_property).toEqual(tokenMetadata.properties.rich_property);
      expect(metadataDapp2.properties.array_property).toEqual(tokenMetadata.properties.array_property);
    },
    TIMEOUT_TEST
  );

  it(
    'able to bridge a Semi-Fungible Token',
    async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const collection = randomCollectionName();
      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const tokenMetadata = createTokenMetadata(project, collection);
      const tokenId = 0;
      const params: CrosschainTestParams = {
        dapp1Session,
        dapp2Session,
        tokenType: 'sft',
        project,
        collection,
        tokenId,
        tokenMetadata,
        mintAmount: 20,
        transferAmount: 15,
      };

      // Act
      await testCrossChainTransfer(params);

      // Verify
      const metadataDapp2 = await dapp2Session.query<TokenMetadata>('yours.metadata', {
        project: project.name,
        collection,
        token_id: tokenId,
      });
      expect(metadataDapp2.properties.simple_property).toEqual(tokenMetadata.properties.simple_property);
      expect(metadataDapp2.properties.rich_property).toEqual(tokenMetadata.properties.rich_property);
      expect(metadataDapp2.properties.array_property).toEqual(tokenMetadata.properties.array_property);
    },
    TIMEOUT_TEST
  );
});
