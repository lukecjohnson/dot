#!/usr/bin/env node

import * as path from 'path';
import { promises as fs } from 'fs';
import { performance } from 'perf_hooks';

import * as arg from 'arg';

import { version } from './package.json';

const usage = `
Usage: dot [options]

Options:

  -r, --root          Specify path where \`views\` and \`components\` can be found

  -o, --output        Specify output path for compiled views

  -v, --version       Displays the current version of Dot
`;

const dir = {
  root: path.join(process.cwd()),
  output: path.join(process.cwd(), 'public'),
  get views() { return path.join(this.root, 'views') },
  get components() { return path.join(this.root, 'components') },
};

const patterns = {
  whitespace: /^\s+|\s+$/g,
  component: /<component:([a-z][a-z-]*)((?:\s+[a-z][a-z0-9-]*="[^"]*")*)(?:\s*\/>|>(?!.*<component)(.*?)<\/component:\1>)/gms,
  slot: /<slot\s?\/>/,
};

function normalize(html: string): string {
  return html.replace(new RegExp(patterns.whitespace), '');
}

function hasComponents(html: string): boolean {
  return new RegExp(patterns.component).test(html);
}

function parseComponentProps(rawProps: string): { key: string; value: string }[] {
  const props = [...rawProps.matchAll(/([a-z][a-z0-9-]*)="([^"]*)"/gm)];

  return props.map((prop) => {
    return {
      key: prop[1],
      value: normalize(prop[2])
    }
  });
}

async function compileComponents(html: string): Promise<string> {
  const components = html.matchAll(new RegExp(patterns.component));

  for (const component of components) {
    const [ outer, name, rawProps, inner ] = component;

    const props = parseComponentProps(rawProps);

    let componentHTML: string;

    try {
      componentHTML = await fs.readFile(
        path.join(dir.components, `${name}.html`),
        { encoding: 'utf-8' }
      );
    } catch(error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Could not find component "${name}" - please ensure "${name}.html" exists in the components directory`);
      } else {
        throw new Error(`Failed to read HTML file for component "${name}"`);
      }
    }

    for (const prop of props) {
      componentHTML = componentHTML.replace(new RegExp(`{{\\s?${prop.key}\\s?}}`, 'g'), prop.value);
    }
    
    if (inner) {
      componentHTML = componentHTML.replace(new RegExp(patterns.slot), normalize(inner));
    }

    html = html.replace(outer, normalize(componentHTML));
  }

  if (hasComponents(html)) {
    html = await compileComponents(html); 
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

  if (hasComponents(html)) {
    html = await compileComponents(html);
  }

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
