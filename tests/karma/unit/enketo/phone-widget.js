describe('phone-widget', function() {
	'use strict';
	/* jshint multistr: true */

	var phoneWidget;
	var settingsP;
	var inputName = '/some/input/name';

	beforeEach(function() {
		module('inboxApp');

		// Mock out settings service.
		settingsP = function() {
			var settings = {};
			return {
				then: function(func) {
					func(settings);
				}
			};
		};

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
		   <input type="' + type + '" name="' + inputName + '" required="required" data-type-xml="' + type + '" > \
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
		return 'input[name=\"' + name + '\"]';
	}

	it('is placed in dom', function() {
		buildHtml();
		new phoneWidget.widget($(phoneWidget.selector)[0], {}, settingsP);

		// Check a proxy input field is added, and the real one is hidden.
		chai.expect($('input').length).to.equal(2);

		var input = $(inputSelector(inputName));
		chai.expect(input.is(':visible')).to.equal(false);

		var proxyInput = $(inputSelector(inputName + '_proxy'));
		chai.expect(proxyInput.length).to.equal(1);
		chai.expect(proxyInput.is(':visible')).to.equal(true);
	});

	it('formats input', function() {
		buildHtml();
		new phoneWidget.widget($(phoneWidget.selector)[0], {}, settingsP);

		var input = $(inputSelector(inputName));
		var proxyInput = $(inputSelector(inputName + '_proxy'));

		proxyInput.val('+1 (650) 222-3333');
		proxyInput.change();
		chai.expect(input.val()).to.equal('+16502223333');
	});

	it('doesn\'t format invalid input', function() {
		buildHtml();
		new phoneWidget.widget($(phoneWidget.selector)[0], {}, settingsP);

		var input = $(inputSelector(inputName));
		var proxyInput = $(inputSelector(inputName + '_proxy'));

		var invalid = '+1 (650) 222-33333333';
		proxyInput.val(invalid);
		proxyInput.change();
		chai.expect(input.val()).to.equal(invalid);
	});

	it('keeps formatted input', function() {
		buildHtml();
		new phoneWidget.widget($(phoneWidget.selector)[0], {}, settingsP);

		var input = $(inputSelector(inputName));
		var proxyInput = $(inputSelector(inputName + '_proxy'));

		var valid = '+16502223333';
		proxyInput.val(valid);
		proxyInput.change();
		chai.expect(input.val()).to.equal(valid);
	});

	it('doesn\'t modify non-phone fields', function() {
		buildHtml('other');
		new phoneWidget.widget($(phoneWidget.selector)[0], {}, settingsP);

		// No extra field
		chai.expect($('input').length).to.equal(1);
	});

});