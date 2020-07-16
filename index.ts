import { promises as fs } from 'fs';
import * as path from 'path';

async function compileEntry(entry: string, root: string, output: string): Promise<void> {
  const html = await fs.readFile(path.join(root, entry), { encoding: 'utf-8' });

  await fs.mkdir(output, { recursive: true });

  await fs.writeFile(path.join(output, entry), html, 'utf-8');
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
