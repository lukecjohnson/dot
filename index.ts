import { promises as fs } from 'fs';
import * as path from 'path';

import * as arg from 'arg';

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

    componentHTML = await compileComponents(componentHTML, 'collapsed');
    componentHTML = await compileComponents(componentHTML, 'expanded');

    html = html.replace(tag, componentHTML);
  }

  return html;
}

async function compileView(view: string): Promise<void> {
  let html = await fs.readFile(path.join(dir.views, view), { encoding: 'utf-8' });

  html = await compileComponents(html, 'collapsed');
  html = await compileComponents(html, 'expanded');

  await fs.mkdir(dir.output, { recursive: true });
  await fs.writeFile(path.join(dir.output, view), html, 'utf-8');
}

async function main(): Promise<void> {
  const args = arg({
    '--root': String,
    '--output': String,
    '-r': '--root',
    '-o': '--output'
  });

  if (args['--root']) {
    dir.root = path.resolve(process.cwd(), args['--root']);
  }

  if (args['--output']) {
    dir.output = path.resolve(process.cwd(), args['--output']);
  }

  const views = (await fs.readdir(dir.views)).filter(f => path.extname(f) === '.html');
  for (const view of views) {
    await compileView(view);
  }
} 

main();
