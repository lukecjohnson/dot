# ●
Dot is a preprocessor that adds reusable components with properties and slots to standard HTML.

## Components
Components are created with a standard HTML file in the `components` directory. Properties are defined with a basic 
template syntax:
```html
<!-- components/greeting.html -->

<h1>Hello {{ name }}!</h1>
```

Then, the component can be used throughout the project with the built-in `<component:component-name>` element. Property 
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