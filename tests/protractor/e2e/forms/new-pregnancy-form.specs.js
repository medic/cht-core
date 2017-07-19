const pregnancyForm = require('../../page-objects/forms/new-pregnancy-form.po.js'),
	common = require('../../page-objects/common/common.po.js'),
	utils = require('../../utils');

describe('Submit Delivery Report', () => {

	const contactId = '3b3d50d275280d2568cd36281d00348b';
	const docs = [
		{
			_id: 'c49385b3594af7025ef097114104ef48',
			reported_date: 1469578114543,
			notes: '',
			contact: {
				_id: contactId,
				name: 'Jack',
				date_of_birth: '',
				phone: '+64274444444',
				alternate_phone: '',
				notes: '',
				type: 'person',
				reported_date: 1478469976421
			},
			name: 'Number three district',
			external_id: '',
			type: 'district_hospital'
		},
		{
			_id: contactId,
			name: 'Jack',
			date_of_birth: '',
			phone: '+64274444444',
			alternate_phone: '',
			notes: '',
			type: 'person',
			reported_date: 1478469976421,
			parent: {
				_id: 'c49385b3594af7025ef097114104ef48',
				reported_date: 1469578114543,
				notes: '',
				contact: {
					_id: contactId,
					name: 'Jack',
					date_of_birth: '',
					phone: '+64274444444',
					alternate_phone: '',
					notes: '',
					type: 'person',
					reported_date: 1478469976421
				},
				name: 'Number three district',
				external_id: '',
				type: 'district_hospital'
			}
		}
	];

	beforeAll(done => {
		browser.ignoreSynchronization = true;
		pregnancyForm.configureForm(done);
		utils.seedTestData(done, contactId, docs);
	});

	afterEach(done => {
		utils.resetBrowser();
		done();
	});

	afterAll(utils.afterEach);

	it('Test datepicker', () => {
		common.openForm();
		pregnancyForm.selectPatientName('jack');
		pregnancyForm.nextPage();
		pregnancyForm.selectLMPYesButton();
		pregnancyForm.setLastCycleDate('2017-04-25');
	});
});
