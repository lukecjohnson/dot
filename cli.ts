#!/usr/bin/env node

import * as path from 'path';
import { promises as fs } from 'fs';
import { performance } from 'perf_hooks';

import * as arg from 'arg';

import { render } from '.';
import { version } from './package.json';

const usage = `
Usage: x- <input> [options]

Options:

  -o, --output        Output path (Default: ./public)

  -v, --version       Prints the current version
`;

async function getEntries(inputPath: string, outputPath: string): Promise<string[][]> {
  let files: string[];

  try {
    files = await fs.readdir(inputPath);
  } catch(error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Could not find ${inputPath}`);
    } else {
      throw new Error(`Failed to read ${inputPath}`);
    }
  }

  let entries: string[][] = [];

  for (const file of files) {
    if (file[0] === '_') {
      continue;
    }

    const isDirectory = (await fs.stat(path.join(inputPath, file))).isDirectory();
    
    if (isDirectory) {
      entries = [
        ...entries,
        ...(await getEntries(path.join(inputPath, file), path.join(outputPath, file)))
      ];

      continue;
    } 
    
    if (path.extname(file) === '.html') {
      entries = [
        ...entries,
        [path.join(inputPath, file), path.join(outputPath, file)]
      ];
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
    console.log(version);
    return;
  }

  if (args['--help']) {
    console.log(usage);
    return;
  }

  const inputPath = args._[0];

  if (!inputPath) {
    throw new Error(`Input path is missing. See \`x- --help\` for usage instructions`)
  }

  const outputPath = args['--output'] || 'public';

  let inputPathIsDirectory;

  try {
    inputPathIsDirectory = (await fs.stat(inputPath)).isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Could not find "${inputPath}"`);
    } else {
      throw new Error(`Failed to read "${inputPath}"`);
    }
  }

  const outputPathIsDirectory = path.extname(outputPath) === '';

  let entries: string[][];

  if (inputPathIsDirectory) {
    entries = await getEntries(inputPath, outputPath);
  } else {
    entries = [
      [
        inputPath,
        outputPathIsDirectory ? path.join(outputPath, path.basename(inputPath)) : outputPath 
      ]
    ];
  }

  for (const [entryInputPath, entryOutputPath] of entries) {
    const startTime = performance.now();

    const html = await render(entryInputPath);

    try {
      await fs.mkdir(path.dirname(entryOutputPath), { recursive: true });
    } catch {
      throw new Error('Failed to create output directory');
    }
  
    try {
      await fs.writeFile(entryOutputPath, html, 'utf-8');
    } catch {
      throw new Error(`Failed to write "${entryOutputPath}"`)
    }

    const renderTime = (performance.now() - startTime).toFixed(2);
    console.log(`${entryInputPath} \x1b[1;32m→\x1b[0m ${entryOutputPath} \x1b[2m(${renderTime}ms)\x1b[22m`);
  }
}

main().catch((error) => {
  console.error(error);
});
