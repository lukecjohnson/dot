import * as path from 'path';
import { promises as fs } from 'fs';

import { parse as parseHTML, HTMLElement } from 'node-html-parser';
import * as parseMarkdown from 'marked';
import { html as formatHTML } from 'js-beautify';

function replace(node: HTMLElement, html: string): void {
  node.insertAdjacentHTML('afterend', html);
  node.remove();
}

async function renderComponents(root: HTMLElement, filePath: string): Promise<HTMLElement> {
  for (const node of root.querySelectorAll('x-component')) {
    const src = node.getAttribute('src');

    if (!src) continue;

    const componentPath = path.resolve(path.dirname(filePath), path.extname(src) ? src : `${src}.html`);

    let html = await fs.readFile(componentPath, { encoding: 'utf-8' });

    for (const [key, value] of Object.entries(node.attributes)) {
      if (key !== 'src') {
        html = html.replace(new RegExp(`{{\\s?${key}\\s?}}`, 'g'), value);
      }
    }

    let component = parseHTML(html);

    const slot = component.querySelector('x-slot');

    if (slot) {
      replace(slot, node.innerHTML);
    }

    component = await renderComponents(component, componentPath);
    component = await renderContent(component, componentPath);

    replace(node, component.outerHTML);
  }

  return root;
}

async function renderContent(root: HTMLElement, filePath: string): Promise<HTMLElement> {
  for (const node of root.querySelectorAll('x-content')) {
    const src = node.getAttribute('src');

    if (!src) continue;

    const markdownPath = path.resolve(path.dirname(filePath), path.extname(src) ? src : `${src}.md`);

    const markdown = await fs.readFile(markdownPath, { encoding: 'utf-8' });

    replace(node, parseMarkdown(markdown));
  }

  return root;
}

export async function render(filePath: string): Promise<string> {
  const html = await fs.readFile(filePath, { encoding: 'utf-8' });

  let root = parseHTML(html);

  root = await renderContent(root, filePath);
  root = await renderComponents(root, filePath);

  return formatHTML(root.outerHTML, {
    indent_size: 2,
    preserve_newlines: false,
    wrap_line_length: 120
  });
}
