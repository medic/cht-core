const sinon = require('sinon');
const chai = require('chai');
const definitions = require('../../form-definitions');
const config = require('../../../src/config');
const records = require('../../../src/services/records');

describe('record parser', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('assert month is parsed into a string using a list', () => {
    sinon.stub(config, 'get').returns(definitions.forms);
    const body = {
      from: '+888',
      message: '1!YYYY!facility#2011#11'
    };
    const doc = records.createByForm(body);
    chai.expect('November').to.equal(doc.fields.month);
  });

  it('assert unix timestamp parsed', () => {
    const body = {
      from: '',
      message: 'foo',
      sent_timestamp: '1352499725000'
    };
    const doc = records.createByForm(body);
    chai.expect(new Date(doc.reported_date).toUTCString())
      .to.equal('Fri, 09 Nov 2012 22:22:05 GMT');
  });

  it('deep keys parsed', () => {
    sinon.stub(config, 'get').returns(definitions.forms);
    const body = {
      from: '+13125551212',
      message: '1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4',
      sent_timestamp: '1352399720000'
    };
    const days_stocked_out = {
      cotrimoxazole: 7,
      eye_ointment: 4,
      la_6x1: 9,
      la_6x2: 8,
      ors: 5,
      zinc: 6
    };
    const quantity_dispensed = {
      cotrimoxazole: 3,
      eye_ointment: 6,
      la_6x1: 1,
      la_6x2: 2,
      ors: 5,
      zinc: 4
    };
    const doc = records.createByForm(body);
    chai.expect(doc.fields.days_stocked_out).to.deep.equal(days_stocked_out);
    chai.expect(doc.fields.quantity_dispensed).to.deep.equal(quantity_dispensed);
  });

  it('POST data is saved on sms_message attr', () => {
    sinon.stub(config, 'get').returns(definitions.forms);
    const body = {
      from: '+13125551212',
      message: '1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4'
    };
    const doc = records.createByForm(body);
    chai.expect(doc.sms_message.message).to.equal(body.message);
    chai.expect(doc.sms_message.from).to.equal(body.from);
  });

  it('parsed form success does not have errors', () => {
    sinon.stub(config, 'get').returns(definitions.forms);
    const body = {
      from: '+888',
      message: '1!YYYZ!foo#bar'
    };
    const doc = records.createByForm(body);
    chai.expect(doc.errors.length).to.equal(0);
  });

  it('form not found error not set by default', () => {
    const body = {
      from: '+888',
      message: 'foo bar baz'
    };
    const doc = records.createByForm(body);
    chai.expect(doc.errors.length).to.equal(0);
  });

  it('form not found error set in forms only mode', () => {
    sinon.stub(config, 'get')
      .withArgs('forms').returns(definitions.forms)
      .withArgs('forms_only_mode').returns(true);
    const body = {
      from: '+888',
      message: 'foo bar baz'
    };
    const doc = records.createByForm(body);
    chai.expect(doc.errors[0].code).to.equal('sys.form_not_found');
    chai.expect(doc.errors.length).to.equal(1);
  });

  it('no errors on muvuku add', () => {
    sinon.stub(config, 'get').withArgs('forms').returns(definitions.forms);
    const body = {
      from: '+888',
      message: '1!0000!2012#2#20#foo#bar'
    };
    const doc = records.createByForm(body);
    chai.expect(doc.errors.length).to.equal(0);
  });

  it('form not found response locale from query', () => {
    sinon.stub(config, 'get')
      .withArgs('forms').returns(definitions.forms)
      .withArgs('forms_only_mode').returns(true);
    const translate = sinon.stub(config, 'translate').returns('translated');
    const body = {
      from: '+888',
      message: '1!0000!2012#2#20#foo#bar'
    };
    const doc = records.createByForm(body, { locale: 'fr' });
    chai.expect(doc.errors[0].code).to.equal('sys.form_not_found');
    chai.expect(doc.errors[0].message).to.equal('translated');
    chai.expect(doc.errors.length).to.equal(1);
    chai.expect(translate.callCount).to.equal(1);
    chai.expect(translate.args[0][0]).to.equal('sys.form_not_found');
    chai.expect(translate.args[0][1]).to.equal('fr');
  });

  it('form not found message locale on form overrides locale on query', () => {
    sinon.stub(config, 'get')
      .withArgs('forms').returns(definitions.forms)
      .withArgs('forms_only_mode').returns(true);
    const translate = sinon.stub(config, 'translate').returns('translated');
    const body = {
      locale: 'es',
      from: '+888',
      message: '1!0000!2012#2#20#foo#bar'
    };
    records.createByForm(body, { locale: 'fr' });
    chai.expect(translate.callCount).to.equal(1);
    chai.expect(translate.args[0][0]).to.equal('sys.form_not_found');
    chai.expect(translate.args[0][1]).to.equal('es');
  });

  it('form not found message locale fallback to app_settings', () => {
    sinon.stub(config, 'get')
      .withArgs('forms').returns(definitions.forms)
      .withArgs('forms_only_mode').returns(true)
      .withArgs('locale').returns('ne');
    const translate = sinon.stub(config, 'translate').returns('translated');
    const body = {
      from: '+888',
      message: '1!0000!2012#2#20#foo#bar'
    };
    records.createByForm(body);
    chai.expect(translate.callCount).to.equal(1);
    chai.expect(translate.args[0][0]).to.equal('sys.form_not_found');
    chai.expect(translate.args[0][1]).to.equal('ne');
  });

  it('form not found message when locale undefined', () => {
    sinon.stub(config, 'get')
      .withArgs('forms').returns(definitions.forms)
      .withArgs('forms_only_mode').returns(true)
      .withArgs('locale').returns(undefined);
    const translate = sinon.stub(config, 'translate').returns('translated');
    const body = {
      from: '+888',
      message: '1!0000!2012#2#20#foo#bar'
    };
    records.createByForm(body);
    chai.expect(translate.callCount).to.equal(1);
    chai.expect(translate.args[0][0]).to.equal('sys.form_not_found');
    chai.expect(translate.args[0][1]).to.equal('en');
  });

  it('assign sys.empty error to empty report', () => {
    const body = {
      from: '+888',
      message: ' '
    };
    sinon.stub(config, 'translate').returns('translated');
    const doc = records.createByForm(body);
    chai.expect(doc.errors[0].code).to.equal('sys.empty');
  });

  it('one word report gets undefined form property', () => {
    sinon.stub(config, 'get')
      .withArgs('forms').returns(definitions.forms);
    const body = {
      from: '+888',
      message: 'foo'
    };
    const doc = records.createByForm(body);
    chai.expect(doc.form).to.equal(undefined);
  });

  it('errors on extra fields', () => {
    sinon.stub(config, 'get')
      .withArgs('forms').returns(definitions.forms);
    const body = {
      from: '+888',
      message: '1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4#123',
      sent_timestamp: '1352399720000'
    };
    const doc = records.createByForm(body);
    chai.expect(doc.errors.length).to.equal(1);
    chai.expect(doc.errors[0].code).to.equal('extra_fields');
  });

  it('errors on missing fields', () => {
    sinon.stub(config, 'get')
      .withArgs('forms').returns(definitions.forms);
    const body = {
      from: '+888',
      message: '1!YYYY!foo'
    };
    const doc = records.createByForm(body);
    chai.expect(doc.errors[0].code).to.equal('sys.missing_fields');
  });

  it('support unstructured message', () => {
    sinon.stub(config, 'get')
      .withArgs('forms').returns(definitions.forms);
    const body = {
      from: '+888',
      message: 'hello world! anyone there?'
    };
    const doc = records.createByForm(body);
    // unstructured message has form of null
    chai.expect(doc.form).to.equal(undefined);
    chai.expect(doc.sms_message.message).to.equal('hello world! anyone there?');
  });

  it('creates record with empty message field', () => {
    sinon.stub(config, 'get')
      .withArgs('forms').returns(definitions.forms);
    const body = { from: '+888', message: '' };
    const doc = records.createByForm(body);
    chai.expect(doc.sms_message.message).to.equal('');
  });

  it('JSON POST: throw error if form not found', done => {
    const body = {
      _meta: {
        form: 'foo',
        from: '+888'
      }
    };
    try {
      records.createRecordByJSON(body);
    } catch (e) {
      chai.expect(e.publicMessage).to.equal('Form not found: FOO');
      done();
    }
  });

  it('JSON POST: support _meta.form property to match/parse form', () => {
    sinon.stub(config, 'get')
      .withArgs('forms').returns(definitions.forms);
    const body = {
      facility_id: 'zanzibar',
      year: 2011,
      month: 8,
      _meta: {
        form: 'yyyy',
        from: '+888'
      }
    };
    const doc = records.createRecordByJSON(body);
    chai.expect(doc.form).to.equal('YYYY');
    chai.expect(doc.fields.facility_id).to.equal('zanzibar');
    chai.expect(doc.fields.month).to.equal(8);
    chai.expect(doc.fields.year).to.equal(2011);
  });

  it('JSON POST: _meta.form is case insensitive', () => {
    sinon.stub(config, 'get')
      .withArgs('forms').returns(definitions.forms);
    const body = {
      _meta: {
        form: 'yyYy',
        from: '+888'
      }
    };
    records.createRecordByJSON(body);
  });

  it('JSON POST: ignore object and null properties', () => {
    sinon.stub(config, 'get')
      .withArgs('forms').returns(definitions.forms);
    const body = {
      facility_id: 'zanzibar',
      year: 2011,
      month: 8,
      age: null,
      picture: {
        url: 'http://foo.com/1.jpg'
      },
      _meta: {
        form: 'yyyy',
        from: '+888'
      }
    };
    const doc = records.createRecordByJSON(body);
    chai.expect(doc.fields.facility_id).to.equal('zanzibar');
    chai.expect(doc.fields.year).to.equal(2011);
    chai.expect(doc.fields.age).to.equal(undefined);
    chai.expect(doc.fields.picture).to.equal(undefined);
  });

  it('JSON POST: convert property names to lowercase', () => {
    sinon.stub(config, 'get')
      .withArgs('forms').returns(definitions.forms);
    const body = {
      FaciLity_Id: 'zanzibar',
      Year: 2011,
      mOnth: 8,
      _meta: {
        form: 'yyyy',
        from: '+888'
      }
    };
    const doc = records.createRecordByJSON(body);
    chai.expect(doc.fields.facility_id).to.equal('zanzibar');
    chai.expect(doc.fields.year).to.equal(2011);
  });

  it('JSON POST: support reported_date _meta property', () => {
    sinon.stub(config, 'get')
      .withArgs('forms').returns(definitions.forms);
    const body = {
      facility_id: 'zanzibar',
      year: 2011,
      month: 8,
      _meta: {
        reported_date: '2015-01-13T19:36:59.013Z',
        form: 'yyyy',
        from: '+888'
      }
    };
    const doc = records.createRecordByJSON(body);
    chai.expect(doc.reported_date).to.equal(1421177819013);
    chai.expect(doc.fields.facility_id).to.equal('zanzibar');
    chai.expect(doc.fields.year).to.equal(2011);
    chai.expect(doc.fields.month).to.equal(8);
  });

});
