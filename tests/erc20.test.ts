import { expect } from "bun:test";

import { beforeAll, describe, it } from "bun:test";
import { getTestEnvironment, TestEnvironment } from "./utils/setup";
import { encryption } from 'postchain-client';
import { createAccount } from "./utils/ft4";
import { SUBSCRIBED_CHAIN, SUBSCRIBED_ERC20_CONTRACT, TIMEOUT_TEST } from "./utils/constants";
import { emitErc20Mint, emitErc20Transfer } from "./utils/operations/gamma_simulator";
import { createMegaYoursClient, TokenMetadata } from "@megayours/sdk";
import { evmAddressFromKeyPair, generateRandomWallet } from "./utils/address";

describe('erc20', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await getTestEnvironment();
  });

  it('should emit and handle mint event', async () => {
    const keyPair = encryption.makeKeyPair();
    const session = await createAccount(environment.dapp1Client, keyPair);

    const tokenName = 'Test MEGA';
    const tokenSymbol = 'tMEGA';
    const decimals = 6;

    const to = generateRandomWallet();
    const amount = BigInt(10_000_000);

    await session
      .transactionBuilder()
      .add(emitErc20Mint(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC20_CONTRACT, tokenName, tokenSymbol, decimals, to, amount))
      .buildAndSend();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const balance = await environment.dapp2Client.query<{ id: Buffer, amount: bigint }>('erc20.balance', {
      chain: SUBSCRIBED_CHAIN,
      contract: SUBSCRIBED_ERC20_CONTRACT,
      account_id: to,
    });

    expect(balance.amount).toEqual(amount);

    const dapp2Metadata = await environment.dapp2Client.query<TokenMetadata>('yours.metadata', {
      id: balance.id,
      issuing_chain: Buffer.from(environment.dapp1Client.config.blockchainRid, 'hex'),
    });

    const certificateBalance = await environment.dapp1Client.query<bigint>('yours.balance', {
      id: balance.id,
      issuing_chain: Buffer.from(environment.dapp1Client.config.blockchainRid, 'hex'),
      account_id: to,
    });

    expect(certificateBalance).toEqual(BigInt(1));

    expect(dapp2Metadata.properties['erc20']).toBeDefined();
    expect(dapp2Metadata.properties['erc20']['chain']).toEqual(SUBSCRIBED_CHAIN.toLowerCase());
    expect(dapp2Metadata.properties['erc20']['contract']).toEqual(SUBSCRIBED_ERC20_CONTRACT.toString('hex'));
    expect(dapp2Metadata.properties['erc20']['name']).toEqual(tokenName);
    expect(dapp2Metadata.properties['erc20']['symbol']).toEqual(tokenSymbol);
    expect(dapp2Metadata.properties['erc20']['decimals']).toEqual(decimals);
    expect(dapp2Metadata.properties['erc20']['balance']).toEqual(amount);
    expect(dapp2Metadata.yours.modules).toContain('erc20');
    expect(dapp2Metadata.yours.decimals).toEqual(0);
  },
    TIMEOUT_TEST
  );

  it('should emit and handle transfer event', async () => {
    const keyPair = encryption.makeKeyPair();
    const session = await createAccount(environment.dapp1Client, keyPair);

    const tokenName = 'Test MEGA';
    const tokenSymbol = 'tMEGA';
    const decimals = 6;

    const walletOne = generateRandomWallet();
    const walletTwo = generateRandomWallet();
    const mintAmount = BigInt(10_000_000);
    const transferAmount = BigInt(5_000_000);

    await session
      .transactionBuilder()
      .add(emitErc20Mint(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC20_CONTRACT, tokenName, tokenSymbol, decimals, walletOne, mintAmount))
      .add(emitErc20Transfer(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC20_CONTRACT, walletOne, walletTwo, transferAmount))
      .buildAndSend();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const balanceOne = await environment.dapp2Client.query<{ id: Buffer, amount: bigint }>('erc20.balance', {
      chain: SUBSCRIBED_CHAIN,
      contract: SUBSCRIBED_ERC20_CONTRACT,
      account_id: walletOne,
    });

    const balanceTwo = await environment.dapp2Client.query<{ id: Buffer, amount: bigint }>('erc20.balance', {
      chain: SUBSCRIBED_CHAIN,
      contract: SUBSCRIBED_ERC20_CONTRACT,
      account_id: walletTwo,
    });

    expect(balanceOne.amount).toEqual(mintAmount - transferAmount);
    expect(balanceTwo.amount).toEqual(transferAmount);
  }, TIMEOUT_TEST);

  it('should handle crosschain transfer for external token', async () => {
    const keyPair = encryption.makeKeyPair();
    const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
    const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

    const tokenName = 'Test MEGA';
    const tokenSymbol = 'tMEGA';
    const decimals = 6;

    const to = evmAddressFromKeyPair(keyPair);
    const mintAmount = BigInt(10_000_000);

    await dapp1Session
      .transactionBuilder()
      .add(emitErc20Mint(SUBSCRIBED_CHAIN, SUBSCRIBED_ERC20_CONTRACT, tokenName, tokenSymbol, decimals, to, mintAmount))
      .buildAndSend();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const sourceBalanceBefore = await environment.dapp1Client.query<{ id: Buffer, amount: bigint }>('erc20.balance', {
      chain: SUBSCRIBED_CHAIN,
      contract: SUBSCRIBED_ERC20_CONTRACT,
      account_id: dapp1Session.account.id,
    });

    const megaClient = createMegaYoursClient(dapp1Session);
    await megaClient.crosschain.transfer(dapp2Session.client, dapp2Session.account.id, sourceBalanceBefore.id, dapp1Session.blockchainRid, BigInt(1));

    const sourceBalanceAfter = await environment.dapp1Client.query<bigint>('yours.balance', {
      id: sourceBalanceBefore.id,
      issuing_chain: dapp1Session.blockchainRid,
      account_id: dapp1Session.account.id,
    });
   
    expect(sourceBalanceAfter).toEqual(BigInt(0));

    const destinationBalanceAfter = await environment.dapp2Client.query<bigint>('yours.balance', {
      id: sourceBalanceBefore.id,
      issuing_chain: dapp1Session.blockchainRid,
      account_id: dapp2Session.account.id,
    });

    expect(destinationBalanceAfter).toEqual(BigInt(1));
  }, TIMEOUT_TEST);
});