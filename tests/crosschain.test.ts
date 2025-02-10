import { getTestEnvironment, teardown, TestEnvironment } from './utils/setup';
import { ADMIN_SIGNATURE_PROVIDER, TIMEOUT_SETUP, TIMEOUT_TEST } from './utils/constants';
import { createAccount } from './utils/ft4';
import { createErc1155Properties, createProjectMetadata, createTokenMetadata } from './utils/metadata';
import { randomCollectionName } from './utils/random';
import { encryption } from 'postchain-client';
import { performCrossChainTransfer, serializeTokenMetadata, TokenMetadata } from '@megayours/sdk';
import { CrosschainTestParams } from './utils/types';
import { performOracleCrossChainTransfer, testCrossChainTransfer } from './utils/crosschain';
import { op } from '@chromia/ft4';

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

      const tokenId = BigInt(0);
      const params: CrosschainTestParams = {
        dapp1Session,
        dapp2Session,
        tokenType: 'nft',
        project,
        collection,
        tokenId,
        mintAmount: BigInt(1),
        tokenMetadata,
        transferAmount: BigInt(1),
      };

      // Act
      await testCrossChainTransfer(params);

      // Verify
      const metadataDapp2 = await dapp2Session.query<TokenMetadata>('yours.metadata', {
        project_name: project.name,
        project_blockchain_rid: project.blockchain_rid,
        collection,
        token_id: tokenId,
      });
      expect(metadataDapp2.properties['shared']['times_bridged']).toEqual(1);
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

      const tokenId = BigInt(0);
      const params: CrosschainTestParams = {
        dapp1Session,
        dapp2Session,
        tokenType: 'nft',
        project,
        collection,
        tokenId,
        mintAmount: BigInt(1),
        tokenMetadata,
        transferAmount: BigInt(1),
      };

      // Act
      await testCrossChainTransfer(params);

      const destinationMetadata = await dapp2Session.query<TokenMetadata>('yours.metadata', {
        project_name: project.name,
        project_blockchain_rid: project.blockchain_rid,
        collection,
        token_id: tokenId,
      });

      await performCrossChainTransfer(
        dapp2Session,
        environment.dapp1Client,
        dapp1Session.account.id,
        tokenId,
        BigInt(1),
        serializeTokenMetadata(destinationMetadata)
      );

      // Verify
      const sourceMetadata = await dapp1Session.query<TokenMetadata>('yours.metadata', {
        project_name: project.name,
        project_blockchain_rid: project.blockchain_rid,
        collection,
        token_id: tokenId,
      });

      await new Promise((resolve) => setTimeout(resolve, 10000));

      console.log(`sourceMetadata: ${JSON.stringify(sourceMetadata)}`);

      expect(sourceMetadata.properties['shared']['times_bridged']).toEqual(2);
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
      const tokenId = BigInt(0);
      const params: CrosschainTestParams = {
        dapp1Session,
        dapp2Session,
        tokenType: 'nft',
        project,
        collection,
        tokenId,
        mintAmount: BigInt(1),
        tokenMetadata,
        transferAmount: BigInt(1),
      };

      // Act
      await testCrossChainTransfer(params);

      // Verify
      const metadataDapp2 = await dapp2Session.query<TokenMetadata>('yours.metadata', {
        project_name: project.name,
        project_blockchain_rid: project.blockchain_rid,
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
      const tokenId = BigInt(0);
      const params: CrosschainTestParams = {
        dapp1Session,
        dapp2Session,
        tokenType: 'sft',
        project,
        collection,
        tokenId,
        tokenMetadata,
        mintAmount: BigInt(20),
        transferAmount: BigInt(15),
      };

      // Act
      await testCrossChainTransfer(params);

      // Verify
      const metadataDapp2 = await dapp2Session.query<TokenMetadata>('yours.metadata', {
        project_name: project.name,
        project_blockchain_rid: project.blockchain_rid,
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
    'crosschain saves history entries for nft',
    async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const collection = randomCollectionName();
      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const tokenMetadata = createTokenMetadata(project, collection);
      const tokenId = BigInt(0);
      const params: CrosschainTestParams = {
        dapp1Session,
        dapp2Session,
        tokenType: 'nft',
        project,
        collection,
        tokenId,
        mintAmount: BigInt(1),
        tokenMetadata,
        transferAmount: BigInt(1),
      };

      // Act
      await testCrossChainTransfer(params);

      // Verify
      const sourceChainHistory = await dapp1Session.getTransferHistory({ account_id: dapp1Session.account.id }, 1, null);
      expect(sourceChainHistory.data.length).toBe(1);
      expect(sourceChainHistory.data[0].amount).toBe(BigInt(1));
      expect(sourceChainHistory.data[0].blockchain_rid).toEqual(dapp2Session.blockchainRid);
      expect(sourceChainHistory.data[0].decimals).toBe(0);
      expect(sourceChainHistory.data[0].op_index).toBe(1);
      expect(sourceChainHistory.data[0].type).toBe('sent');
      expect(sourceChainHistory.data[0].token).toBeDefined();
      expect(sourceChainHistory.data[0].token.project).toBeDefined();
      expect(sourceChainHistory.data[0].token.project.name).toBe(project.name);
      expect(sourceChainHistory.data[0].token.project.blockchain_rid).toEqual(project.blockchain_rid);
      expect(sourceChainHistory.data[0].token.collection).toBe(collection);
      expect(sourceChainHistory.data[0].token.id).toBe(BigInt(0));
      expect(sourceChainHistory.data[0].token.name).toBe(tokenMetadata.name);

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
      expect(targetChainHistory.data[0].token.id).toBe(BigInt(0));
      expect(targetChainHistory.data[0].token.name).toBe(tokenMetadata.name);
    },
    TIMEOUT_TEST
  );

  it(
    'crosschain saves history entries for sft',
    async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const collection = randomCollectionName();
      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const tokenMetadata = createTokenMetadata(project, collection);
      const tokenId = BigInt(0);
      const params: CrosschainTestParams = {
        dapp1Session,
        dapp2Session,
        tokenType: 'sft',
        project,
        collection,
        tokenId,
        tokenMetadata,
        mintAmount: BigInt(20),
        transferAmount: BigInt(15),
      };

      // Act
      await testCrossChainTransfer(params);

      // Verify
      const sourceChainHistory = await dapp1Session.getTransferHistory({ account_id: dapp1Session.account.id }, 1, null);
      expect(sourceChainHistory.data.length).toBe(1);
      expect(sourceChainHistory.data[0].amount).toBe(BigInt(15));
      expect(sourceChainHistory.data[0].blockchain_rid).toEqual(dapp2Session.blockchainRid);
      expect(sourceChainHistory.data[0].decimals).toBe(0);
      expect(sourceChainHistory.data[0].op_index).toBe(1);
      expect(sourceChainHistory.data[0].type).toBe('sent');
      expect(sourceChainHistory.data[0].token).toBeDefined();
      expect(sourceChainHistory.data[0].token.project).toBeDefined();
      expect(sourceChainHistory.data[0].token.project.name).toBe(project.name);
      expect(sourceChainHistory.data[0].token.project.blockchain_rid).toEqual(project.blockchain_rid);
      expect(sourceChainHistory.data[0].token.collection).toBe(collection);
      expect(sourceChainHistory.data[0].token.id).toBe(BigInt(0));
      expect(sourceChainHistory.data[0].token.name).toBe(tokenMetadata.name);

      const targetChainHistory = await dapp2Session.getTransferHistory({ account_id: dapp2Session.account.id }, 1, null);
      expect(targetChainHistory.data.length).toBe(1);
      expect(targetChainHistory.data[0].amount).toBe(BigInt(15));
      expect(targetChainHistory.data[0].blockchain_rid).toEqual(dapp1Session.blockchainRid);
      expect(targetChainHistory.data[0].decimals).toBe(0);
      expect(targetChainHistory.data[0].op_index).toBe(1);
      expect(targetChainHistory.data[0].type).toBe('received');
      expect(targetChainHistory.data[0].token).toBeDefined();
      expect(targetChainHistory.data[0].token.project).toBeDefined();
      expect(targetChainHistory.data[0].token.project.name).toBe(project.name);
      expect(targetChainHistory.data[0].token.project.blockchain_rid).toEqual(project.blockchain_rid);
      expect(targetChainHistory.data[0].token.collection).toBe(collection);
      expect(targetChainHistory.data[0].token.id).toBe(BigInt(0));
      expect(targetChainHistory.data[0].token.name).toBe(tokenMetadata.name);
    },
    TIMEOUT_TEST
  );

  it(
    'oracle cannot crosschain transfer yours tokens',
    async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const collection = randomCollectionName();
      const project = createProjectMetadata(environment.dapp1Client.config.blockchainRid);
      const tokenMetadata = createTokenMetadata(project, collection);
      const tokenId = BigInt(0);

      const erc1155Properties = createErc1155Properties();
      await dapp1Session
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

      const metadata: TokenMetadata = await dapp1Session.query<TokenMetadata>('yours.metadata', {
        project_name: project.name,
        project_blockchain_rid: project.blockchain_rid,
        collection: collection,
        token_id: tokenId,
      });

      // Act
      await expect(
        performOracleCrossChainTransfer(
          environment.dapp1Client,
          environment.dapp2Client,
          ADMIN_SIGNATURE_PROVIDER,
          dapp1Session.account.id,
          dapp2Session.account.id,
          tokenId,
          BigInt(1),
          metadata
        )
      ).rejects.toThrow();
    },
    TIMEOUT_TEST
  );
});
