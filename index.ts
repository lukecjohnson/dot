import { promises as fs } from 'fs';
import * as path from 'path';

import * as arg from 'arg';

import { version } from './package.json';

const usage = `
Usage:

  project-name [options]

Options:

  -r, --root          Set root directory (Default: "./src")

  -o, --output        Set output directory (Default: "./public")

  -v, --version       Print the current version
`;

const dir = {
  root: path.join(process.cwd(), 'src'),
  output: path.join(process.cwd(), 'public'),
  get views() { return path.join(this.root, 'views') },
  get components() { return path.join(this.root, 'components') },
};

function normalize(html: string): string {
  return html.replace(/^\s+|\s+$/g, '');
}

function hasComponents(html: string): boolean {
  return (
    (/<component((?:\s+[a-zA-Z_:][a-zA-Z0-9_:.-]*="[^"]*")+)\s*\/>/gm).test(html) ||
    (/<component((?:\s+[a-zA-Z_:][a-zA-Z0-9_:.-]*="[^"]*")+)>(?!.*<component)(.*?)<\/component>/gms).test(html)
  );
}

type ComponentAttributes = {
  src: string | null;
  props: {
    key: string;
    value: string;
  }[];
}

function parseComponentAttributes(attributeString: string): ComponentAttributes {
  const attributes = [...attributeString.matchAll(/([a-z-]+)="(.*?)"/gms)];

  return {
    src: attributes.find(attr => attr[1] === 'src')?.[2] ?? null,
    props: attributes
      .filter(attr => attr[1] !== 'src')
      .map((attr) => {
        return {
          key: attr[1],
          value: normalize(attr[2])
        }
      })
  };
}

async function compileComponents(html: string): Promise<string> {
  const components = [
    ...html.matchAll(/<component((?:\s+[a-zA-Z_:][a-zA-Z0-9_:.-]*="[^"]*")+)\s*\/>/gm),
    ...html.matchAll(/<component((?:\s+[a-zA-Z_:][a-zA-Z0-9_:.-]*="[^"]*")+)>(?!.*<component)(.*?)<\/component>/gms)
  ];

  for (const component of components) {
    const [ outer, attributes, inner ] = component;

    const { src, props } = parseComponentAttributes(attributes);

    if (!src) {
      throw new Error('component is missing "src" attribute');
    }

    let componentHTML = await fs.readFile(
      path.resolve(
        dir.components, 
        path.extname(src) === '.html' ? src : `${src}.html`
      ), 
      { encoding: 'utf-8' }
    );

    for (const prop of props) {
      componentHTML = componentHTML.replace(new RegExp(`{{\\s?${prop.key}\\s?}}`, 'g'), prop.value);
    }
    
    if (inner) {
      componentHTML = componentHTML.replace(/<slot\s?\/>/, normalize(inner));
    }

    html = html.replace(outer, normalize(componentHTML));
  }

  if (hasComponents(html)) {
    html = await compileComponents(html); 
  }

  return html;
}

async function compileView(view: string): Promise<void> {
  let html = await fs.readFile(path.join(dir.views, view), { encoding: 'utf-8' });

  if (hasComponents(html)) {
    html = await compileComponents(html);
  }

  await fs.mkdir(path.join(dir.output, path.parse(view).dir), { recursive: true });
  await fs.writeFile(path.join(dir.output, view), html, 'utf-8');
}

async function getViews(subDirectory: string = ''): Promise<string[]> {
  const files = await fs.readdir(path.join(dir.views, subDirectory));

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
    await compileView(view);
  }
} 

main();
