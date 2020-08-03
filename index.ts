#!/usr/bin/env node

import * as path from 'path';
import { promises as fs } from 'fs';
import { performance } from 'perf_hooks';

import * as arg from 'arg';
import * as marked from 'marked';
import { html as formatHTML } from 'js-beautify';

import { version } from './package.json';

const usage = `
Usage: x- [input] [options]

Options:

  --output            Path to output directory (default: ./public)

  --content           Path to content directory (default: [input]/_content)

  --components        Path to components directory (default: [input]/_components)

  -v, --version       Prints the current version
`;

let inputDir: string;
let outputDir: string;
let contentDir: string;
let componentsDir: string;

function normalizeWhitespace(html: string): string {
  return html.replace(/^\s+|\s+$/g, '');
}

function stripComments(html: string): string {
  return html.replace(/<!--.*?-->/gms, '');
}

function parseComponentProps(props: string): { key: string; value: string }[] {
  return [...props.matchAll(/([a-z][a-z0-9-]*)="([^"]*)"/gm)]
    .map((prop) => {
      return {
        key: prop[1],
        value: normalizeWhitespace(prop[2])
      }
    });
}

async function compileComponents(html: string): Promise<string> {
  const componentPattern = /<x-component src="([a-z-_.\/]*)"((?:\s+[a-z][a-z0-9-]*="[^"]*")*)\s*(?:\/>|>(?!.*<x-component)(.*?)<\/x-component>)/gms;

  for (const component of html.matchAll(componentPattern)) {
    const [ element, src, props, content ] = component;

    const file = path.extname(src) === '.html' ? src : `${src}.html`

    let componentHTML: string;

    try {
      componentHTML = await fs.readFile(path.join(componentsDir, file), { encoding: 'utf-8' });
    } catch(error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Could not find component "${src}" - please ensure "${file}" exists in the components directory`);
      } else {
        throw new Error(`Failed to read HTML file for component "${src}"`);
      }
    }

    componentHTML = stripComments(componentHTML);

    for (const prop of parseComponentProps(props)) {
      componentHTML = componentHTML.replace(new RegExp(`{{\\s?${prop.key}\\s?}}`, 'g'), prop.value);
    }

    for (const slot of componentHTML.matchAll(/<x-slot(?:\s*\/>|>(.*?)<\/x-slot>)/gms)) {
      const [ slotElement, fallbackContent ] = slot;
      componentHTML = componentHTML.replace(slotElement, normalizeWhitespace(content) || normalizeWhitespace(fallbackContent));
    }

    html = html.replace(element, normalizeWhitespace(componentHTML));
  }

  if (componentPattern.test(html)) {
    html = await compileComponents(html);
  }

  return html;
}

async function compileContent(html: string): Promise<string> {
  for (const content of html.matchAll(/<x-content\s+src="([a-z-_.\/]+)"(?:\s*\/>|>\s*<\/x-content>)/gm)) {
    const [ element, src ] = content;

    const file = path.extname(src) === '.md' ? src : `${src}.md`

    let markdown: string;

    try {
      markdown = await fs.readFile(path.join(contentDir, file), { encoding: 'utf-8' });
    } catch(error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Could not find "${src}" - please ensure "${file}" exists in the content directory`);
      } else {
        throw new Error(`Failed to read "${src}"`);
      }
    }

    html = html.replace(element, marked(markdown, { headerIds: false }));
  }

  return html;
}

async function compileEntry(entry: string): Promise<void> {
  let html: string;

  try {
    html = await fs.readFile(path.join(inputDir, entry), { encoding: 'utf-8' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Could not find "${entry}"`);
    } else {
      throw new Error(`Failed to read "${entry}"`);
    }
  }

  html = stripComments(html);

  html = await compileContent(html);
  html = await compileComponents(html);

  html = formatHTML(html, { 
    indent_size: 2, 
    preserve_newlines: false,
    wrap_line_length: 120
  });

  try {
    await fs.mkdir(path.join(outputDir, path.dirname(entry)), { recursive: true });
  } catch {
    throw new Error('Failed to create output directory');
  }

  try {
    await fs.writeFile(path.join(outputDir, entry), html, 'utf-8');
  } catch {
    throw new Error(`Failed to write compiled HTML file for "${entry}"`)
  }
}

async function getEntries(directory: string): Promise<string[]> {
  const excludedDirectories = [
    contentDir,
    componentsDir,
    outputDir
  ];
  
  let files: string[];

  try {
    files = await fs.readdir(directory);
  } catch(error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Could not find ${directory}`);
    } else {
      throw new Error(`Failed to read ${directory}`);
    }
  }

  let entries: string[] = [];

  for (const file of files) {
    const isDirectory = (await fs.stat(path.join(directory, file))).isDirectory();
    
    if (isDirectory && !excludedDirectories.includes(path.join(directory, file))) {
      entries = [
        ...entries, 
        ...(await getEntries(path.join(directory, file))).map(f => path.join(file, f))
      ];

      continue;
    } 
    
    if (path.extname(file) === '.html') {
      entries = [...entries, path.join(file)];
    }
  }

  return entries;
}

async function main(): Promise<void> {
  const args = arg({
    '--output': String,
    '--content': String,
    '--components': String,
    '--version': Boolean,
    '--help': Boolean,
    '-v': '--version',
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

  inputDir = args._[0] || '.';
  outputDir = args['--output'] || 'public';
  contentDir = args['--content'] || path.join(inputDir, '_content');
  componentsDir = args['--components'] || path.join(inputDir, '_components');
  
  const entries = await getEntries(inputDir);

  for (const entry of entries) {
    const start = performance.now();
    await compileEntry(entry);
    console.log(`\n\x1b[1;32m•\x1b[0m Compiled ${entry} \x1b[2m(${(performance.now() - start).toFixed(2)}ms)\x1b[22m`);
  }

  console.log();
} 

main().catch((error) => {
  console.log(`\n\x1b[1;31m•\x1b[0m Error: ${error.message}\n`);
});
