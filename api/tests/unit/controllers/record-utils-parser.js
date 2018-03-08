const sinon = require('sinon').sandbox.create(),
      definitions = require('../../form-definitions'),
      config = require('../../../config'),
      recordUtils = require('../../../controllers/record-utils');

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

exports['assert month is parsed as integer'] = test => {
  sinon.stub(config, 'get').returns(definitions.forms);
  const body = {
    from: '+888',
    message: '1!YYYY!facility#2011#11'
  };
  const doc = recordUtils.createByForm(body);
  test.equals(11, doc.fields.month);
  test.done();
};

exports['assert unix timestamp parsed'] = test => {
  const body = {
    from: '',
    message: 'foo',
    sent_timestamp:'1352499725000'
  };
  const doc = recordUtils.createByForm(body);
  test.equals(
    'Fri, 09 Nov 2012 22:22:05 GMT',
    new Date(doc.reported_date).toUTCString()
  );
  test.done();
};

exports['deep keys parsed'] = test => {
  sinon.stub(config, 'get').returns(definitions.forms);
  const body = {
    from: '+13125551212',
    message: '1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4',
    sent_timestamp:'1352399720000'
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
  const doc = recordUtils.createByForm(body);
  test.same(doc.fields.days_stocked_out, days_stocked_out);
  test.same(doc.fields.quantity_dispensed, quantity_dispensed);
  test.done();
};

exports['POST data is saved on sms_message attr'] = test => {
  sinon.stub(config, 'get').returns(definitions.forms);
  const body = {
    from: '+13125551212',
    message: '1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4'
  };
  const doc = recordUtils.createByForm(body);
  test.same(doc.sms_message.content, body);
  test.done();
};

exports['parsed form success maintains facility not found'] = test => {
  sinon.stub(config, 'get').returns(definitions.forms);
  const body = {
    from:'+888',
    message:'1!YYYZ!foo#bar'
  };
  const doc = recordUtils.createByForm(body);
  test.equals(doc.errors[0].code, 'sys.facility_not_found');
  test.equals(doc.errors.length, 1);
  test.done();
};

exports['autoreply on YYYY form is ignored'] = test => {
  sinon.stub(config, 'get').returns(definitions.forms);
  const body = {
    from:'+888',
    message:'1!YYYY!facility#2012#4#1#222#333#444#555#666#777#888#999#111#222#333#444'
  };
  const doc = recordUtils.createByForm(body);
  test.equals(doc.form, 'YYYY');
  test.equals(doc.errors[0].code, 'sys.facility_not_found');
  test.equals(doc.errors.length, 1);
  test.done();
};

exports['form not found error not set by default'] = test => {
  const body = {
    from:'+888',
    message:'foo bar baz'
  };
  const doc = recordUtils.createByForm(body);
  test.equals(doc.errors[0].code, 'sys.facility_not_found');
  test.equals(doc.errors.length, 1);
  test.done();
};

exports['form not found error set in forms only mode'] = test => {
  sinon.stub(config, 'get')
    .withArgs('forms').returns(definitions.forms)
    .withArgs('forms_only_mode').returns(true);
  const body = {
    from:'+888',
    message:'foo bar baz'
  };
  const doc = recordUtils.createByForm(body);
  test.equals(doc.errors[0].code, 'sys.facility_not_found');
  test.equals(doc.errors[1].code, 'sys.form_not_found');
  test.equals(doc.errors.length, 2);
  test.done();
};

exports['only facility not found error on muvuku add'] = test => {
  sinon.stub(config, 'get').withArgs('forms').returns(definitions.forms);
  const body = {
    from:'+888',
    message: '1!0000!2012#2#20#foo#bar'
  };
  const doc = recordUtils.createByForm(body);
  test.equals(doc.errors[0].code, 'sys.facility_not_found');
  test.equals(doc.errors.length, 1);
  test.done();
};

exports['form not found response locale from query'] = test => {
  sinon.stub(config, 'get')
    .withArgs('forms').returns(definitions.forms)
    .withArgs('forms_only_mode').returns(true);
  const translate = sinon.stub(config, 'translate').returns('translated');
  const body = {
    from:'+888',
    message: '1!0000!2012#2#20#foo#bar'
  };
  const doc = recordUtils.createByForm(body, { locale: 'fr' });
  test.equals(doc.errors[0].code, 'sys.facility_not_found');
  test.equals(doc.errors[0].message, 'translated');
  test.equals(doc.errors[1].code, 'sys.form_not_found');
  test.equals(doc.errors[1].message, 'translated');
  test.equals(doc.errors.length, 2);
  test.equals(translate.callCount, 2);
  test.equals(translate.args[0][0], 'sys.facility_not_found');
  test.equals(translate.args[0][1], 'fr');
  test.equals(translate.args[1][0], 'sys.form_not_found');
  test.equals(translate.args[1][1], 'fr');
  test.done();
};

exports['form not found message locale on form overrides locale on query'] = test => {
  sinon.stub(config, 'get')
    .withArgs('forms').returns(definitions.forms)
    .withArgs('forms_only_mode').returns(true);
  const translate = sinon.stub(config, 'translate').returns('translated');
  const body = {
    locale: 'es',
    from: '+888',
    message: '1!0000!2012#2#20#foo#bar'
  };
  recordUtils.createByForm(body, { locale: 'fr' });
  test.equals(translate.callCount, 2);
  test.equals(translate.args[0][0], 'sys.facility_not_found');
  test.equals(translate.args[0][1], 'es');
  test.equals(translate.args[1][0], 'sys.form_not_found');
  test.equals(translate.args[1][1], 'es');
  test.done();
};

exports['form not found message locale fallback to app_settings'] = test => {
  sinon.stub(config, 'get')
    .withArgs('forms').returns(definitions.forms)
    .withArgs('forms_only_mode').returns(true)
    .withArgs('locale').returns('ne');
  const translate = sinon.stub(config, 'translate').returns('translated');
  const body = {
    from: '+888',
    message: '1!0000!2012#2#20#foo#bar'
  };
  recordUtils.createByForm(body);
  test.equals(translate.callCount, 2);
  test.equals(translate.args[0][0], 'sys.facility_not_found');
  test.equals(translate.args[0][1], 'ne');
  test.equals(translate.args[1][0], 'sys.form_not_found');
  test.equals(translate.args[1][1], 'ne');
  test.done();
};

exports['form not found message when locale undefined'] = test => {
  sinon.stub(config, 'get')
    .withArgs('forms').returns(definitions.forms)
    .withArgs('forms_only_mode').returns(true)
    .withArgs('locale').returns(undefined);
  const translate = sinon.stub(config, 'translate').returns('translated');
  const body = {
    from: '+888',
    message: '1!0000!2012#2#20#foo#bar'
  };
  recordUtils.createByForm(body);
  test.equals(translate.callCount, 2);
  test.equals(translate.args[0][0], 'sys.facility_not_found');
  test.equals(translate.args[0][1], 'en');
  test.equals(translate.args[1][0], 'sys.form_not_found');
  test.equals(translate.args[1][1], 'en');
  test.done();
};

exports['assign sys.empty error to empty report'] = test => {
  const body = {
    from: '+888',
    message: ' '
  };
  sinon.stub(config, 'translate').returns('translated');
  const doc = recordUtils.createByForm(body);
  test.equals(doc.errors[0].code, 'sys.facility_not_found');
  test.equals(doc.errors[1].code, 'sys.empty');
  test.done();
};

exports['one word report gets undefined form property'] = test => {
  sinon.stub(config, 'get')
    .withArgs('forms').returns(definitions.forms);
  const body = {
    from:'+888',
    message: 'foo'
  };
  const doc = recordUtils.createByForm(body);
  test.equals(doc.form, undefined);
  test.done();
};

exports['errors on extra fields'] = test => {
  sinon.stub(config, 'get')
    .withArgs('forms').returns(definitions.forms);
  const body = {
    from:'+888',
    message: '1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4#123',
    sent_timestamp:'1352399720000'
  };
  const doc = recordUtils.createByForm(body);
  test.equals(doc.errors.length, 2);
  test.equals(doc.errors[0].code, 'extra_fields');
  test.done();
};

exports['errors on missing fields'] = test => {
  sinon.stub(config, 'get')
    .withArgs('forms').returns(definitions.forms);
  const body = {
    from:'+888',
    message: '1!YYYY!foo'
  };
  const doc = recordUtils.createByForm(body);
  test.equals(doc.errors[0].code, 'sys.missing_fields');
  test.same(doc.errors[0].fields, ['year','month']);
  test.done();
};

exports['support unstructured message'] = test => {
  sinon.stub(config, 'get')
    .withArgs('forms').returns(definitions.forms);
  const body = {
    from: '+888',
    message: 'hello world! anyone there?'
  };
  const doc = recordUtils.createByForm(body);
  // unstructured message has form of null
  test.equals(doc.form, undefined);
  test.equals(doc.sms_message.message, 'hello world! anyone there?');
  test.equals(doc.errors[0].code, 'sys.facility_not_found');
  test.done();
};

exports['creates record with empty message field'] = test => {
  sinon.stub(config, 'get')
    .withArgs('forms').returns(definitions.forms);
  const body = { from: '+888', message: '' };
  const doc = recordUtils.createByForm(body);
  test.equals(doc.sms_message.message, '');
  test.done();
};

exports['JSON POST: throw error if form not found'] = test => {
  const body = {
    _meta: {
      form: 'foo',
      from: '+888'
    }
  };
  try {
    recordUtils.createRecordByJSON(body);
    test.fail('Should throw form not found error');
  } catch(e) {
    test.equals(e.publicMessage, 'Form not found: FOO');
  }
  test.done();
};

exports['JSON POST: support _meta.form property to match/parse form'] = test => {
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
  const doc = recordUtils.createRecordByJSON(body);
  test.equals(doc.form, 'YYYY');
  test.equals(doc.fields.facility_id, 'zanzibar');
  test.equals(doc.fields.month, 8);
  test.equals(doc.fields.year, 2011);
  test.done();
};

exports['JSON POST: _meta.form is case insensitive'] = test => {
  sinon.stub(config, 'get')
    .withArgs('forms').returns(definitions.forms);
  const body = {
    _meta: {
      form: 'yyYy',
      from: '+888'
    }
  };
  recordUtils.createRecordByJSON(body);
  test.done();
};

exports['JSON POST: ignore object and null properties'] = test => {
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
  const doc = recordUtils.createRecordByJSON(body);
  test.equals(doc.fields.facility_id, 'zanzibar');
  test.equals(doc.fields.year, 2011);
  test.equals(doc.fields.age, undefined);
  test.equals(doc.fields.picture, undefined);
  test.done();
};

exports['JSON POST: convert property names to lowercase'] = test => {
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
  const doc = recordUtils.createRecordByJSON(body);
  test.equals(doc.fields.facility_id, 'zanzibar');
  test.equals(doc.fields.year, 2011);
  test.done();
};

exports['JSON POST: support reported_date _meta property'] = test => {
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
  const doc = recordUtils.createRecordByJSON(body);
  test.equals(doc.reported_date, 1421177819013);
  test.equals(doc.fields.facility_id, 'zanzibar');
  test.equals(doc.fields.year, 2011);
  test.equals(doc.fields.month, 8);
  test.done();
};
