#!/usr/bin/env node

import * as path from 'path';
import { promises as fs } from 'fs';
import { performance } from 'perf_hooks';
import * as arg from 'arg';
import { render } from '.';

const usage = `
Usage: x- <input> [options]

Options:

  -o, --output        Output path (Default: ./public)

  -v, --version       Prints the current version
`;

async function getEntries(inputPath: string, outputPath: string): Promise<string[][]> {
  const entries: string[][] = [];

  for (const file of await fs.readdir(inputPath, { withFileTypes: true })) {
    if (file.name[0] === '_') {
      continue;
    }

    if (file.isDirectory()) {
      entries.push(...(await getEntries(path.join(inputPath, file.name), path.join(outputPath, file.name))));
      continue;
    }

    if (path.extname(file.name) === '.html') {
      entries.push([path.join(inputPath, file.name), path.join(outputPath, file.name)])
    }
  }

  return entries;
}

async function main(): Promise<void> {
  const args = arg({
    '--output': String,
    '-o': '--output',

    '--version': Boolean,
    '-v': '--version',

    '--help': Boolean,
    '-h': '--help'
  });

  if (args['--version']) {
    console.log(require('../package.json').version);
    return;
  }

  if (args['--help']) {
    console.log(usage);
    return;
  }

  const inputPath = args._[0];
  const outputPath = args['--output'] || 'public';

  if (!inputPath) {
    throw new Error(`Input path is missing. See \`x- --help\` for usage instructions`);
  }

  const entries = (await fs.stat(inputPath)).isDirectory()
    ? await getEntries(inputPath, outputPath)
    : [[inputPath, path.extname(outputPath) === '' ? path.join(outputPath, path.basename(inputPath)) : outputPath]];

  for (const [entryInputPath, entryOutputPath] of entries) {
    const startTime = performance.now();

    const html = await render(entryInputPath);

    await fs.mkdir(path.dirname(entryOutputPath), { recursive: true });
    await fs.writeFile(entryOutputPath, html, 'utf-8');

    const renderTime = (performance.now() - startTime).toFixed(2);
    console.log(`${entryInputPath} \x1b[1;32m→\x1b[0m ${entryOutputPath} \x1b[2m(${renderTime}ms)\x1b[22m`);
  }
}

main().catch((error) => {
  console.error(error);
});
