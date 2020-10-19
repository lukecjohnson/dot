import * as path from 'path';
import { promises as fs } from 'fs';

import * as marked from 'marked';
import { html as formatHTML } from 'js-beautify';

function normalizeWhitespace(html: string): string {
  return html.replace(/^\s+|\s+$/g, '');
}

function stripComments(html: string): string {
  return html.replace(/<!--.*?-->/gms, '');
}

function parseComponentProps(props: string): { key: string; value: string }[] {
  return [...props.matchAll(/([a-z][a-z0-9-]*)="([^"]*)"/gm)]
    .map((prop) => {
      return {
        key: prop[1],
        value: normalizeWhitespace(prop[2])
      }
    });
}

async function renderComponents(html: string, filePath: string): Promise<string> {
  const componentPattern = /<x-component\s+src="([a-z-_.\/]*)"((?:\s+[a-z][a-z0-9-]*="[^"]*")*)\s*(?:\/>|>(?!.*<x-component)(.*?)<\/x-component>)/gms;

  for (const component of html.matchAll(componentPattern)) {
    const [element, src, props, content] = component;

    const componentPath = path.resolve(path.dirname(filePath), path.extname(src) ? src : `${src}.html`);

    let componentHTML: string;

    try {
      componentHTML = await fs.readFile(componentPath, { encoding: 'utf-8' });
    } catch(error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Could not resolve "${src}" - please ensure "${componentPath}" exists`);
      } else {
        throw new Error(`Failed to read "${componentPath}"`);
      }
    }

    componentHTML = stripComments(componentHTML);

    for (const prop of parseComponentProps(props)) {
      componentHTML = componentHTML.replace(new RegExp(`{{\\s?${prop.key}\\s?}}`, 'g'), prop.value);
    }

    for (const slot of componentHTML.matchAll(/<x-slot(?:\s*\/>|>(.*?)<\/x-slot>)/gms)) {
      const [slotElement, fallbackContent] = slot;
      componentHTML = componentHTML.replace(slotElement, content 
        ? normalizeWhitespace(content) 
        : normalizeWhitespace(fallbackContent)
      );
    }

    componentHTML = await renderContent(componentHTML, componentPath);
    componentHTML = await renderComponents(componentHTML, componentPath);

    html = html.replace(element, normalizeWhitespace(componentHTML));
  }

  if (componentPattern.test(html)) {
    html = await renderComponents(html, filePath);
  }

  return html;
}

async function renderContent(html: string, filePath: string): Promise<string> {
  for (const content of html.matchAll(/<x-content\s+src="([a-z-_.\/]+)"(?:\s*\/>|>\s*<\/x-content>)/gm)) {
    const [element, src] = content;

    const contentPath = path.resolve(path.dirname(filePath), path.extname(src) ? src : `${src}.md`);

    let markdown: string;

    try {
      markdown = await fs.readFile(contentPath, { encoding: 'utf-8' });
    } catch(error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Could not resolve "${src}" - please ensure "${contentPath}" exists`);
      } else {
        throw new Error(`Failed to read "${contentPath}"`);
      }
    }

    html = html.replace(element, marked(markdown, { headerIds: false }));
  }

  return html;
}

export async function render(filePath: string): Promise<string> {
  let html: string;

  try {
    html = await fs.readFile(filePath, { encoding: 'utf-8' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Could not find "${filePath}"`);
    } else {
      throw new Error(`Failed to read "${filePath}"`);
    }
  }

  html = stripComments(html);

  html = await renderContent(html, filePath);
  html = await renderComponents(html, filePath);

  html = formatHTML(html, {
    indent_size: 2, 
    preserve_newlines: false,
    wrap_line_length: 120
  });

  return html;
}