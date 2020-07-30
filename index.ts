#!/usr/bin/env node

import * as path from 'path';
import { promises as fs } from 'fs';
import { performance } from 'perf_hooks';

import * as arg from 'arg';
import * as marked from 'marked';

import { version } from './package.json';

const usage = `
Usage: x- [options]

Options:

  -r, --root          Specify path where \`views\`, \`components\`, and \`content\` can be found

  -o, --output        Specify output path for compiled views

  -v, --version       Displays the current version
`;

const dir = {
  root: path.join(process.cwd()),
  output: path.join(process.cwd(), 'public'),
  get views() { return path.join(this.root, 'views') },
  get content() { return path.join(this.root, 'content') },
  get components() { return path.join(this.root, 'components') }
};

function normalize(html: string): string {
  return html.replace(/^\s+|\s+$/g, '');
}

function parseComponentProps(props: string): { key: string; value: string }[] {
  return [...props.matchAll(/([a-z][a-z0-9-]*)="([^"]*)"/gm)]
    .map((prop) => {
      return {
        key: prop[1],
        value: normalize(prop[2])
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
      componentHTML = await fs.readFile(
        path.join(dir.components, file),
        { encoding: 'utf-8' }
      );
    } catch(error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Could not find component "${src}" - please ensure "${file}" exists in the components directory`);
      } else {
        throw new Error(`Failed to read HTML file for component "${src}"`);
      }
    }

    for (const prop of parseComponentProps(props)) {
      componentHTML = componentHTML.replace(new RegExp(`{{\\s?${prop.key}\\s?}}`, 'g'), prop.value);
    }

    for (const slot of componentHTML.matchAll(/<x-slot(?:\s*\/>|>(.*?)<\/x-slot>)/gms)) {
      const [ slotElement, fallbackContent ] = slot;
      componentHTML = componentHTML.replace(slotElement, normalize(content || fallbackContent));
    }

    html = html.replace(element, normalize(componentHTML));
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
      markdown = await fs.readFile(
        path.join(dir.content, file),
        { encoding: 'utf-8' }
      );
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

async function compileView(view: string): Promise<void> {
  let html: string;

  try {
    html = await fs.readFile(
      path.join(dir.views, view), 
      { encoding: 'utf-8' }
    );
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Could not find view "${view}" - please ensure it exists in the views directory`);
    } else {
      throw new Error(`Failed to read HTML file for view "${view}"`);
    }
  }

  html = await compileContent(html);
  html = await compileComponents(html);

  try {
    await fs.mkdir(path.join(dir.output, path.parse(view).dir), { recursive: true });
  } catch {
    throw new Error('Failed to create output directory');
  }

  try {
    await fs.writeFile(path.join(dir.output, view), html, 'utf-8');
  } catch {
    throw new Error(`Failed to write compiled HTML file for view "${view}"`)
  }
}

async function getViews(subDirectory: string = ''): Promise<string[]> {
  let files: string[];

  try {
    files = await fs.readdir(path.join(dir.views, subDirectory));
  } catch(error) {
    if (error.code === 'ENOENT') {
      throw new Error('Could not find the views directory');
    } else {
      throw new Error('Failed to read the views directory');
    }
  }

  let views: string[] = [];

  for (const file of files) {
    if ((await fs.stat(path.join(dir.views, subDirectory, file))).isDirectory()) {
      views = [
        ...views, 
        ...(await getViews(path.join(subDirectory, file))).map(f => path.join(file, f))
      ];
    } else {
      views = [...views, file];
    }
  }

  return views;
}

async function main(): Promise<void> {
  const args = arg({
    '--root': String,
    '--output': String,
    '--version': Boolean,
    '--help': Boolean,
    '-r': '--root',
    '-o': '--output',
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

  if (args['--root']) {
    dir.root = path.resolve(process.cwd(), args['--root']);
  }

  if (args['--output']) {
    dir.output = path.resolve(process.cwd(), args['--output']);
  }

  const views = await getViews();

  for (const view of views) {
    const start = performance.now();
    await compileView(view);
    console.log(`\n\x1b[1;32m•\x1b[0m Compiled ${view} \x1b[2m(${(performance.now() - start).toFixed(2)}ms)\x1b[22m`);
  }

  console.log();
} 

main().catch((error) => {
  console.log(`\n\x1b[1;31m•\x1b[0m Error: ${error.message}\n`);
});
