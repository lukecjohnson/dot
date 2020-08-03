`x-` is a toolkit for building static websites with reusable components and simple Markdown rendering. Designed to 
be a natural extension of HTML, it can be used to quickly prototype a site and get it off the ground, or it can be 
progressively integrated into an existing project with zero configuration. Using the command line tool, 
everything is compiled to well-formatted, standard HTML, ready to be published.

## Overview

### Components
Components are created with a standard HTML file in a directory named `_components`. Properties are defined with a basic 
template syntax:

```html
<!-- _components/greeting.html -->

<h1>Hello {{ name }}!</h1>
```

Components can then be used throughout a project with the `<x-component>` element, which should include a `src` 
attribute with the component's name ― the path to the `_components` directory and `.html` extension 
are implied. Property values are declared via additional attributes:

```html
<x-component src="greeting" name="world">
```

Components can also contain child content. The `<x-slot>` element is used to specify where content should be injected:

```html
<!-- _components/base-layout.html -->

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
<x-component src="base-layout" title="Home">
  <h1>Home</h1>
  <p>Page content...</p>
</x-component>
```

The `<x-slot>` element can contain optional fallback content that will be used if no child content for a component 
is provided:

```html
<x-slot>Default content...</slot>
```

### Content
Markdown content added to a directory named `_content` can easily be included in a page with the `<x-content>` element. 
Similar to the `src` attribute for the `<x-component>` element, the path to the `_content` directory and `.md` 
extension are implied:

```html
<x-content src="introduction" />
```

### CLI
To get started, simply use the base `x-` command with an optional argument to specify an input path other than the 
current working directory. See `x- --help` for additional options:

```
$ x- --help

Usage: x- [input] [options]

Options:

  --output            Path to output directory (default: ./public)

  --content           Path to content directory (default: [input]/_content)

  --components        Path to components directory (default: [input]/_components)

  -v, --version       Prints the current version

```

## Installation
To install `x-` locally (recommended):

```
$ npm install --save-dev x-
```

To install `x-` globally:

```
$ npm install --global x-
```

Alternatively, `x-` can be used without installing via `npx`:

```
$ npx x- [options]
```

## Roadmap

- [ ] Implement better HTML parser
  - The project is currently using regular expressions for parsing and manipulating HTML,
    which is often discouraged. Libraries like [`cheerio`](https://github.com/cheeriojs/cheerio) and 
    [`jsdom`](https://github.com/jsdom/jsdom) seem a bit overkill and are noticebly less performant, but I'd like to 
    look into lower level libraries like [`parse5`](https://github.com/inikulin/parse5) and 
    [`htmlparser2`](https://github.com/fb55/htmlparser2).

- [ ] Add named slots 

- [ ] Add file watching and automatic rebuilding with `--watch` CLI option

- [ ] Add Node API