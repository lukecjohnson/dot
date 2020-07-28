# x —
`x-` is a preprocessor that adds reusable components with properties and slots to standard HTML.

## Components
Components are created with a standard HTML file in the `components` directory. Properties are defined with a basic 
template syntax:
```html
<!-- components/greeting.html -->

<h1>Hello {{ name }}!</h1>
```

Components can then be used throughout a project with the `<component>` element, which should include a `src` 
attribute with the component's name ― the path to the `components` directory and `.html` extension 
are implied. Property values are declared via additional attributes:
```html
<component src="greeting" name="world">
```

Components can also contain child content. The `<slot>` element is used to specify where content should be injected:
```html
<!-- components/page.html -->

<html>
  <head>
    <title>{{ title }}</title>
  </head>
  <body>
    <main>
      <slot />
    </main>
  </body>
</html>
```

At build time, the `<slot>` element is replaced with any content inside the `<component>` element:
```html
<component src="page" title="Home">
  <h1>Home</h1>
  <p>Page content...</p>
</component>
```

The `<slot>` element can contain optional fallback content that will be used if no child content for a component 
is provided:
```html
<slot>Default content...</slot>
```

## Project structure
`x-` relies on a `views` directory containing the pages that will be compiled and output to `public`, 
and a `components` directory containing the components that will be used with the `<component>` element.

By default, `x-` looks for these directories in the current working directory. However, a custom path can be specified 
with the `--root` CLI option.

## CLI
To get started, simply use the `x-` command to process and compile your project. See `x- --help` for 
additional options:
```
$ x- --help

Usage: x- [options]

Options:

  -r, --root          Specify path where `views` and `components` can be found

  -o, --output        Specify output path for compiled views

  -v, --version       Displays the current version

```

## Installation
To install `x-` locally (recommended):
```
$ npm i -D `x-`
```

To install `x-` globally:
```
$ npm i -g `x-`
```

Alternatively, `x-` can be used without installing via `npx`:
```
$ npx `x-` [options]
```