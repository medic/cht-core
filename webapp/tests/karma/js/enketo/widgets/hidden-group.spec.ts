import { expect } from 'chai';
import sinon from 'sinon';
const $ = require('jquery');

const HiddenGroup = require('../../../../../src/js/enketo/widgets/hidden-group');

const testId = 'hidden-group-test';
const buildHtml = (html: string) => document.body.insertAdjacentHTML(
  'afterbegin',
  `<div id="${testId}">${html}</div>`
);

describe('HiddenGroup Widget', () => {

  afterEach(() => {
    sinon.restore();
    $(`#${testId}`).remove();
  });

  describe('selector', () => {
    it('matches groups with both group and hidden appearances', () => {
      buildHtml(`
        <section class="or-group-data or-appearance-hidden">
          <div class="question or-appearance-hidden"></div>
        </section>
      `);
      const el = document.querySelector('.or-group-data.or-appearance-hidden');
      expect(el).to.not.be.null;
      expect(el!.matches(HiddenGroup.selector)).to.be.true;
    });

    it('does not match groups with only group appearance', () => {
      buildHtml(`<section class="or-group-data"></section>`);
      const el = document.querySelector(`#${testId} .or-group-data`);
      expect(el!.matches(HiddenGroup.selector)).to.be.false;
    });

    it('does not match groups with only hidden appearance', () => {
      buildHtml(`<section class="or-appearance-hidden"></section>`);
      const el = document.querySelector(`#${testId} .or-appearance-hidden`);
      expect(el!.matches(HiddenGroup.selector)).to.be.false;
    });
  });

  describe('_init', () => {
    it('adds disabled class to group with hidden appearance', () => {
      buildHtml(`
        <form class="or">
          <section class="or-group-data or-appearance-hidden">
            <div class="question or-appearance-hidden"></div>
          </section>
        </form>
      `);
      const el = document.querySelector(HiddenGroup.selector) as HTMLElement;
      new HiddenGroup(el, {});
      expect(el.classList.contains('disabled')).to.be.true;
    });

    it('preserves existing classes when adding disabled', () => {
      buildHtml(`
        <form class="or">
          <section class="or-group-data or-appearance-hidden">
            <div class="question or-appearance-hidden"></div>
          </section>
        </form>
      `);
      const el = document.querySelector(HiddenGroup.selector) as HTMLElement;
      new HiddenGroup(el, {});
      expect(el.classList.contains('or-group-data')).to.be.true;
      expect(el.classList.contains('or-appearance-hidden')).to.be.true;
      expect(el.classList.contains('disabled')).to.be.true;
    });
  });

});
