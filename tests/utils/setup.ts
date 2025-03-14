import { config } from 'dotenv';
import { IClient, createClient } from 'postchain-client';

config();

export interface TestEnvironment {
  dapp1Client: IClient;
  dapp2Client: IClient;
}

export async function getTestEnvironment(): Promise<TestEnvironment> {
  // Bun execute docker compose up -d

  const dapp1Client = await createClient({
    directoryNodeUrlPool: `http://localhost:7740`,
    blockchainIid: 1,
  });

  const dapp2Client = await createClient({
    directoryNodeUrlPool: `http://localhost:7740`,
    blockchainIid: 2,
  });

  return {
    dapp1Client,
    dapp2Client,
  };
}
