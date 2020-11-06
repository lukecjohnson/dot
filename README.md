`x-` is a toolkit for building static websites with reusable components and simple Markdown rendering. Designed to
be a natural extension of HTML, it can be used to quickly prototype and build a site from the ground up, or can be
progressively integrated into an existing project with zero configuration. Using either the CLI or JavaScript API,
everything is rendered to well-formatted, standard HTML, ready to be published.

## Overview

### Components

Components are created with a standard HTML file where properties can be defined with a basic template syntax:

```html
<!-- src/components/greeting.html -->

<h1>Hello {{ name }}!</h1>
```

Components can then be used throughout a project with the `<x-component>` element, which should include a `src`
attribute with the relative path to a component file ― the `.html` extension is implied. Property values are assigned
with additional attributes on the `<x-component>` element:

```html
<!-- src/pages/index.html -->

<x-component src="../components/greeting" name="world">
```

Components can also contain child content. The `<x-slot>` element is used to specify where content should be injected:

```html
<html>
  <head>
    <title>{{ title }}</title>
  </head>
  <body>
    <main>
      <x-slot />
    </main>
  </body>
</html>
```

At build time, the `<x-slot>` element is replaced with any content inside the `<x-component>` element:

```html
<x-component src="../components/base-layout" title="Home">
  <h1>Home</h1>
  <p>Page content...</p>
</x-component>
```

The `<x-slot>` element can contain optional fallback content that will be used if no child content for a component
is provided:

```html
<x-slot>Default content...</slot>
```

### Markdown

Markdown rendering is available with the `<x-content>` element. Similar to `<x-component>` element, the `src` attribute
is used to specify the relative path to a Markdown file:

```html
<x-content src="../content/introduction" />
```

## CLI

The CLI takes an input path to a file or directory and outputs compiled HTML files to `./public` or the path specified
with the `--output` option. If the provided input path is a directory, `x-` will recursively find and compile each HTML
file in the given directory and its subdirectories. Any file or directory starting with an underscore
(e.g.,&nbsp;`_components`) will be ignored.

```
$ x- --help

Usage: x- <input> [options]

Options:

  -o, --output        Output path (Default: ./public)

  -v, --version       Print the current version and exit

```

Example:

```
$ x- src/pages --output static
```

## API
`render()` reads the provided file and returns rendered HTML as a string:

```ts
render(filePath: string) => Promise<string>
```

Example:

```js
const { render } = require('x-');

async function example() {
  const html = await render('index.html');
  console.log(html);
};
```

## Installation
```
$ npm install --save-dev x-
```

## Roadmap
- [ ] Implement better HTML parser
  - The project is currently using regular expressions for parsing and manipulating HTML,
    which is often discouraged. Libraries like [`cheerio`](https://github.com/cheeriojs/cheerio) and
    [`jsdom`](https://github.com/jsdom/jsdom) seem a bit overkill and are noticeably less performant, but I'd like to
    look into lower level libraries like [`parse5`](https://github.com/inikulin/parse5) and
    [`htmlparser2`](https://github.com/fb55/htmlparser2).

- [ ] Add named slots

- [ ] Add file watching and automatic rebuilding with `--watch` CLI option

- [x] Add Node API