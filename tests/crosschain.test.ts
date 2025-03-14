import { getTestEnvironment, TestEnvironment } from './utils/setup';
import { ADMIN_SIGNATURE_PROVIDER, TIMEOUT_TEST } from './utils/constants';
import { createAccount } from './utils/ft4';
import { createTokenMetadata } from './utils/metadata';
import { randomName } from './utils/random';
import { encryption } from 'postchain-client';
import { performCrossChainTransfer, serializeTokenMetadata, TokenMetadata } from '@megayours/sdk';
import { CrosschainTestParams } from './utils/types';
import { initTransfer, performOracleCrossChainTransfer, testCrossChainTransfer } from './utils/crosschain';
import { beforeAll, describe, expect, it } from 'bun:test';
import { randomTokenId } from './utils/token_id';
import { define, mint } from './utils/operations/importer';

describe('Crosschain', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await getTestEnvironment();
  });

  it('able to parse and update properties', async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const name = randomName();
      const tokenMetadata = createTokenMetadata(dapp1Session.blockchainRid, name);

      const tokenId = randomTokenId();
      const params: CrosschainTestParams = {
        dapp1Session,
        dapp2Session,
        tokenType: 'nft',
        tokenId,
        mintAmount: BigInt(1),
        tokenMetadata,
        transferAmount: BigInt(1),
      };

      // Act
      await testCrossChainTransfer(params);

      // Verify
      const metadataDapp2 = await dapp2Session.query<TokenMetadata>('yours.metadata', {
        id: tokenId,
        issuing_chain: dapp1Session.blockchainRid,
      });

      console.log(metadataDapp2);

      expect(metadataDapp2.properties['shared']['times_bridged']).toEqual(1);
    },
    TIMEOUT_TEST
  );

  it('able to parse and update properties when returning from crosschain', async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const name = randomName();
      const tokenMetadata = createTokenMetadata(dapp1Session.blockchainRid, name);

      const tokenId = randomTokenId();
      const params: CrosschainTestParams = {
        dapp1Session,
        dapp2Session,
        tokenType: 'nft',
        tokenId,
        mintAmount: BigInt(1),
        tokenMetadata,
        transferAmount: BigInt(1),
      };

      // Act
      await testCrossChainTransfer(params);

      const destinationMetadata = await dapp2Session.query<TokenMetadata>('yours.metadata', {
        id: tokenId,
        issuing_chain: dapp1Session.blockchainRid,
      });

      await performCrossChainTransfer(
        dapp2Session,
        environment.dapp1Client,
        dapp1Session.account.id,
        tokenId,
        dapp1Session.blockchainRid,
        BigInt(1),
        serializeTokenMetadata(destinationMetadata)
      );

      // Verify
      const sourceMetadata = await dapp1Session.query<TokenMetadata>('yours.metadata', {
        id: tokenId,
        issuing_chain: dapp1Session.blockchainRid,
      });

      // await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(sourceMetadata.properties['shared']['times_bridged']).toEqual(2);
    },
    TIMEOUT_TEST
  );

  it('able to bridge a Non-Fungible Token with expected properties following along', async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const name = randomName();
      const tokenMetadata = createTokenMetadata(dapp1Session.blockchainRid, name);
      const tokenId = randomTokenId();
      const params: CrosschainTestParams = {
        dapp1Session,
        dapp2Session,
        tokenType: 'nft',
        tokenId,
        mintAmount: BigInt(1),
        tokenMetadata,
        transferAmount: BigInt(1),
      };

      // Act
      await testCrossChainTransfer(params);

      // Verify
      const metadataDapp2 = await dapp2Session.query<TokenMetadata>('yours.metadata', {
        id: tokenId,
        issuing_chain: dapp1Session.blockchainRid,
      });
      expect(metadataDapp2.properties.info.name).toEqual(name);
      expect(metadataDapp2.properties.noModuleAssigned.simple_property).toBeDefined();
      expect(metadataDapp2.properties.noModuleAssigned.simple_property).toEqual(tokenMetadata.properties.noModuleAssigned.simple_property);
      expect(metadataDapp2.properties.noModuleAssigned.rich_property).toBeDefined();
      expect(metadataDapp2.properties.noModuleAssigned.rich_property.display_value).toEqual(tokenMetadata.properties.noModuleAssigned.rich_property.display_value);
      expect(metadataDapp2.properties.noModuleAssigned.array_property).toBeDefined();
      expect(metadataDapp2.properties.noModuleAssigned.array_property.value).toEqual(tokenMetadata.properties.noModuleAssigned.array_property.value);
    },
    TIMEOUT_TEST
  );

  it('able to bridge a Semi-Fungible Token', async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const name = randomName();
      const tokenMetadata = createTokenMetadata(dapp1Session.blockchainRid, name);
      const tokenId = randomTokenId();
      const params: CrosschainTestParams = {
        dapp1Session,
        dapp2Session,
        tokenType: 'sft',
        tokenId,
        mintAmount: BigInt(20),
        tokenMetadata,
        transferAmount: BigInt(15),
      };

      // Act
      await testCrossChainTransfer(params);

      // Verify
      const metadataDapp2 = await dapp2Session.query<TokenMetadata>('yours.metadata', {
        id: tokenId,
        issuing_chain: dapp1Session.blockchainRid,
      });
      expect(metadataDapp2.properties.noModuleAssigned.simple_property).toEqual(tokenMetadata.properties.noModuleAssigned.simple_property);
      expect(metadataDapp2.properties.noModuleAssigned.rich_property).toEqual(tokenMetadata.properties.noModuleAssigned.rich_property);
      expect(metadataDapp2.properties.noModuleAssigned.array_property).toEqual(tokenMetadata.properties.noModuleAssigned.array_property);
    },
    TIMEOUT_TEST
  );

  it('crosschain saves history entries for nft', async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const name = randomName();
      const tokenMetadata = createTokenMetadata(dapp1Session.blockchainRid, name);
      const tokenId = randomTokenId();
      const params: CrosschainTestParams = {
        dapp1Session,
        dapp2Session,
        tokenId,
        mintAmount: BigInt(1),
        tokenMetadata,
        transferAmount: BigInt(1),
      };

      // Act
      await testCrossChainTransfer(params);

      // Verify
      const sourceChainHistory = await dapp1Session.history.getTransfers({ account_id: dapp1Session.account.id }, 1, null);
      expect(sourceChainHistory.data.length).toBe(1);
      expect(sourceChainHistory.data[0].amount).toBe(BigInt(1));
      expect(sourceChainHistory.data[0].blockchain_rid).toEqual(dapp2Session.blockchainRid);
      expect(sourceChainHistory.data[0].decimals).toBe(0);
      expect(sourceChainHistory.data[0].op_index).toBe(1);
      expect(sourceChainHistory.data[0].type).toBe('sent');
      expect(sourceChainHistory.data[0].token).toBeDefined();
      expect(sourceChainHistory.data[0].token.id).toEqual(tokenId);
      expect(sourceChainHistory.data[0].token.issuing_chain).toEqual(dapp1Session.blockchainRid);

      const targetChainHistory = await dapp2Session.history.getTransfers({ account_id: dapp2Session.account.id }, 1, null);
      expect(targetChainHistory.data.length).toBe(1);
      expect(targetChainHistory.data[0].amount).toBe(BigInt(1));
      expect(targetChainHistory.data[0].blockchain_rid).toEqual(dapp1Session.blockchainRid);
      expect(targetChainHistory.data[0].decimals).toBe(0);
      expect(targetChainHistory.data[0].op_index).toBe(1);
      expect(targetChainHistory.data[0].type).toBe('received');
      expect(targetChainHistory.data[0].token).toBeDefined();
      expect(targetChainHistory.data[0].token.id).toEqual(tokenId);
      expect(targetChainHistory.data[0].token.issuing_chain).toEqual(dapp1Session.blockchainRid);
    },
    TIMEOUT_TEST
  );

  it('crosschain saves history entries for sft', async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const name = randomName();
      const tokenMetadata = createTokenMetadata(dapp1Session.blockchainRid, name);
      const tokenId = randomTokenId();
      const params: CrosschainTestParams = {
        dapp1Session,
        dapp2Session,
        tokenId,
        tokenMetadata,
        mintAmount: BigInt(20),
        transferAmount: BigInt(15),
      };

      // Act
      await testCrossChainTransfer(params);

      // Verify
      const sourceChainHistory = await dapp1Session.history.getTransfers({ account_id: dapp1Session.account.id }, 1, null);
      expect(sourceChainHistory.data.length).toBe(1);
      expect(sourceChainHistory.data[0].amount).toBe(BigInt(15));
      expect(sourceChainHistory.data[0].blockchain_rid).toEqual(dapp2Session.blockchainRid);
      expect(sourceChainHistory.data[0].decimals).toBe(0);
      expect(sourceChainHistory.data[0].op_index).toBe(1);
      expect(sourceChainHistory.data[0].type).toBe('sent');
      expect(sourceChainHistory.data[0].token).toBeDefined();
      expect(sourceChainHistory.data[0].token.id).toEqual(tokenId);
      expect(sourceChainHistory.data[0].token.issuing_chain).toEqual(dapp1Session.blockchainRid);

      const targetChainHistory = await dapp2Session.history.getTransfers({ account_id: dapp2Session.account.id }, 1, null);
      expect(targetChainHistory.data.length).toBe(1);
      expect(targetChainHistory.data[0].amount).toBe(BigInt(15));
      expect(targetChainHistory.data[0].blockchain_rid).toEqual(dapp1Session.blockchainRid);
      expect(targetChainHistory.data[0].decimals).toBe(0);
      expect(targetChainHistory.data[0].op_index).toBe(1);
      expect(targetChainHistory.data[0].type).toBe('received');
      expect(targetChainHistory.data[0].token).toBeDefined();
      expect(targetChainHistory.data[0].token.id).toEqual(tokenId);
      expect(targetChainHistory.data[0].token.issuing_chain).toEqual(dapp1Session.blockchainRid);
    },
    TIMEOUT_TEST
  );

  it('oracle cannot crosschain transfer yours tokens', async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const name = randomName();
      const tokenMetadata = createTokenMetadata(dapp1Session.blockchainRid, name);
      const tokenId = randomTokenId();
      await dapp1Session
        .transactionBuilder()
        .add(define(tokenId, tokenMetadata, 'yours'))
        .add(mint(tokenId, BigInt(1)))
        .buildAndSend();

      const metadata: TokenMetadata = await dapp1Session.query<TokenMetadata>('yours.metadata', {
        id: tokenId,
        issuing_chain: dapp1Session.blockchainRid,
      });

      // Act
      try {
        await performOracleCrossChainTransfer(
          environment.dapp1Client,
          environment.dapp2Client,
          ADMIN_SIGNATURE_PROVIDER,
          dapp1Session.account.id,
          dapp2Session.account.id,
          tokenId,
          dapp1Session.blockchainRid,
          BigInt(1),
          metadata
        );
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    },
    TIMEOUT_TEST
  );

  it('able to resume pending transfers', async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      await createAccount(environment.dapp2Client, keyPair);

      const name = randomName();
      const tokenMetadata = createTokenMetadata(dapp1Session.blockchainRid, name);
      const tokenId = randomTokenId();
    
      await dapp1Session
        .transactionBuilder()
        .add(define(tokenId, tokenMetadata, 'yours'))
        .add(mint(tokenId, BigInt(1)))
        .buildAndSend();

      const metadata: TokenMetadata = await dapp1Session.query<TokenMetadata>('yours.metadata', {
        id: tokenId,
        issuing_chain: dapp1Session.blockchainRid,
      });

      await initTransfer(dapp1Session, environment.dapp2Client, dapp1Session.account.id, tokenId, dapp1Session.blockchainRid, BigInt(1), metadata);

      const pendingTransfers = await dapp1Session.crosschain.getPendingTransfers(dapp1Session.account.id);
      expect(pendingTransfers.length).toBe(1);

      await dapp1Session.crosschain.resumeTransfer(pendingTransfers[0]);
    },
    TIMEOUT_TEST
  );
});
