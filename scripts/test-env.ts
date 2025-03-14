import { spawnSync } from 'bun';

const TIMEOUT = 60000; // 60 seconds

async function waitForService(url: string): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT) {
    try {
      const response = await fetch(url);
      if (response.status === 200) return true;
    } catch {
      await Bun.sleep(1000);
    }
  }

  throw new Error(`Service at ${url} did not become available within ${TIMEOUT}ms`);
}

export async function setupTestEnv() {
  try {
    console.log('Starting containers...');
    spawnSync(['docker', 'compose', 'up', '-d']);

    console.log('Waiting for service to be ready...');
    await waitForService('http://localhost:7740/brid/iid_2');
    console.log('Service is ready');
  } catch (error) {
    console.error('Error:', error);
    await teardownTestEnv();
    process.exit(1);
  }
}

export async function teardownTestEnv() {
  console.log('Cleaning up...');
  spawnSync(['docker', 'compose', 'down']);
}

// Handle process termination
process.on('SIGINT', teardownTestEnv);
process.on('SIGTERM', teardownTestEnv);

function main() {
  const command = process.argv[2];
  if (command === 'cleanup') {
    teardownTestEnv();
  } else {
    setupTestEnv();
  }
}

main();
