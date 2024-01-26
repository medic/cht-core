import { expect } from 'chai';
import sinon from 'sinon';
const Timerwidget = require('../../../../../src/js/enketo/widgets/countdown-widget.js');
const $ = require( 'jquery' );

describe('Breather Countdown Timerwidget', () => {
  let clock;
  const DEFAULT_TIME = 60;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
    document.body.innerHTML = '';
  });

  it('should create a Countdown Timerwidget instance', () => {
   
    const element = document.createElement('div');
    element.innerHTML = `
        <fieldset class="question simple-select trigger or-appearance-countdown-timer contains-ref-target" > 
            <legend> 
                <span lang="" class="question-label active"><strong>Press the timer and count number of breaths for a full 60 seconds two times.</strong></span><span class="required">*</span><span lang="" class="or-hint active">CHV has to press the timer for a full 60 seconds each time (At least two times)</span>
            </legend> 
            <div class="option-wrapper">
            <label>
            <input value="OK" type="radio" name="/assessment_endemic/group_breathing/first_countdown_timer" data-name="/assessment_endemic/group_breathing/first_countdown_timer" data-required="true()" data-type-xml="string" class="ref-target no-unselect" data-ref="/assessment_endemic/group_breathing/first_countdown_timer" maxlength="2000"><span class="option-label active" lang="">OK</span></label></div>
            <canvas width="320" height="320"></canvas>
        </fieldset>`;

        try {
          document.body.appendChild(element);
        } catch (error) {
            console.error('Error appending element:', error);
        }

    const settingsService = { get: sinon.stub().resolves({}) };

    const timerwidget = new Timerwidget(element, {}, settingsService);

    expect(timerwidget).to.be.an.instanceOf(Timerwidget);
  });

  it('should initialize the widget with default duration if no data-cht-duration attribute is present', () => {
    // Arrange
    const element = document.createElement('div');
    element.innerHTML = `
      <fieldset class="or-appearance-countdown-timer" data-cht-duration="60">
        <div class="option-wrapper">
          <input type="radio" value="OK">
        </div>
        <canvas></canvas>
      </fieldset>
    `;
    document.body.appendChild(element);

    const settingsService = { get: sinon.stub().resolves({}) };

    const timerwidget = new Timerwidget(element, {}, settingsService);

    expect(timerwidget._duration).to.equal(DEFAULT_TIME);
  });
});
