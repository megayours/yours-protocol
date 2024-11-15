import { Session } from '@chromia/ft4';
import { TokenMetadata } from '@megayours/sdk';

import { ProjectMetadata } from '@megayours/sdk';

export type CrosschainTestParams = {
  dapp1Session: Session;
  dapp2Session: Session;
  tokenType: 'nft' | 'sft';
  project: ProjectMetadata;
  collection: string;
  tokenId: number;
  tokenMetadata: TokenMetadata;
  mintAmount: number;
  transferAmount: number;
};
