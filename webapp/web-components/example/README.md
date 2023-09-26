# Example usage of cht-form

This simple web page provides an example of how to use the `cht-form` web component. Simply build the web component and then open the [`index.html` file](index.html) in a browser.

## Building the web component

To build the web component, run the following command from the `./webapp` directory:

```shell
npm run build:cht-form
```

This will build the `cht-form` component and place the build artifacts in the `./webapp/dist/webapp` directory (where they are referenced by the example `index.html`).

## Loading new forms

By default, this example page just displays the `enketo_widgets` form.  However, additional forms can be fetched to display by using the `fetchFormData.js` script.  This script will fetch the form data from the configured (running) CHT instance and save it in this directory. Simply set the `COUCH_URL` envar to your desired instance and run the script with the form id (the `_id` value of the form document in the CouchDB) as the argument.  For example:

```shell
COUCH_URL=http://medic:password@localhost:5984/medic node fetchFormData.js form:delivery
```

## cht-form Usage Details

### Form inputs

The following inputs are supported by the `cht-form` web component:

- `user` - The user's settings document from the CouchDB `_users` database.
- `contactSummary` - The context data for the contact summary of the form's contact. Must not be set for `contact` forms.
- `content` - The content data to provide when rendering the form. The `contact` field can be the hydrated contact document for the form's contact.
- `formHtml` (Required) - String value containing the HTML content of the form to render.
- `formModel` (Required) - String value containing the model xml of the form to render.
- `formXml` (Required) - String value containing the ODK xform xml of the form to render.

These inputs can be set directly onto the `cht-form` HTML element:

```js
const myForm = document.getElementById('myform');
myForm.user = { contact_id: 'test_user' };
myForm.contactSummary = { pregnancy_uuid : 'myPregUUID'};
myForm.content = { contact: { name: "My Test Patient" } };

myForm.formHtml = formData.formHtml;
myForm.formModel = formData.formModel;
myForm.formXml = formData.formXml;
```

### Form outputs

Outputs from the web component are emitted as events.  The following events are emitted:

- `onSubmit` - Emitted when the form is submitted (the submit button is pressed).  The event detail contains an array of docs created by the form.
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
