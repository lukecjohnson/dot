import * as path from 'path';
import { promises as fs } from 'fs';
import { parse as parseHTML, HTMLElement } from 'node-html-parser';
import * as parseMarkdown from 'marked';
import { html as formatHTML } from 'js-beautify';

function replace(node: HTMLElement, html: string): void {
  node.insertAdjacentHTML('afterend', html);
  node.remove();
}

async function renderComponents(
  root: HTMLElement,
  filePath: string,
  componentsAlias: string,
  contentAlias: string
): Promise<HTMLElement> {
  for (const node of root.querySelectorAll('x-component')) {
    const src = node.getAttribute('src');

    if (!src) continue;

    let componentPath = src.startsWith('@components/')
      ? src.replace('@components', componentsAlias)
      : path.resolve(path.dirname(filePath), src);

    if (!path.extname(componentPath)) {
      componentPath = `${componentPath}.html`;
    }

    let html = await fs.readFile(componentPath, { encoding: 'utf-8' });

    for (const [key, value] of Object.entries(node.attributes)) {
      if (key !== 'src') {
        html = html.replace(new RegExp(`{{\\s?${key}\\s?}}`, 'g'), value);
      }
    }

    let component = parseHTML(html);

    const slot = component.querySelector('x-slot');

    if (slot) {
      replace(slot, node.removeWhitespace().innerHTML ? node.innerHTML : slot.innerHTML);
    }

    component = await renderComponents(component, componentPath, componentsAlias, contentAlias);
    component = await renderContent(component, componentPath, contentAlias);

    replace(node, component.outerHTML);
  }

  return root;
}

async function renderContent(
  root: HTMLElement,
  filePath: string,
  contentAlias: string
): Promise<HTMLElement> {
  for (const node of root.querySelectorAll('x-content')) {
    const src = node.getAttribute('src');

    if (!src) continue;

    let markdownPath = src.startsWith('@content/')
    ? src.replace('@content', contentAlias)
    : path.resolve(path.dirname(filePath), src);

    if (!path.extname(markdownPath)) {
      markdownPath = `${markdownPath}.md`;
    }

    const markdown = await fs.readFile(markdownPath, { encoding: 'utf-8' });

    replace(node, parseMarkdown(markdown));
  }

  return root;
}

export interface RenderOptions {
  componentsAlias?: string;
  contentAlias?: string;
}

export async function render(filePath: string, options: RenderOptions = {}): Promise<string> {
  options.contentAlias = options.contentAlias || path.join(process.cwd(), 'src', 'content');
  options.componentsAlias = options.componentsAlias || path.join(process.cwd(), 'src', 'components');

  const html = await fs.readFile(filePath, { encoding: 'utf-8' });

  let root = parseHTML(html);

  root = await renderContent(root, filePath, options.contentAlias)
  root = await renderComponents(root, filePath, options.componentsAlias, options.contentAlias);

  return formatHTML(root.outerHTML, {
    indent_size: 2,
    preserve_newlines: false,
    wrap_line_length: 120
  });
}
