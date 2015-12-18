describe('phone-widget', function() {
	'use strict';
	/*jshint multistr: true */

	it('is tested', function() {
		var phoneWidget = require('../../../../static/js/enketo/widgets/phone-widget');
		var inputName = '/some/input/name';
		var inputDom = $('<input type="tel" name="' + inputName + '" required="required" data-type-xml="tel" >')[0];

		chai.expect(phoneWidget.name).to.equal('blah');

		chai.expect(inputDom.find('[name="' + inputName + '"]').is(':visible')).to.equal(true);
		chai.expect(inputDom.find('[name="' + inputName + '_proxy"]').length).to.equal(1);
	});
});