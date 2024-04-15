import { expect } from 'chai';
import sinon from 'sinon';
const $ = require('jquery');

const Timerwidget = require('../../../../../src/js/enketo/widgets/countdown-widget.js');
const TimerAnimation = require('../../../../../src/js/enketo/lib/timer-animation.js');

const testId = 'countdown-widget-test';
const buildHtml = (html: string) => document.body.insertAdjacentHTML('afterbegin', `<div id="${testId}">${html}</div>`);

describe('Countdown Timer Widget', () => {
  const DEFAULT_DURATION = 60;
  let animate;
  let settingsService;

  beforeEach(() => {
    animate = sinon.stub(TimerAnimation, 'animate');
    settingsService = {
      get: sinon.stub().resolves({})
    };
  });

  afterEach(() => {
    sinon.restore();
    $(`#${testId}`).remove();
  });

  describe('Trigger question', () => {
    const buildTrigger = (duration?: number) => buildHtml(`
      <fieldset class="question simple-select trigger or-appearance-countdown-timer contains-ref-target"
        ${duration ? `data-cht-duration="${duration}"` : ''} 
      > 
        <legend>
          <span lang="" class="question-label active">
            <strong>Press the timer and count number of breaths for a full 60 seconds two times.</strong>
          </span>
          <span class="required">*</span>
          <span lang="" class="or-hint active">
            CHV has to press the timer for a full 60 seconds each time (At least two times)
          </span>
        </legend>
        <div class="option-wrapper">
          <label>
            <input value="OK" type="radio" name="/assessment_endemic/group_breathing/first_countdown_timer"
              data-name="/assessment_endemic/group_breathing/first_countdown_timer" data-required="true()"
              data-type-xml="string" class="ref-target no-unselect"
              data-ref="/assessment_endemic/group_breathing/first_countdown_timer" maxlength="2000">
            <span class="option-label active" lang="">OK</span>
          </label>
        </div>
      </fieldset>`);

    it('initializes a timer with the default duration', () => {
      buildTrigger();
      const $element = $(Timerwidget.selector);

      const timerWidget = new Timerwidget($element[0], {}, settingsService);

      expect(timerWidget).to.be.an.instanceOf(Timerwidget);
      const $wrapper = $('.or-appearance-countdown-timer');
      const $canvas = $wrapper.find('canvas');
      expect($canvas).to.have.length(1);
      expect($canvas.attr('width')).to.equal('320');
      expect($canvas.attr('height')).to.equal('320');
      expect(animate.calledOnce).to.be.true;
      expect(animate.args[0][0]).to.equal($canvas[0]);
      expect(animate.args[0][1]).to.equal(DEFAULT_DURATION);

      // Radio button should be checked by timer callback
      expect($element.prop('checked')).to.be.false;
      animate.args[0][2]();
      expect($element.prop('checked')).to.be.true;
    });

    it('initializes a timer with custom duration set via deprecated default value', () => {
      buildTrigger();
      const $element = $(Timerwidget.selector);
      $element.val('30');

      new Timerwidget($element[0], {}, settingsService);

      expect(animate.calledOnce).to.be.true;
      expect(animate.args[0][1]).to.equal(30);
    });

    it('initializes a timer with custom duration set via cht:duration', () => {
      buildTrigger(30);
      const $element = $(Timerwidget.selector);

      new Timerwidget($element[0], {}, settingsService);

      expect(animate.calledOnce).to.be.true;
      expect(animate.args[0][1]).to.equal(30);
    });
  });

  describe('Deprecated note', () => {
    const buildNote = (duration?: number) => buildHtml(`
        <label class="question non-select or-appearance-countdown-timer contains-ref-target readonly" 
          data-contains-ref-target="/custom_attributes/test_attributes/my_note"
          ${duration ? `data-cht-duration="${duration}"` : ''}
        >
        <span lang="en" class="question-label active" data-itext-id="/custom_attributes/test_attributes/my_note:label">
          My Note
        </span>
        <input type="text" name="/custom_attributes/test_attributes/my_note" data-type-xml="string" readonly="" 
          class="ref-target" data-ref="/custom_attributes/test_attributes/my_note" maxlength="2000">
      </label>
    `);

    it('initializes a timer with the default duration', () => {
      buildNote();

      new Timerwidget($(Timerwidget.selector)[0], {}, settingsService);

      expect(animate.calledOnce).to.be.true;
      expect(animate.args[0][1]).to.equal(DEFAULT_DURATION);
    });

    it('initializes a timer with custom duration set via deprecated default value', () => {
      buildNote();
      const $element = $(Timerwidget.selector);
      $element.val('30');

      new Timerwidget($(Timerwidget.selector)[0], {}, settingsService);

      expect(animate.calledOnce).to.be.true;
      expect(animate.args[0][1]).to.equal(30);
    });

    it('initializes a timer with custom duration set via cht:duration', () => {
      buildNote(1);

      new Timerwidget($(Timerwidget.selector)[0], {}, settingsService);

      expect(animate.calledOnce).to.be.true;
      expect(animate.args[0][1]).to.equal(1);
    });
  });
});
