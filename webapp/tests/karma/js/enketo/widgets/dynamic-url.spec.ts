import jQuery from 'jquery';
import sinon from 'sinon';
import { expect } from 'chai';

describe('Enketo: Dynamic URL Widget', () => {
  const $ = jQuery;
  let windowOpen;
  let urlWidget;
  const buildHtml = (dynamic, anchorClass = 'dynamic-url') => {
    const html =
      `<label id="dynamic-url-test" class="question non-select readonly">\
        <span lang="en" class="question-label active" data-itext-id="/notedata/search_link:label">\
          <a href="#" target="_blank" rel="noopener noreferrer" class="${anchorClass}">\
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

  it('should set the href to the default value for the dynamically generated URL', () => {
    const dynamic = 'helloWorld';
    buildHtml(dynamic);

    new urlWidget($(urlWidget.selector)[0]);

    expect($(urlWidget.selector).attr('href')).to.equal(`http://google.com?q=${dynamic}`)
  });

  it('should set the href to the dynamically generated URL even when the dynamic value is empty', () => {
    buildHtml('');

    new urlWidget($(urlWidget.selector)[0]);

    expect($(urlWidget.selector).attr('href')).to.equal('http://google.com?q=')
  });

  it('should update the href for the dynamically generated URL when the dynamic value changes', () => {
    buildHtml('helloWorld');

    new urlWidget($(urlWidget.selector)[0]);
    const dynamic = 'worldHello';
    $('.url span').text(dynamic);

    expect($(urlWidget.selector).attr('href')).to.equal(`http://google.com?q=${dynamic}`)
  });

  it('should not modify elements besides dynamic-url links', () => {
    buildHtml('helloWorld', 'not-dynamic');

    expect($(urlWidget.selector).length).to.equal(0)
  });
});
