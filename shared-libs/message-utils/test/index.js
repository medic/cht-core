const sinon = require('sinon'),
      moment = require('moment'),
      expect = require('chai').expect,
      should = require('chai').should(),
      uuid = require('uuid');
const utils = require('../src/index');

const MAX_GSM_LENGTH = 160;
const MAX_UNICODE_LENGTH = 70;

var generateMessage = function(length, unicode) {
  var result = [];
  for (var i = 0; i < length; i++) {
    result[i] = unicode ? '☃' : 'o';
  }
  return result.join('');
};

describe('messageUtils', () => {

  beforeEach(done => {
    sinon.restore();
    done();
  });

  describe('_getRecipient', () => {
    it('returns undefined if no doc is passed', () => {
      should.not.exist(utils._getRecipient());
    });
    it('returns doc.from if no recipient', () => {
      utils._getRecipient({from: 'foo'})
        .should.equal('foo');
    });
    describe('recipient variations', () => {
      const fromPhone = 'fromPhone',
            clinicPhone = 'clinicPhone',
            parentPhone = 'parentPhone',
            grandparentPhone = 'grandParentPhone',
            fieldsPhone = 'fieldsPhone',
            inlinePhone = 'inlinePhone',
            complexInlinePhone = 'complexInlinePhone';
      const doc = {
        form: 'x',
        from: fromPhone,
        fields: {
          phone: fieldsPhone,
        },
        phone: inlinePhone,
        contact: {
          parent: {
            type: 'clinic',
            contact: {
              phone: clinicPhone
            },
            parent: {
              type: 'health_center',
              contact: {
                phone: parentPhone
              },
              parent: {
                type: 'district_hospital',
                contact: {
                  phone: grandparentPhone
                }
              }
            }
          }
        },
        complex: { inline: { phone: complexInlinePhone }}
      };

      it('resolves reporting_unit correctly', () => {
        utils._getRecipient(doc, 'reporting_unit')
          .should.equal(fromPhone);
      });
      it('resolves clinic correctly', () => {
        utils._getRecipient(doc, 'clinic')
          .should.equal(clinicPhone);
      });
      it('resolves parent correctly', () => {
        utils._getRecipient(doc, 'parent')
          .should.equal(parentPhone);
      });
      it('resolves grandparent correctly', () => {
        utils._getRecipient(doc, 'grandparent')
          .should.equal(grandparentPhone);
      });
      it('resolves clinic based on patient if given', () => {
        const context = {
          patient: {
            parent: {
              type: 'clinic',
              contact: {
                phone: '111'
              }
            }
          },
          parent: {
            type: 'clinic',
            contact: {
              phone: '222'
            }
          }
        };
        utils._getRecipient(context, 'clinic')
          .should.equal('111');
      });
    });
    it('tries to resolve the value from the fields property', () => {
      utils._getRecipient({fields: {foo: 'bar'}}, 'foo')
        .should.equal('bar');
    });
    it('tries to resolve simple values directly on the doc', () => {
      utils._getRecipient({foo: 'bar'}, 'foo')
        .should.equal('bar');
    });
    it('tries to resolve complex values directly on the doc', () => {
      utils._getRecipient({foo: {bar: {smang: 'baz'}}}, 'foo.bar.smang')
        .should.equal('baz');
    });
    it('returns doc.from if the recipient cannot be resolved', () => {
      utils._getRecipient({from: 'foo'}, 'a-recipient')
        .should.equal('foo');
    });
  });

  describe('extendedTemplateContext', () => {

    it('picks patient data first', () => {
      const doc = { name: 'alice', fields: { name: 'bob' } };
      const patient = { name: 'charles' };
      const registrations = [{ name: 'doug', fields: { name: 'elisa' } }];
      const actual = utils._extendedTemplateContext(doc, { patient: patient, registrations: registrations });
      actual.name.should.equal('charles');
    });

    it('picks doc.fields properties second', () => {
      const doc = { name: 'alice', fields: { name: 'bob' } };
      const patient = { };
      const registrations = [{ name: 'doug', fields: { name: 'elisa' } }];
      const actual = utils._extendedTemplateContext(doc, { patient: patient, registrations: registrations });
      actual.name.should.equal('bob');
    });

    it('picks doc properties third', () => {
      const doc = { name: 'alice' };
      const patient = { };
      const registrations = [{ name: 'doug', fields: { name: 'elisa' } }];
      const actual = utils._extendedTemplateContext(doc, { patient: patient, registrations: registrations });
      actual.name.should.equal('alice');
    });

    it('picks registration[0].fields properties fourth', () => {
      const doc = { };
      const patient = { };
      const registrations = [{ name: 'doug', fields: { name: 'elisa' } }];
      const actual = utils._extendedTemplateContext(doc, { patient: patient, registrations: registrations });
      actual.name.should.equal('elisa');
    });

    it('picks registration[0].fields properties fifth', () => {
      const doc = { };
      const patient = { };
      const registrations = [{ name: 'doug' }];
      const actual = utils._extendedTemplateContext(doc, { patient: patient, registrations: registrations });
      actual.name.should.equal('doug');
    });
  });

  describe('generate', () => {

    it('adds uuid', () => {
      sinon.stub(uuid, 'v4').returns('some-uuid');
      const config = {};
      const translate = null;
      const doc = {};
      const content = { message: 'xxx' };
      const recipient = '+1234';
      const messages = utils.generate(config, translate, doc, content, recipient);
      expect(messages.length).to.equal(1);
      const message = messages[0];
      expect(message.message).to.equal('xxx');
      expect(message.to).to.equal('+1234');
      expect(message.uuid).to.equal('some-uuid');
    });

    describe('recipient', () => {

      it('calculates clinic from contact if no patient', () => {
        const config = {};
        const translate = null;
        const doc = {
          from: '+111',
          contact: {
            type: 'person',
            parent: {
              type: 'clinic',
              contact: {
                type: 'person',
                phone: '+222'
              }
            }
          }
        };
        const content = { message: 'xxx' };
        const recipient = 'clinic';
        const context = {};
        const messages = utils.generate(config, translate, doc, content, recipient, context);
        expect(messages.length).to.equal(1);
        const message = messages[0];
        expect(message.to).to.equal('+222');
      });

      it('calculates clinic from patient', () => {
        const config = {};
        const translate = null;
        const doc = {
          from: '+111',
          contact: {
            type: 'person',
            parent: {
              type: 'clinic',
              contact: {
                type: 'person',
                phone: '+222'
              }
            }
          }
        };
        const content = { message: 'xxx' };
        const recipient = 'clinic';
        const context = {
          patient: {
            parent: {
              type: 'clinic',
              contact: {
                type: 'person',
                phone: '+333'
              }
            }
          }
        };
        const messages = utils.generate(config, translate, doc, content, recipient, context);
        expect(messages.length).to.equal(1);
        const message = messages[0];
        expect(message.to).to.equal('+333');
      });

      it('calculates health_center', () => {
        const config = {};
        const translate = null;
        const doc = {
          from: '+111',
          contact: {
            type: 'person',
            parent: {
              type: 'health_center',
              contact: {
                type: 'person',
                phone: '+222'
              }
            }
          }
        };
        const content = { message: 'xxx' };
        const recipient = 'health_center';
        const context = {
          patient: {
            parent: {
              type: 'clinic',
              parent: {
                type: 'health_center',
                contact: {
                  type: 'person',
                  phone: '+333'
                }
              }
            }
          }
        };
        const messages = utils.generate(config, translate, doc, content, recipient, context);
        expect(messages.length).to.equal(1);
        const message = messages[0];
        expect(message.to).to.equal('+333');
      });

      it('calculates district', () => {
        const config = {};
        const translate = null;
        const doc = {
          from: '+111',
          contact: {
            type: 'person',
            parent: {
              type: 'district_hospital',
              contact: {
                type: 'person',
                phone: '+222'
              }
            }
          }
        };
        const content = { message: 'xxx' };
        const recipient = 'district';
        const context = {
          patient: {
            parent: {
              type: 'clinic',
              parent: {
                type: 'health_center',
                parent: {
                  type: 'district_hospital',
                  contact: {
                    type: 'person',
                    phone: '+333'
                  }
                }
              }
            }
          }
        };
        const messages = utils.generate(config, translate, doc, content, recipient, context);
        expect(messages.length).to.equal(1);
        const message = messages[0];
        expect(message.to).to.equal('+333');
      });
    });

    describe('truncation', () => {

      it('does not truncate short sms', () => {
        const sms = generateMessage(MAX_GSM_LENGTH);
        const config = { multipart_sms_limit: 10 };
        const translate = null;
        const doc = {};
        const content = { message: sms };
        const recipient = '+1234';
        const messages = utils.generate(config, translate, doc, content, recipient);
        expect(messages.length).to.equal(1);
        expect(messages[0].message).to.equal(sms);
        expect(messages[0].original_message).to.equal(undefined);
      });

      it('does not truncate short unicode sms', () => {
        const sms = generateMessage(MAX_UNICODE_LENGTH, true);
        const config = { multipart_sms_limit: 10 };
        const translate = null;
        const doc = {};
        const content = { message: sms };
        const recipient = '+1234';
        const messages = utils.generate(config, translate, doc, content, recipient);
        expect(messages.length).to.equal(1);
        expect(messages[0].message).to.equal(sms);
        expect(messages[0].original_message).to.equal(undefined);
      });

      it('truncates long sms', () => {
        const sms = generateMessage(1000);
        const expected = sms.substr(0, 150) + '...';
        const config = { multipart_sms_limit: 1 };
        const translate = null;
        const doc = {};
        const content = { message: sms };
        const recipient = '+1234';
        const messages = utils.generate(config, translate, doc, content, recipient);
        expect(messages.length).to.equal(1);
        expect(messages[0].message).to.equal(expected);
        expect(messages[0].original_message).to.equal(sms);
      });

      it('truncates long unicode sms', () => {
        const sms = generateMessage(1000, true);
        const expected = sms.substr(0, 64) + '...';
        const config = { multipart_sms_limit: 1 };
        const translate = null;
        const doc = {};
        const content = { message: sms };
        const recipient = '+1234';
        const messages = utils.generate(config, translate, doc, content, recipient);
        expect(messages.length).to.equal(1);
        expect(messages[0].message).to.equal(expected);
        expect(messages[0].original_message).to.equal(sms);
      });

    });

  });

  describe('template', () => {

    it('plain text', () => {
      const actual = utils.template({}, null, {}, { message: 'hello' });
      expect(actual).to.equal('hello');
    });

    it('variables', () => {
      const actual = utils.template({}, null, { name: 'george' }, { message: 'hello {{name}}' });
      expect(actual).to.equal('hello george');
    });

    describe('dates', () => {

      it('string', () => {
        const date = '2016-03-06T03:45:41.000Z';
        const input = '{{#date}}{{reported_date}}{{/date}}';
        const doc = { reported_date: date };
        const config = { date_format: 'DD-MMM-YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).format(config.date_format));
      });

      it('integer', () => {
        const date = 1457235941000;
        const input = '{{#date}}{{reported_date}}{{/date}}';
        const doc = { reported_date: date };
        const config = { date_format: 'DD-MMM-YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).format(config.date_format));
      });

      it('Date object', () => {
        const date = 1457235941000;
        const input = '{{#date}}Date({{reported_date}}){{/date}}';
        const doc = { reported_date: date };
        const config = { date_format: 'DD-MMM-YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).format(config.date_format));
      });

    });

    describe('datetimes', () => {

      it('integer', () => {
        const date = 1457235941000;
        const input = '{{#datetime}}{{reported_date}}{{/datetime}}';
        const doc = { reported_date: date };
        const config = { reported_date_format: 'DD-MMMM-YYYY HH:mm:ss' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).format(config.reported_date_format));
      });

      it('Date object', () => {
        const date = 1457235941000;
        const input = '{{#datetime}}Date({{reported_date}}){{/datetime}}';
        const doc = { reported_date: date };
        const config = { reported_date_format: 'DD-MMMM-YYYY HH:mm:ss' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).format(config.reported_date_format));
      });

      it('i18n', () => {
        const date = 1457235941000;
        const input = '{{#datetime}}Date({{reported_date}}){{/datetime}}';
        const doc = { reported_date: date, locale: 'sw' };
        const config = { reported_date_format: 'ddd, MMM Do, YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).locale('sw').format(config.reported_date_format));
        expect(actual).to.not.equal(moment(date).format(config.reported_date_format));
      });

      it('i18n with inexistent locale falls back to en', () => {
        const date = 1457235941000;
        const input = '{{#datetime}}Date({{reported_date}}){{/datetime}}';
        const doc = { reported_date: date, locale: 'this-locale-doesnt-exist' };
        const config = { reported_date_format: 'ddd, MMM Do, YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).locale('en').format(config.reported_date_format));
        expect(actual).to.equal(moment(date).format(config.reported_date_format));
      });

      it('i18n with undefined locale falls back to en', () => {
        const date = 1457235941000;
        const input = '{{#datetime}}Date({{reported_date}}){{/datetime}}';
        const doc = { reported_date: date, locale: false };
        const config = { reported_date_format: 'ddd, MMM Do, YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).locale('en').format(config.reported_date_format));
        expect(actual).to.equal(moment(date).format(config.reported_date_format));
      });

    });

    describe('bikram sambat', () => {

      it('integer', () => {
        const date = 1457235941000;
        const expected = '२३ फाल्गुन २०७२';
        const input = '{{#bikram_sambat_date}}{{reported_date}}{{/bikram_sambat_date}}';
        const doc = { reported_date: date };
        const config = { reported_date_format: 'DD-MMMM-YYYY HH:mm:ss' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(expected);
      });

      it('Date object', () => {
        const date = 1457235941000;
        const expected = '२३ फाल्गुन २०७२';
        const input = '{{#bikram_sambat_date}}Date({{reported_date}}){{/bikram_sambat_date}}';
        const doc = { reported_date: date };
        const config = { reported_date_format: 'DD-MMMM-YYYY HH:mm:ss' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(expected);
      });

      it('i18n has no influence', () => {
        const date = 1457235941000;
        const expected = '२३ फाल्गुन २०७२';
        const input = '{{#bikram_sambat_date}}Date({{reported_date}}){{/bikram_sambat_date}}';
        const doc = { reported_date: date, locale: 'sw' };
        const config = { reported_date_format: 'ddd, MMM Do, YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(expected);
      });

    });

    describe('template context', () => {

      it('supports template variables on doc', () => {
        const doc = {
          form: 'x',
          reported_date: '2050-03-13T13:06:22.002Z',
          governor: 'arnold',
          contact: {
            phone: '123',
            parent: {
              contact: {
                phone: '123'
              }
            }
          }
        };
        const actual = utils.template({}, null, doc, { message: '{{contact.phone}}, {{governor}}' });
        expect(actual).to.equal('123, arnold');
      });

      it('internal fields always override form fields', () => {
        const doc = {
          form: 'x',
          reported_date: '2050-03-13T13:06:22.002Z',
          chw_name: 'Arnold',
          contact: {
            name: 'Sally',
            parent: {
              contact: {
                name: 'Sally'
              }
            }
          }
        };
        const actual = utils.template({}, null, doc, { message: '{{contact.name}}, {{chw_name}}' });
        expect(actual).to.equal('Sally, Arnold');
      });

      it('merges extra context', () => {
        const doc = {
          form: 'x',
          reported_date: '2050-03-13T13:06:22.002Z',
          chw_name: 'Arnold'
        };
        const extraContext = {
          patient: {
            parent: {
              type: 'clinic',
              contact: { name: 'Bede' }
            }
          }
        };
        const config = {};
        const translate = null;
        const content = { message: 'Your CHP is {{clinic.contact.name}}' };
        const actual = utils.template(config, translate, doc, content, extraContext);
        expect(actual).to.equal('Your CHP is Bede');
      });

      // Tests how standard configuration sets district_hospital parents
      it('handles parent as an empty string - #4410', () => {
        const doc = {
          form: 'x',
          reported_date: '2050-03-13T13:06:22.002Z',
          chw_name: 'Arnold',
          parent: {
            type: 'health_center',
            parent: {
              type: 'district_hospital',
              parent: ''
            }
          }
        };
        const extraContext = {
          patient: {
            parent: {
              type: 'clinic',
              contact: { name: 'Bede' }
            }
          }
        };
        const config = {};
        const translate = null;
        const content = { message: 'Your CHP is {{clinic.contact.name}}' };
        const actual = utils.template(config, translate, doc, content, extraContext);
        expect(actual).to.equal('Your CHP is Bede');
      });

    });

  });

});
