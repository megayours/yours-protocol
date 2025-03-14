import { IMegaYoursClient, TokenMetadata } from '@megayours/sdk';

export type CrosschainTestParams = {
  dapp1Session: IMegaYoursClient;
  dapp2Session: IMegaYoursClient;
  tokenId: Buffer;
  tokenMetadata: TokenMetadata;
  mintAmount: bigint;
  transferAmount: bigint;
};
