import { encryption } from "postchain-client";
import { createAccount } from "./utils/ft4";
import { getTestEnvironment, teardown, TestEnvironment } from "./utils/setup";
import { TEST_PROJECT, TIMEOUT_SETUP, TIMEOUT_TEST } from "./utils/constants";
import { op } from "@chromia/ft4";
import { createTokenMetadata, serializeTokenMetadata } from "./utils/metadata";
import { expect } from "@jest/globals";
import { randomCollectionName } from "./utils/random";

describe('Semi-Fungible Token', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await getTestEnvironment();
  }, TIMEOUT_SETUP);

  afterAll(async () => {
    await teardown(environment.network, environment.chromiaNode, environment.postgres);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }, TIMEOUT_SETUP);

  it('able to create a Semi-Fungible Token', async () => {
    const keyPair = encryption.makeKeyPair();
    const session = await createAccount(environment.dapp1Client, keyPair);

    const collection = randomCollectionName();
    const tokenMetadata = createTokenMetadata(collection);

    await session.transactionBuilder()
      .add(op("importer.sft", serializeTokenMetadata(tokenMetadata)))
      .buildAndSend();
  }, TIMEOUT_TEST);

  it('able to mint a Semi-Fungible Token', async () => {
    const keyPair = encryption.makeKeyPair();
    const session = await createAccount(environment.dapp1Client, keyPair);

    const collection = randomCollectionName();
    const tokenMetadata = createTokenMetadata(collection);

    const mintAmount = 2;
    await session.transactionBuilder()
      .add(op("importer.sft", serializeTokenMetadata(tokenMetadata)))
      .add(op("importer.mint", TEST_PROJECT, collection, 0, mintAmount))
      .buildAndSend();

    const balance = await session.query<number>(
      "yours.balance",
      {
        account_id: session.account.id,
        project: TEST_PROJECT,
        collection,
        token_id: 0
      }
    );
    expect(balance).toBe(mintAmount);
  }, TIMEOUT_TEST);
});