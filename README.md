# ●
Dot is a preprocessor that adds reusable components with properties and slots to standard HTML.

## Components
Components are created with a standard HTML file in the `components` directory. Properties are defined with a basic 
template syntax:
```html
<!-- components/greeting.html -->

<h1>Hello {{ name }}!</h1>
```

Components can then be used throughout a project with the built-in `<component:component-name>` element. Property 
values are declared via attributes:
```html
<component:greeting name="world" />
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

At build time, the `<slot>` element is replaced with any content inside the `<component:component-name>` element:
```html
<component:page title="Home">
  <h1>Home</h1>
  <p>Page content...</p>
</component:page>
```

## Project structure
Dot relies on a `views` directory containing the pages that will be compiled and output to `public`, 
and a `components` directory containing the components that will be used with the `<component:component-name>` element.

By default, Dot looks for these directories in the current working directory. However, a custom path can be specified 
with the `--root` CLI option.

## CLI
To get started using Dot, simply use the `dot` command to process and compile your project. See `dot --help` for 
additional options:
```
$ dot --help

Usage: dot [options]

Options:

  -r, --root          Specify path where `views` and `components` can be found

  -o, --output        Specify output path for compiled views

  -v, --version       Displays the current version of Dot

```