/* global console, process */
import { exec } from 'child_process';
import { config } from 'dotenv';
import { cwd } from 'process';

config();

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function runCli(args) {
  const command = `chr ${args.join(' ')}`;
  try {
    // Check if 'chr' is installed and on the path
    await runCommand('chr --version');

    // If 'chr' is installed, run the command
    console.log(`Running '${command}'`);
    const result = await runCommand(command);
    console.log(result.stdout);
  } catch (error) {
    console.log(`Error: ${error}`);
    // If 'chr' is not installed, run Docker command
    console.log(`Running Docker command for '${command}'`);

    const currentDir = cwd();
    const dockerCommand = `
    docker run \
          --mount type=bind,source="${currentDir}",target=/usr/app \
          --rm \
          ${process.env.CLI_IMAGE} ${command}`.trim();

    const dockerResult = await runCommand(dockerCommand);
    console.log(dockerResult.stdout);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Please provide arguments. Usage: bun chr.js <command> [args]');
  process.exit(1);
}

await runCli(args);
