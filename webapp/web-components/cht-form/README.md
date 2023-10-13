# cht-form Web Component

This [Angular Element](https://angular.io/guide/elements) encapsulates the functionality required for displaying and interacting with an Enketo form into a custom [Web Component](https://developer.mozilla.org/en-US/docs/Web/Web_Components). The `cht-form` web component can be used in any web page to display and interact with an Enketo form. The form layout and behavior will be functionally identical to form interactions within the CHT webapp.

## Building the web component

To build the web component, run the following commands from the root directory of cht-core:

```shell
npm ci
npm run build-cht-form
```

This will build the `cht-form` component and place the build artifacts in the `./build/cht-form` directory.

## Using the web component

The `cht-form` web component can be included on any page by pulling in the following files:

- `runtime.js`
- `polyfills.js`
- `main.js`
- `styles.css`

With those files included on the page, you can then use the `cht-form` web component in your HTML:

```html
<cht-form id="myform"></cht-form>
```

### Form inputs

The following inputs are supported by the `cht-form` web component:

- `formHtml` (Required) - String value containing the HTML content of the form to render.
- `formModel` (Required) - String value containing the model xml of the form to render.
- `formXml` (Required) - String value containing the ODK xform xml of the form to render.
- `user` - The user's settings document from the CouchDB `_users` database.
- `contactSummary` - The context data for the contact summary of the form's contact. Must not be set for `contact`
  forms.
- `content` - The content data to provide when rendering the form. The `contact` field can be the hydrated contact
  document for the form's contact.

These inputs can be set directly onto the `cht-form` HTML element:

```js
const myForm = document.getElementById('myform');
myForm.user = { contact_id: 'test_user' };
myForm.contactSummary = { pregnancy_uuid: 'myPregUUID' };
myForm.content = { contact: { name: "My Test Patient" } };

myForm.formHtml = formData.formHtml;
myForm.formModel = formData.formModel;
myForm.formXml = formData.formXml;
```

### Form outputs

Outputs from the web component are emitted as events. The following events are emitted:

- `onSubmit` - Emitted when the form is submitted (the submit button is pressed). The event detail contains an array of
  docs created by the form.
- `onCancel` - Emitted when the form is cancelled (the cancel button is pressed).

```js
myForm.addEventListener('onSubmit', async (e) => {
  console.log('form submitted', e.detail);
});
```

### Customizing the page layout

Currently, the position of the form on a page needs to be absolute (for all the magical "reactiveness" to work properly).   To adjust _where_ on the page the content is displayed, you can override the value for:

```css
.content .page {
    top: ???px
}
```

Also, for more complex layouts, you should use bootstrap containers to manage the position of the various elements on the page:

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

## Example Page

The included `index.html` provides an example of a simple web page using the `cht-form` web component to display a basic form. Once you have built the web component (as described above), you can deploy the example page using the following command:

```shell
npx -y http-server build/cht-form
```
