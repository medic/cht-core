import jQuery from 'jquery';
import sinon from 'sinon';
import { expect } from 'chai';

describe('Enketo: Dynamic URL Widget', () => {
  const $ = jQuery;
  let windowOpen;
  let urlWidget;
  const buildHtml = (dynamic) => {
    const html =
      `<label id="dynamic-url-test" class="question non-select readonly">\
        <span lang="en" class="question-label active" data-itext-id="/notedata/search_link:label">\
          <a href="#" target="_blank" rel="noopener noreferrer" class="dynamic-url">\
            Search for <span class="or-output" data-value=" /notedata/name ">${dynamic}</span>\
            <span class="url hidden">http://google.com?q=<span class="or-output" data-value=" /notedata/text ">${dynamic}</span></span>\
          </a>\
        </span>\
      </label>`;
    document.body.insertAdjacentHTML('afterbegin', html);
  };
  
  beforeEach(() => {
    urlWidget = require('../../../../../src/js/enketo/widgets/dynamic-url');
    windowOpen = sinon.stub(window, 'open');
  });

  afterEach(() => {
    sinon.restore();
    $('#dynamic-url-test').remove();
  });

  it('should navigate to the dynamically generated URL when clicked', () => {
    const dynamic = 'helloWorld';
    buildHtml(dynamic);

    new urlWidget($(urlWidget.selector)[0]);
    $(urlWidget.selector).trigger('click');

    expect(windowOpen.callCount).to.equal(1);
    expect(windowOpen.args[0][0]).to.equal(`http://google.com?q=${dynamic}`);
  });

  it('should navigate to the dynamically generated URL when clicked even when the dynamic value is empty', () => {
    buildHtml('');

    new urlWidget($(urlWidget.selector)[0]);
    $(urlWidget.selector).trigger('click');

    expect(windowOpen.callCount).to.equal(1);
    expect(windowOpen.args[0][0]).to.equal(`http://google.com?q=`);
  });
});
