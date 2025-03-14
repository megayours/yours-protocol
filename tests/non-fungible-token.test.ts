import { encryption } from 'postchain-client';
import { createAccount } from './utils/ft4';
import { getTestEnvironment, TestEnvironment } from './utils/setup';
import { TIMEOUT_TEST } from './utils/constants';
import { createTokenMetadata } from './utils/metadata';
import { randomName } from './utils/random';
import { TokenMetadata } from '@megayours/sdk';
import { beforeAll, describe, expect, it } from 'bun:test';
import { define, mint } from './utils/operations/importer';
import { randomTokenId } from './utils/token_id';
import { transfer } from './utils/operations/mkpl';

describe('Non-Fungible Token', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await getTestEnvironment();
  });

  it('able to create a token', async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);

      const name = randomName();
      const tokenMetadata = createTokenMetadata(session.blockchainRid, name);

      const tokenId = randomTokenId();
      
      await session
        .transactionBuilder()
        .add(
          define(
            tokenId,
            tokenMetadata,
            'yours'
          )
        )
        .add(mint(tokenId, BigInt(1)))
        .buildAndSend();

      const balance = await session.query<bigint>('yours.balance', {
        account_id: session.account.id,
        id: tokenId,
        issuing_chain: session.blockchainRid,
      });
      expect(balance).toBe(BigInt(1));
    },
    TIMEOUT_TEST
  );

  it('has correct metadata', async () => {
    const keyPair = encryption.makeKeyPair();
    const session = await createAccount(environment.dapp1Client, keyPair);

    const name = randomName();
    const tokenMetadata = createTokenMetadata(session.blockchainRid, name);

    const tokenId = randomTokenId();

    await session
      .transactionBuilder()
      .add(define(tokenId, tokenMetadata, 'yours'))
      .add(mint(tokenId, BigInt(1)))
      .buildAndSend();

    const metadata = await session.query<TokenMetadata>('yours.metadata', {
      id: tokenId,
      issuing_chain: session.blockchainRid,
    });

    expect(metadata.properties['info']['name']).toBe(name);
    expect(metadata.properties['noModuleAssigned']['rich_property']['name'])
      .toEqual(tokenMetadata.properties.noModuleAssigned.rich_property['name']);
    expect(metadata.properties['noModuleAssigned']['rich_property']['value'])
      .toEqual(tokenMetadata.properties.noModuleAssigned.rich_property['value']);
    expect(metadata.properties['noModuleAssigned']['rich_property']['display_value'])
      .toEqual(tokenMetadata.properties.noModuleAssigned.rich_property['display_value']);
    expect(metadata.properties['noModuleAssigned']['rich_property']['class'])
      .toEqual(tokenMetadata.properties.noModuleAssigned.rich_property['class']);
    expect(metadata.properties['noModuleAssigned']['rich_property']['css']['color'])
      .toEqual(tokenMetadata.properties.noModuleAssigned.rich_property['css']['color']);
    expect(metadata.properties['noModuleAssigned']['rich_property']['css']['font-weight'])
      .toEqual(tokenMetadata.properties.noModuleAssigned.rich_property['css']['font-weight']);
    expect(metadata.properties['noModuleAssigned']['rich_property']['css']['text-decoration'])
      .toEqual(tokenMetadata.properties.noModuleAssigned.rich_property['css']['text-decoration']);
    expect(metadata.yours.modules).toBeDefined();
  },
    TIMEOUT_TEST
  );

  it('unable to transfer soulbound token', async () => {
    const keyPair = encryption.makeKeyPair();
    const session = await createAccount(environment.dapp1Client, keyPair);

    const name = randomName();
    const tokenMetadata = createTokenMetadata(session.blockchainRid, name);

    const tokenId = randomTokenId();

    // First, create the soulbound SFT and mint it
    await session
      .transactionBuilder()
      .add(define(tokenId, tokenMetadata, 'soulbound'))
      .add(mint(tokenId, BigInt(1)))
      .buildAndSend();

    // Now, try to transfer the soulbound SFT and expect it to fail
    try {
      await session
        .transactionBuilder()
        .add(transfer(tokenId, BigInt(1), Buffer.from('DEADBEEF', 'hex')))
        .buildAndSend();
      throw new Error('Should have thrown an error');
    } catch (error) {
      expect(error.message).toContain('Only tokens of type yours can be transferred');
    }
  },
    TIMEOUT_TEST
  );

  it('mint saves an history entry', async () => {
    const keyPair = encryption.makeKeyPair();
    const session = await createAccount(environment.dapp1Client, keyPair);

    const name = randomName();
    const tokenMetadata = createTokenMetadata(session.blockchainRid, name);

    const tokenId = randomTokenId();

    // First, create the soulbound SFT and mint it
    await session
      .transactionBuilder()
      .add(define(tokenId, tokenMetadata, 'soulbound'))
      .add(mint(tokenId, BigInt(1)))
      .buildAndSend();

    const history = await session.history.getTransfers({ account_id: session.account.id }, 1, null);

    expect(history.data.length).toBe(1);
    expect(history.data[0].amount).toBe(BigInt(1));
    expect(history.data[0].blockchain_rid).toBeNull(); // Not a crosschain transfer
    expect(history.data[0].decimals).toBe(0);
    expect(history.data[0].op_index).toBe(3);
    expect(history.data[0].type).toBe('received');
    expect(history.data[0].token).toBeDefined();
    expect(history.data[0].token.id).toEqual(tokenId);
    expect(history.data[0].token.issuing_chain).toEqual(session.blockchainRid);
  },
    TIMEOUT_TEST
  );

  it('transfer saves two history entries', async () => {
      const keyPair = encryption.makeKeyPair();
      const session = await createAccount(environment.dapp1Client, keyPair);
      const session2 = await createAccount(environment.dapp1Client, encryption.makeKeyPair());

      const name = randomName();
      const tokenMetadata = createTokenMetadata(session.blockchainRid, name);

      const tokenId = randomTokenId();

      // First, create the soulbound SFT and mint it
      await session
        .transactionBuilder()
        .add(define(tokenId,tokenMetadata, 'yours'))
        .add(mint(tokenId, BigInt(1)))
        .buildAndSend();

      await session
        .transactionBuilder()
        .add(transfer(tokenId, BigInt(1), session2.account.id))
        .buildAndSend();

      const historySender = await session.history.getTransfers({ account_id: session.account.id }, 1, null);

      expect(historySender.data.length).toBe(1);
      expect(historySender.data[0].amount).toBe(BigInt(1));
      expect(historySender.data[0].blockchain_rid).toBeNull(); // Not a crosschain transfer
      expect(historySender.data[0].decimals).toBe(0);
      expect(historySender.data[0].op_index).toBe(1);
      expect(historySender.data[0].type).toBe('sent');
      expect(historySender.data[0].token).toBeDefined();
      expect(historySender.data[0].token.id).toEqual(tokenId);
      expect(historySender.data[0].token.issuing_chain).toEqual(session.blockchainRid);

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
      expect(historyReceiver.data[0].token.id).toEqual(tokenId);
      expect(historyReceiver.data[0].token.issuing_chain).toEqual(session.blockchainRid);
    },
    TIMEOUT_TEST
  );
});
