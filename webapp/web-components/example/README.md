# Example usage of cht-form

To run the example, run the following command from the `./webapp` directory:

```bash
../node_modules/.bin/ng build cht-form
```

This will build the `cht-form` component and place it in the `./webapp/dist` directory.

Open the `./webapp/dist/index.html` file in a browser to see the example.


Currently, the position of the form on a page needs to be absolute (for all the magical "reactiveness" to work properly).   To adjust _where_ on the page the content is displayed, you can override the value for:

```css
.content .page {
    top: ???px
}
```

Also, for more complex layouts, you should use bootstrap containers to position the form:

```html
<div class="container-fluid">
  <div class="row">
    <h1 class="display-4">Hello, world!</h1>
  </div>
  <div class="row">
    <cht-form id="myform" form-id="my-first-form"></cht-form>
  </div>
</div>
```
