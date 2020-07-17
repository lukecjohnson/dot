import { promises as fs } from 'fs';
import * as path from 'path';

import * as arg from 'arg';

import { version } from './package.json';

const dir = {
  root: path.join(process.cwd(), 'src'),
  output: path.join(process.cwd(), 'public'),
  get views() { return path.join(this.root, 'views') },
  get components() { return path.join(this.root, 'components') },
};

async function compileComponents(html: string, type: 'collapsed' | 'expanded'): Promise<string> {
  const patterns = {
    collapsed: /<component src="([a-zA-Z0-9-_.\\\/]*)"\s?\/>/gm,
    expanded: /<component src="([a-zA-Z0-9-_.\\\/]*)">(.*?)<\/component>/gms
  };

  const components = html.matchAll(patterns[type]);
  
  for (const component of components) {
    const [tag, src, inner] = component;

    let componentHTML = await fs.readFile(
      path.resolve(
        dir.components, 
        path.extname(src) === '.html' ? src : `${src}.html`
      ), 
      { encoding: 'utf-8' }
    );
    
    if (inner) {
      componentHTML = componentHTML.replace(/<slot\s?\/>/, inner);
    }

    if (componentHTML.includes('<component')) {
      componentHTML = await compileComponents(componentHTML, 'collapsed');
      componentHTML = await compileComponents(componentHTML, 'expanded');
    }

    html = html.replace(tag, componentHTML);
  }

  return html;
}

async function compileView(view: string): Promise<void> {
  let html = await fs.readFile(path.join(dir.views, view), { encoding: 'utf-8' });

  if (html.includes('<component')) {
    html = await compileComponents(html, 'collapsed');
    html = await compileComponents(html, 'expanded');
  }

  await fs.mkdir(path.join(dir.output, path.parse(view).dir), { recursive: true });
  await fs.writeFile(path.join(dir.output, view), html, 'utf-8');
}

async function getViews(subDirectory: string = ''): Promise<string[]> {
  const files = await fs.readdir(path.join(dir.views, subDirectory));

  let views: string[] = [];

  for (const file of files) {
    if ((await fs.stat(path.join(dir.views, subDirectory, file))).isDirectory()) {
      const innerViews = (await getViews(path.join(subDirectory, file))).map(f => path.join(file, f));
      views = [...views, ...innerViews];
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
    '-r': '--root',
    '-o': '--output',
    '-v': '--version'
  });

  if (args['--version']) {
    console.log(version);
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
