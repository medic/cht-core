describe('phone-widget', function() {
  'use strict';
  /* jshint multistr: true */

  var phoneWidget;
  var settings;
  var inputName = '/some/input/name';

  beforeEach(function() {
    module('inboxApp');

    settings = sinon.stub();

    // Fetch phone widget.
    var widgets = require('widgets');
    for (var i = 0; i < widgets.length; i++) {
      if (widgets[i].name && widgets[i].name === 'phonewidget') {
        phoneWidget = widgets[i];
        break;
      }
    }
  });

  function buildHtml(type) {
    if (!type) {
      type = 'tel';
    }
    var html = '<div id="phone-widget-test"><label class="question non-select"> \
       <span lang="" class="question-label active">person.field.phone</span> \
       <span class="required">*</span> \
       <input type="' + type + '" name="' + inputName + '" data-type-xml="' + type + '" > \
       <span class="or-constraint-msg active" lang="" data-i18n="constraint.invalid">Value not allowed</span> \
       <span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span> \
    </label></div>';
    document.body.insertAdjacentHTML(
      'afterbegin',
      html);
  }

  afterEach(function() {
    $('#phone-widget-test').remove();
  });

  function inputSelector(name) {
    return $('input[name=\"' + name + '\"]');
  }

  function proxySelector(name) {
    return inputSelector(name).prev();
  }

  it('is placed in dom', function() {
    settings.returns(Promise.resolve({}));
    buildHtml();
    new phoneWidget.widget($(phoneWidget.selector)[0], {}, settings);

    // Check a proxy input field is added, and the real one is hidden.
    chai.expect($('input').length).to.equal(2);

    var input = inputSelector(inputName);
    chai.expect(input.is(':visible')).to.equal(false);

    var proxyInput = proxySelector(inputName);
    chai.expect(proxyInput.length).to.equal(1);
    chai.expect(proxyInput.is(':visible')).to.equal(true);
  });

  it('formats input', function() {
    settings.returns(Promise.resolve({}));
    buildHtml();
    new phoneWidget.widget($(phoneWidget.selector)[0], {}, settings);
    var input = inputSelector(inputName);
    var proxyInput = proxySelector(inputName);

    proxyInput.val('+1 (650) 222-3333');
    proxyInput.change();
    chai.expect(input.val()).to.equal('+16502223333');
  });

  it('still formats if no settings are found', function() {
    settings.returns(Promise.resolve({}));
    buildHtml();
    new phoneWidget.widget($(phoneWidget.selector)[0], {}, settings);

    var input = inputSelector(inputName);
    var proxyInput = proxySelector(inputName);

    proxyInput.val('+1 (650) 222-3333');
    proxyInput.change();
    chai.expect(input.val()).to.equal('+16502223333');
  });

  it('doesn\'t format invalid input', function() {
    settings.returns(Promise.resolve({}));
    buildHtml();
    new phoneWidget.widget($(phoneWidget.selector)[0], {}, settings);

    var input = inputSelector(inputName);
    var proxyInput = proxySelector(inputName);

    var invalid = '+1 (650) 222-33333333';
    proxyInput.val(invalid);
    proxyInput.change();
    chai.expect(input.val()).to.equal(invalid);
  });

  it('keeps formatted input', function() {
    settings.returns(Promise.resolve({}));
    buildHtml();
    new phoneWidget.widget($(phoneWidget.selector)[0], {}, settings);

    var input = inputSelector(inputName);
    var proxyInput = proxySelector(inputName);

    var valid = '+16502223333';
    proxyInput.val(valid);
    proxyInput.change();
    chai.expect(input.val()).to.equal(valid);
  });

  it('doesn\'t modify non-phone fields', function() {
    settings.returns(Promise.resolve({}));
    buildHtml('other');
    new phoneWidget.widget($(phoneWidget.selector)[0], {}, settings);

    // No extra field
    chai.expect($('input').length).to.equal(1);
  });
});
