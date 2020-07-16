import { promises as fs } from 'fs';
import * as path from 'path';

async function compileComponents(html: string, root: string): Promise<string> {
  const components = [
    ...html.matchAll(/<component src="([a-zA-Z0-9-_.\\\/]*)"\s?\/>/gm),
    ...html.matchAll(/<component src="([a-zA-Z0-9-_.\\\/]*)">(.*?)<\/component>/gms)
  ];
  
  for (const component of components) {
    const [tag, src, inner] = component;

    let componentHTML = await fs.readFile(path.resolve(root, src), { encoding: 'utf-8' });
    if (inner) {
      componentHTML = componentHTML.replace(/<slot\s?\/>/, inner);
    }

    const compiled = await compileComponents(componentHTML, path.resolve(root, path.parse(src).dir));
    html = html.replace(tag, compiled);
  }

  return html;
}

async function compileEntry(entry: string, root: string, output: string): Promise<void> {
  const html = await fs.readFile(path.join(root, entry), { encoding: 'utf-8' });

  const compiled = await compileComponents(html, root);

  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, entry), compiled, 'utf-8');
}

async function main(): Promise<void> {
  const args = process.argv0 === 'node' 
    ? process.argv.slice(2)
    : process.argv.slice(1);

  const root = path.join(process.cwd(), args[0]);
  const output = path.join(process.cwd(), args[1]);

  const entries = (await fs.readdir(root)).filter(f => path.extname(f) === '.html');
  for (const entry of entries) {
    await compileEntry(entry, root, output);
  }
} 

main();
