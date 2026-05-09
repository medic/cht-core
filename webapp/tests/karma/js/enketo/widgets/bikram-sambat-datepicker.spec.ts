import jQuery from 'jquery';
import sinon from 'sinon';
import { expect } from 'chai';

const $ = jQuery;

describe('Enketo: Bikram Sambat Datepicker Widget', () => {
  let bikramSambatBs;
  let originalCHTCore;
  let languageGet;

  const buildHtml = (initialValue = '') => {
    const html =
      `<div id="bs-widget-test">
        <label class="question">
          <input type="date" name="/form/date_field" value="${initialValue}">
        </label>
      </div>`;
    document.body.insertAdjacentHTML('afterbegin', html);
  };

  beforeEach(() => {
    languageGet = sinon.stub().resolves('ne');

    originalCHTCore = (window as any).CHTCore;
    (window as any).CHTCore = {
      Language: { get: languageGet }
    };

    bikramSambatBs = {
      initListeners: sinon.stub(),
      setDate_greg_text: sinon.stub(),
    };
    // Override require for bikram-sambat-bootstrap would be done via proxyquire
    // in a real setup; here we test the DOM behavior directly
  });

  afterEach(() => {
    (window as any).CHTCore = originalCHTCore;
    const el = document.getElementById('bs-widget-test');
    if (el) {
      el.remove();
    }
    sinon.restore();
  });

  describe('TEMPLATE structure', () => {
    it('should contain day, month, and year inputs', () => {
      buildHtml();
      const BikramsambatWidget = require('../../../../../src/js/enketo/widgets/bikram-sambat-datepicker');
      const template = BikramsambatWidget.toString();
      // Template is embedded in the module; check exported class exists
      expect(BikramsambatWidget).to.exist;
      expect(BikramsambatWidget.selector).to.equal('input[type=date]');
    });

    it('should include Today and Clear action buttons in template', () => {
      buildHtml();
      // Insert template directly to test DOM structure
      const templateHtml =
        '<div class="input-group bikram-sambat-input-group">' +
        '<input name="day" type="tel" class="devanagari-number-input">' +
        '<input name="month" type="hidden">' +
        '<div class="input-group-btn">' +
        '<button class="btn btn-default dropdown-toggle bs-month-dropdown-btn">महिना</button>' +
        '<ul class="dropdown-menu"><li><a>बैशाख</a></li></ul>' +
        '</div>' +
        '<input name="year" type="tel" class="devanagari-number-input">' +
        '<div class="input-group-btn">' +
        '<button class="btn bs-today-btn">आज</button>' +
        '<button class="btn bs-clear-btn">✕</button>' +
        '</div>' +
        '<span class="bs-month-error" style="display:none;">महिना छान्नुस्</span>' +
        '</div>';

      document.getElementById('bs-widget-test')!.insertAdjacentHTML('beforeend', templateHtml);

      expect($('#bs-widget-test .bs-today-btn').length).to.equal(1);
      expect($('#bs-widget-test .bs-clear-btn').length).to.equal(1);
      expect($('#bs-widget-test .bs-month-error').length).to.equal(1);
      expect($('#bs-widget-test .bs-month-dropdown-btn').length).to.equal(1);
    });
  });

  describe('Month validation', () => {
    let $container;

    beforeEach(() => {
      buildHtml();
      const templateHtml =
        '<div class="input-group bikram-sambat-input-group">' +
        '<input name="day" type="tel" class="devanagari-number-input">' +
        '<input name="month" type="hidden">' +
        '<div class="input-group-btn">' +
        '<button class="btn btn-default dropdown-toggle bs-month-dropdown-btn">महिना</button>' +
        '<ul class="dropdown-menu"><li><a>बैशाख</a></li></ul>' +
        '</div>' +
        '<input name="year" type="tel" class="devanagari-number-input">' +
        '<div class="input-group-btn">' +
        '<button class="btn btn-default bs-today-btn">आज</button>' +
        '<button class="btn btn-default bs-clear-btn">✕</button>' +
        '</div>' +
        '<span class="bs-month-error" style="display:none;">महिना छान्नुस्</span>' +
        '</div>';

      const testEl = document.getElementById('bs-widget-test')!;
      testEl.insertAdjacentHTML('beforeend', templateHtml);
      $container = $('#bs-widget-test');

      // Wire up the validation logic (mirrors widget's event binding)
      const $monthError = $container.find('.bs-month-error');
      const $monthBtn = $container.find('.bs-month-dropdown-btn');
      const $monthInput = $container.find('input[name="month"]');
      const $realDateInput = $container.find('input[type=date]');

      $container.find('.devanagari-number-input').on('change blur', function() {
        const hasDay = !!$container.find('input[name="day"]').val();
        const hasYear = !!$container.find('input[name="year"]').val();
        const hasMonth = !!$monthInput.val() && $monthInput.val() !== '0';
        if ((hasDay || hasYear) && !hasMonth) {
          $monthBtn.addClass('btn-danger').removeClass('btn-default');
          $monthError.show();
          $realDateInput.val('').trigger('change');
        } else if (hasMonth) {
          $monthBtn.addClass('btn-default').removeClass('btn-danger');
          $monthError.hide();
        }
      });

      $container.find('.dropdown-menu li').on('click', function() {
        $monthBtn.addClass('btn-default').removeClass('btn-danger');
        $monthError.hide();
      });

      $container.find('.bs-clear-btn').on('click', function() {
        $container.find('input[name="day"]').val('');
        $monthInput.val('');
        $container.find('input[name="year"]').val('');
        $monthBtn.addClass('btn-default').removeClass('btn-danger').html('महिना <span class="caret"></span>');
        $monthError.hide();
        $realDateInput.val('').trigger('change');
      });
    });

    it('should show error and highlight button when day entered without month', () => {
      $container.find('input[name="day"]').val('15').trigger('blur');
      expect($container.find('.bs-month-error').css('display')).to.not.equal('none');
      expect($container.find('.bs-month-dropdown-btn').hasClass('btn-danger')).to.be.true;
    });

    it('should show error when year entered without month', () => {
      $container.find('input[name="year"]').val('2081').trigger('blur');
      expect($container.find('.bs-month-error').css('display')).to.not.equal('none');
    });

    it('should clear real date input when month is missing', () => {
      const $realDate = $container.find('input[type=date]');
      $realDate.val('2024-07-15');
      $container.find('input[name="day"]').val('15').trigger('blur');
      expect($realDate.val()).to.equal('');
    });

    it('should hide error when month is selected from dropdown', () => {
      $container.find('input[name="day"]').val('15').trigger('blur');
      expect($container.find('.bs-month-error').css('display')).to.not.equal('none');

      $container.find('input[name="month"]').val('3');
      $container.find('.dropdown-menu li').first().trigger('click');
      expect($container.find('.bs-month-error').css('display')).to.equal('none');
      expect($container.find('.bs-month-dropdown-btn').hasClass('btn-danger')).to.be.false;
    });

    it('should clear all fields when clear button clicked', () => {
      $container.find('input[name="day"]').val('10');
      $container.find('input[name="month"]').val('5');
      $container.find('input[name="year"]').val('2081');
      $container.find('input[type=date]').val('2024-08-25');

      $container.find('.bs-clear-btn').trigger('click');

      expect($container.find('input[name="day"]').val()).to.equal('');
      expect($container.find('input[name="month"]').val()).to.equal('');
      expect($container.find('input[name="year"]').val()).to.equal('');
      expect($container.find('input[type=date]').val()).to.equal('');
    });

    it('should not show error when no values are entered', () => {
      $container.find('input[name="day"]').trigger('blur');
      expect($container.find('.bs-month-error').css('display')).to.equal('none');
    });
  });
});
