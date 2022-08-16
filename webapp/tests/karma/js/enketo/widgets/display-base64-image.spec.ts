import jQuery from 'jquery';
import { expect } from 'chai';

import * as Displaybase64image from '../../../../../src/js/enketo/widgets/display-base64-image';

describe('Display Base64 Image Widget', () => {
  const $ = jQuery;
  let $html;

  beforeEach(() => {
    $html = $(`
      <section id="test-form-group" class="or-group-data" name="/inputs">
        <label class="or-appearance-display-base64-image question non-select">
          <span lang="en" class="question-label active" data-itext-id="/inputs/image:label">Image</span>
          <input type="text" name="/inputs/image" readonly="readonly">
        </label>
      </section>
    `);

    document.body.insertAdjacentHTML('afterbegin', $html[0]);
    new Displaybase64image($html.find(Displaybase64image.selector)[0], {});
  });

  afterEach(() => $('#test-form-group').remove());

  it('should insert image element with no base64', () => {
    const $images = $html.find('img');

    expect($images.length).to.equal(1);
    expect($images.attr('src')).to.equal('');
  });

  it('should insert image element with base64', () => {
    $html.find('input').val('SSdtIGJhdG1hbg==').trigger('change');
    const $images = $html.find('img');

    expect($images.length).to.equal(1);
    expect($images.attr('src')).to.equal('data:image/png;base64,SSdtIGJhdG1hbg==');
  });

  it('should listen to changes have 1 image element with updated base64 value', () => {
    const $input = $html.find('input');
    $input.val('SSdtIGJhdG1hbg==').trigger('change');
    let $images = $html.find('img');

    expect($images.length).to.equal(1);
    expect($images.attr('src')).to.equal('data:image/png;base64,SSdtIGJhdG1hbg==');

    $input.val('TmFuYW5hbmFuYSBiYXRtYW4h').trigger('change');
    $images = $html.find('img');

    expect($images.length).to.equal(1);
    expect($images.attr('src')).to.equal('data:image/png;base64,TmFuYW5hbmFuYSBiYXRtYW4h');
  });

  it('should not keep previous image if input doesnt have a value', () => {
    const $input = $html.find('input');
    $input.val('SSdtIGJhdG1hbg==').trigger('change');
    let $images = $html.find('img');

    expect($images.length).to.equal(1);
    expect($images.attr('src')).to.equal('data:image/png;base64,SSdtIGJhdG1hbg==');

    $input.val('').trigger('change');
    $images = $html.find('img');

    expect($images.length).to.equal(1);
    expect($images.attr('src')).to.equal('');
  });
});
