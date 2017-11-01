const should = require('chai').should();
const sinon = require('sinon').sandbox.create();

describe('messages util', () => {
  const messages = require('../../../lib/messages');

  afterEach(done => {
    sinon.restore();
    done();
  });

  describe('getRecipientPhone', () => {
    it('is undefined if no doc is passed', () => {
      should.not.exist(messages.getRecipientPhone());
    });
    it('is the passed default if no recipient is defined', () => {
      messages.getRecipientPhone({}, '', 'the-default')
        .should.equal('the-default');
    });
    it('is doc.from is no recipient or default is defined', () => {
      messages.getRecipientPhone({from: 'foo'})
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
        messages.getRecipientPhone(doc, 'reporting_unit')
          .should.equal(fromPhone);
      });
      it('resolves clinic correctly', () => {
        messages.getRecipientPhone(doc, 'clinic')
          .should.equal(clinicPhone);
      });
      it('resolves parent correctly', () => {
        messages.getRecipientPhone(doc, 'parent')
          .should.equal(parentPhone);
      });
      it('resolves grandparent correctly', () => {
        messages.getRecipientPhone(doc, 'grandparent')
          .should.equal(grandparentPhone);
      });
    });
    it('tries to resolve the value from the fields property', () => {
      messages.getRecipientPhone({fields: {foo: 'bar'}}, 'foo')
        .should.equal('bar');
    });
    it('tries to resolve simple values directly on the doc', () => {
      messages.getRecipientPhone({foo: 'bar'}, 'foo')
        .should.equal('bar');
    });
    it('tries to resolve complex values directly on the doc', () => {
      messages.getRecipientPhone({foo: {bar: {smang: 'baz'}}}, 'foo.bar.smang')
        .should.equal('baz');
    });
    it('is the passed default if the recipient cannot be resolved', () => {
      messages.getRecipientPhone({}, 'a-recipient', 'default')
        .should.equal('default');
    });
    it('is doc.from if no default is passed and the recipient cannot be resolved', () => {
      messages.getRecipientPhone({from: 'foo'}, 'a-recipient')
        .should.equal('foo');
    });
  });
});
