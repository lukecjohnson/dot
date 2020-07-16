import { promises as fs } from 'fs';
import * as path from 'path';

const dir = {
  views: path.join(process.cwd(), 'src', 'views'),
  components: path.join(process.cwd(), 'src', 'components'),
  output: path.join(process.cwd(), 'public')
};

async function compileComponents(html: string): Promise<string> {
  const components = [
    ...html.matchAll(/<component src="([a-zA-Z0-9-_.\\\/]*)"\s?\/>/gm),
    ...html.matchAll(/<component src="([a-zA-Z0-9-_.\\\/]*)">(.*?)<\/component>/gms)
  ];
  
  for (const component of components) {
    const [tag, src, inner] = component;

    let componentHTML = await fs.readFile(path.resolve(dir.components, src), { encoding: 'utf-8' });
    if (inner) {
      componentHTML = componentHTML.replace(/<slot\s?\/>/, inner);
    }

    const compiled = await compileComponents(componentHTML);
    html = html.replace(tag, compiled);
  }

  return html;
}

async function compileView(view: string): Promise<void> {
  const html = await fs.readFile(path.join(dir.views, view), { encoding: 'utf-8' });

  const compiled = await compileComponents(html);

  await fs.mkdir(dir.output, { recursive: true });
  await fs.writeFile(path.join(dir.output, view), compiled, 'utf-8');
}

async function main(): Promise<void> {
  const views = (await fs.readdir(dir.views)).filter(f => path.extname(f) === '.html');
  for (const view of views) {
    await compileView(view);
  }
} 

main();
