import { encryption } from 'postchain-client';
import { ADMIN_SIGNATURE_PROVIDER, SUBSCRIBED_CHAIN, SUBSCRIBED_ERC721_CONTRACT, TIMEOUT_TEST } from './utils/constants';
import { getTestEnvironment, TestEnvironment } from './utils/setup';
import { createAccount } from './utils/ft4';
import { createMegaYoursClient, Property, TokenMetadata } from '@megayours/sdk';
import { evmAddressFromKeyPair } from './utils/address';
import { performOracleCrossChainTransfer } from './utils/crosschain';
import { beforeAll, describe, expect, it } from 'bun:test';
import { bigintToBuffer, calculateERC721TokenId, randomTokenIdBigInt } from './utils/token_id';
import { emitErc721Mint, emitErc721Transfer } from './utils/operations/gamma_simulator';

describe('erc721', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await getTestEnvironment();
  });

  it('should emit and handle mint event', async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);

      const tokenId = randomTokenIdBigInt();
      const tokenName = 'Pudgy Penguin #1';
      const metadata = JSON.stringify({
        name: tokenName,
        description: 'Pudgy Penguin',
        image: 'https://pudgypenguins.com/pudgy.png',
        animation_url: 'https://pudgypenguins.com/pudgy.mp4',
      });
      const to = Buffer.from('0x8309f9456fe37dce5a34339097803b51ba8d37b3'.replace('0x', ''), 'hex');

      await session
        .transactionBuilder()
        .add(emitErc721Mint(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC721_CONTRACT, tokenId, metadata, to, BigInt(1)))
        .buildAndSend();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const ownerAccountIds = await environment.dapp2Client.query<{ data: Buffer[] }>('erc721.owners_account_ids', {
        chain: SUBSCRIBED_CHAIN,
        contract: SUBSCRIBED_ERC721_CONTRACT,
        token_id: tokenId,
        page_size: null,
        page_cursor: null,
      });

      expect(ownerAccountIds.data.length).toEqual(1);
      expect(ownerAccountIds.data[0].toString('hex')).toEqual(to.toString('hex'));

      const dapp2Metadata = await environment.dapp2Client.query<TokenMetadata>('erc721.metadata', {
        chain: SUBSCRIBED_CHAIN,
        contract: SUBSCRIBED_ERC721_CONTRACT,
        token_id: tokenId,
      });

      expect(dapp2Metadata.properties['info']['name']).toEqual(tokenName);
      expect(dapp2Metadata.properties['erc721']['animation_url']).toEqual('https://pudgypenguins.com/pudgy.mp4');
      expect(dapp2Metadata.properties['erc721']['description']).toEqual('Pudgy Penguin');
      expect(dapp2Metadata.properties['erc721']['image']).toEqual('https://pudgypenguins.com/pudgy.png');
      expect(dapp2Metadata.yours.modules).toContain('erc721');
      expect(dapp2Metadata.yours.modules).toContain('info');
    },
    TIMEOUT_TEST
  );

  it('should emit and handle transfer event', async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);

      const tokenId = randomTokenIdBigInt();
      const chain = 'Ethereum';
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
        .add(emitErc721Mint(chain, SUBSCRIBED_ERC721_CONTRACT, tokenId, metadata, from, BigInt(1)))
        .add(emitErc721Transfer(chain, SUBSCRIBED_ERC721_CONTRACT, tokenId, from, to, BigInt(1)))
        .buildAndSend();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const ownerAccountIds = await environment.dapp2Client.query<{ data: Buffer[] }>('erc721.owners_account_ids', {
        chain,
        contract: SUBSCRIBED_ERC721_CONTRACT,
        token_id: tokenId,
        page_size: 1,
        page_cursor: null,
      });

      expect(ownerAccountIds.data.length).toEqual(1);
      expect(ownerAccountIds.data[0].toString('hex')).toEqual(to.toString('hex'));
    },
    TIMEOUT_TEST
  );

  it('should handle crosschain transfer for external onchain tokens', async () => {
      const keyPair = encryption.makeKeyPair();
      const evmAddress = evmAddressFromKeyPair(keyPair);

      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const tokenId = randomTokenIdBigInt();

      const tokenName = 'Pudgy Penguin #2';
      const metadata = JSON.stringify({
        name: tokenName,
        description: 'Pudgy Penguin',
        image: 'https://pudgypenguins.com/pudgy.png',
        animation_url: 'https://pudgypenguins.com/pudgy.mp4',
      });

      await dapp1Session
        .transactionBuilder()
        .add(emitErc721Mint(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC721_CONTRACT, tokenId, metadata, evmAddress, BigInt(1)))
        .buildAndSend();

      const ownerships = await dapp1Session.balance.getTokenBalances({ account_id: dapp1Session.account.id });
      expect(ownerships.data.length).toEqual(1);
      expect(ownerships.data[0].amount).toEqual(BigInt(1));

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const ownerAccountIds = await dapp2Session.query<{ data: Buffer[] }>('erc721.owners_account_ids', {
        chain: SUBSCRIBED_CHAIN,
        contract: SUBSCRIBED_ERC721_CONTRACT,
        token_id: tokenId,
        page_size: null,
        page_cursor: null,
      });
      expect(ownerAccountIds.data.length).toEqual(1);
      expect(ownerAccountIds.data[0].toString('hex')).toEqual(dapp2Session.account.id.toString('hex'));
      
      const expectedTokenId = calculateERC721TokenId(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC721_CONTRACT, bigintToBuffer(tokenId));
      const megaClient = createMegaYoursClient(dapp1Session);
      await megaClient.crosschain.transfer(dapp2Session.client, dapp2Session.account.id, expectedTokenId, dapp1Session.blockchainRid, BigInt(1));

      const dapp1Balance = await dapp1Session.balance.getTokenBalance(dapp1Session.account.id, expectedTokenId);
      expect(dapp1Balance).toEqual(BigInt(0));

      const dapp2Metadata = await dapp2Session.token.getMetadata(expectedTokenId, dapp1Session.blockchainRid);

      expect(dapp2Metadata).toBeDefined();
      expect(dapp2Metadata.yours.type).toEqual('external');
      expect(dapp2Metadata.properties['info']).toBeDefined();
      expect(dapp2Metadata.properties['info']['name']).toEqual(tokenName);
      expect(dapp2Metadata.properties['erc721']).toBeDefined();
      expect(dapp2Metadata.properties['erc721']['name']).toEqual(tokenName);
      expect(dapp2Metadata.properties['erc721']['animation_url']).toEqual('https://pudgypenguins.com/pudgy.mp4');
      expect(dapp2Metadata.properties['erc721']['description']).toEqual('Pudgy Penguin');
      expect(dapp2Metadata.properties['erc721']['image']).toEqual('https://pudgypenguins.com/pudgy.png');
      expect(dapp2Metadata.yours.modules).toContain('erc721');
      expect(dapp2Metadata.yours.modules).toContain('info');
    },
    TIMEOUT_TEST
  );

  it('should normalize erc721 attributes for external tokens', async () => {
      const keyPair = encryption.makeKeyPair();
      const evmAddress = evmAddressFromKeyPair(keyPair);

      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const tokenId = randomTokenIdBigInt();
      const expectedTokenId = calculateERC721TokenId(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC721_CONTRACT, bigintToBuffer(tokenId));
      const tokenName = 'Pudgy Penguin #2';
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
        .add(emitErc721Mint(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC721_CONTRACT, tokenId, metadata, evmAddress, BigInt(1)))
        .buildAndSend();

      const ownerships = await dapp1Session.balance.getTokenBalances({ account_id: dapp1Session.account.id });
      expect(ownerships.data.length).toEqual(1);
      expect(ownerships.data[0].amount).toEqual(BigInt(1));

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const ownerAccountIds = await dapp2Session.external.getExternalOwnersAccountIds(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC721_CONTRACT, tokenId);
      expect(ownerAccountIds.data.length).toEqual(1);
      expect(ownerAccountIds.data[0].toString('hex')).toEqual(dapp2Session.account.id.toString('hex'));

      const megaClient = createMegaYoursClient(dapp1Session);
      await megaClient.crosschain.transfer(dapp2Session.client, dapp2Session.account.id, expectedTokenId, dapp1Session.blockchainRid, BigInt(1));

      const dapp1Balance = await dapp1Session.balance.getTokenBalance(dapp1Session.account.id, expectedTokenId);
      expect(dapp1Balance).toEqual(BigInt(0));

      const dapp2Metadata = await dapp2Session.token.getMetadata(expectedTokenId, dapp1Session.blockchainRid);
      expect(dapp2Metadata).toBeDefined();

      expect(dapp2Metadata.yours.type).toEqual('external');

      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(dapp2Metadata.properties['erc721']['attributes'][0]).toBeDefined();
      expect(dapp2Metadata.properties['erc721']['attributes'][0].value).toEqual('Blue');
    },
    TIMEOUT_TEST
  );

  it('should normalize erc1155 properties for external tokens', async () => {
      const keyPair = encryption.makeKeyPair();
      const evmAddress = evmAddressFromKeyPair(keyPair);

      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const tokenId = randomTokenIdBigInt();
      const expectedTokenId = calculateERC721TokenId(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC721_CONTRACT, bigintToBuffer(tokenId));
      const tokenName = 'Pudgy Penguin #2';
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
        .add(emitErc721Mint(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC721_CONTRACT, tokenId, metadata, evmAddress, BigInt(1)))
        .buildAndSend();

      const ownerships = await dapp1Session.balance.getTokenBalances({ account_id: dapp1Session.account.id });
      expect(ownerships.data.length).toEqual(1);
      expect(ownerships.data[0].amount).toEqual(BigInt(1));

      if (ownerships.data[0].id.toString('hex') !== expectedTokenId.toString('hex')) {
        throw new Error(`Token ID mismatch: ${ownerships.data[0].id.toString('hex')} !== ${expectedTokenId.toString('hex')}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const ownerAccountIds = await dapp2Session.external.getExternalOwnersAccountIds(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC721_CONTRACT, tokenId);
      expect(ownerAccountIds.data.length).toEqual(1);
      expect(ownerAccountIds.data[0].toString('hex')).toEqual(dapp2Session.account.id.toString('hex'));

      const megaClient = createMegaYoursClient(dapp1Session);
      await megaClient.crosschain.transfer(dapp2Session.client, dapp2Session.account.id, expectedTokenId, dapp1Session.blockchainRid, BigInt(1));

      const dapp1Balance = await dapp1Session.balance.getTokenBalance(dapp1Session.account.id, expectedTokenId);
      expect(dapp1Balance).toEqual(BigInt(0));

      const dapp2Metadata = await dapp2Session.token.getMetadata(expectedTokenId, dapp1Session.blockchainRid);
      expect(dapp2Metadata).toBeDefined();

      expect(dapp2Metadata.yours.type).toEqual('external');

      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(dapp2Metadata.properties['erc721']['properties']['attributes']).toBeUndefined();
      expect(dapp2Metadata.properties['erc721']['properties']['Background']).toEqual('Blue');
      expect(dapp2Metadata.properties['erc721']['properties']['NestedObject']).toEqual({
        NestedKey: 'NestedValue',
      } as unknown as Property);
    },
    TIMEOUT_TEST
  );

  it('should handle crosschain transfer returning to the same chain for external onchain tokens', async () => {
      const keyPair = encryption.makeKeyPair();
      const evmAddress = evmAddressFromKeyPair(keyPair);

      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const tokenId = randomTokenIdBigInt();
      const expectedTokenId = calculateERC721TokenId(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC721_CONTRACT, bigintToBuffer(tokenId));

      const metadata = JSON.stringify({
        name: 'Pudgy Penguin',
        description: 'Pudgy Penguin',
        image: 'https://pudgypenguins.com/pudgy.png',
        animation_url: 'https://pudgypenguins.com/pudgy.mp4',
      });

      await dapp1Session
        .transactionBuilder()
        .add(emitErc721Mint(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC721_CONTRACT, tokenId, metadata, evmAddress, BigInt(1)))
        .buildAndSend();

      const ownerships = await dapp1Session.balance.getTokenBalances({ account_id: dapp1Session.account.id });
      expect(ownerships.data.length).toEqual(1);
      expect(ownerships.data[0].amount).toEqual(BigInt(1));

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Ensure the token was picked up by the other chain
      const ownerAccountIds = await dapp2Session.external.getExternalOwnersAccountIds(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC721_CONTRACT, tokenId);
      expect(ownerAccountIds.data.length).toEqual(1);
      expect(ownerAccountIds.data[0].toString('hex')).toEqual(dapp2Session.account.id.toString('hex'));

      // Transfer the token to the other chain
      await dapp1Session.crosschain.transfer(dapp2Session.client, dapp2Session.account.id, expectedTokenId, dapp1Session.blockchainRid, BigInt(1));

      // Transfer the token back to the original chain
      await dapp2Session.crosschain.transfer(dapp1Session.client, dapp1Session.account.id, expectedTokenId, dapp1Session.blockchainRid, BigInt(1));

      const dapp1Balance = await dapp1Session.balance.getTokenBalance(dapp1Session.account.id, expectedTokenId);
      expect(dapp1Balance).toEqual(BigInt(1));

      const dapp2Balance = await dapp2Session.balance.getTokenBalance(dapp2Session.account.id, expectedTokenId, dapp1Session.blockchainRid);
      expect(dapp2Balance).toEqual(BigInt(0));
    },
    TIMEOUT_TEST
  );

  it('oracle can crosschain transfer external tokens', async () => {
      // Arrange
      const keyPair = encryption.makeKeyPair();
      const evmAddress = evmAddressFromKeyPair(keyPair);

      const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
      const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

      const tokenId = randomTokenIdBigInt();
      const expectedTokenId = calculateERC721TokenId(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC721_CONTRACT, bigintToBuffer(tokenId));
      const tokenName = 'Pudgy Penguin #2';

      const createMetadata = JSON.stringify({
        name: tokenName,
        description: 'Pudgy Penguin',
        image: 'https://pudgypenguins.com/pudgy.png',
        animation_url: 'https://pudgypenguins.com/pudgy.mp4',
      });

      await dapp1Session
        .transactionBuilder()
        .add(emitErc721Mint(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC721_CONTRACT, tokenId, createMetadata, evmAddress, BigInt(1)))
        .buildAndSend();

      const ownerships = await dapp1Session.balance.getTokenBalances({ account_id: dapp1Session.account.id });
      expect(ownerships.data.length).toEqual(1);
      expect(ownerships.data[0].amount).toEqual(BigInt(1));

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const metadata: TokenMetadata = await dapp1Session.query<TokenMetadata>('yours.metadata', {
        id: expectedTokenId,
        issuing_chain: dapp1Session.blockchainRid,
      });

      // Act
      await performOracleCrossChainTransfer(
        environment.dapp1Client,
        environment.dapp2Client,
        ADMIN_SIGNATURE_PROVIDER,
        dapp1Session.account.id,
        dapp2Session.account.id,
        expectedTokenId,
        dapp1Session.blockchainRid,
        BigInt(1),
        metadata
      );

      // Verify
      const sourceChainHistory = await dapp1Session.history.getTransfers({ account_id: dapp1Session.account.id }, 1, null);
      expect(sourceChainHistory.data.length).toBe(1);
      expect(sourceChainHistory.data[0].amount).toBe(BigInt(1));
      expect(sourceChainHistory.data[0].blockchain_rid).toEqual(dapp2Session.blockchainRid);
      expect(sourceChainHistory.data[0].decimals).toBe(0);
      expect(sourceChainHistory.data[0].op_index).toBe(0);
      expect(sourceChainHistory.data[0].type).toBe('sent');
      expect(sourceChainHistory.data[0].token).toBeDefined();
      expect(sourceChainHistory.data[0].token.id).toEqual(expectedTokenId);
      expect(sourceChainHistory.data[0].token.issuing_chain).toEqual(dapp1Session.blockchainRid);

      const targetChainHistory = await dapp2Session.history.getTransfers({ account_id: dapp2Session.account.id }, 1, null);
      expect(targetChainHistory.data.length).toBe(1);
      expect(targetChainHistory.data[0].amount).toBe(BigInt(1));
      expect(targetChainHistory.data[0].blockchain_rid).toEqual(dapp1Session.blockchainRid);
      expect(targetChainHistory.data[0].decimals).toBe(0);
      expect(targetChainHistory.data[0].op_index).toBe(1);
      expect(targetChainHistory.data[0].type).toBe('received');
      expect(targetChainHistory.data[0].token).toBeDefined();
      expect(targetChainHistory.data[0].token.id).toEqual(expectedTokenId);
      expect(targetChainHistory.data[0].token.issuing_chain).toEqual(dapp1Session.blockchainRid);
    },
    TIMEOUT_TEST
  );
});
