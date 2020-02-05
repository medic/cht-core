describe('ContactSummary service', () => {

  'use strict';

  let service;
  const Settings = sinon.stub();

  beforeEach(() => {
    module('inboxApp');
    module($provide => {
      $provide.value('Settings', Settings);
      $provide.value('$filter', name => {
        if (name !== 'reversify') {
          throw new Error('unknown filter');
        }
        return value => value.split('').reverse().join('');
      });
    });
    inject(_ContactSummary_ => {
      service = _ContactSummary_;
    });
  });

  afterEach(() => {
    KarmaUtils.restore(Settings);
  });

  it('returns empty when no script configured', () => {
    Settings.returns(Promise.resolve({ contact_summary: '' }));
    const contact = {};
    const reports = [];
    return service(contact, reports).then(actual => {
      chai.expect(actual.fields.length).to.equal(0);
      chai.expect(actual.cards.length).to.equal(0);
    });
  });

  it('evals script with `reports` and `contact` in scope', () => {
    const script = `return { fields: [
                      { label: "Notes", value: "Hello " + contact.name },
                      { label: "Num reports", value: reports.length }
                    ] };`;
    Settings.returns(Promise.resolve({ contact_summary: script }));
    const contact = { name: 'jack' };
    const reports = [ { _id: 1 }, { _id: 2} ];
    return service(contact, reports).then(actual => {
      chai.expect(actual.fields.length).to.equal(2);
      chai.expect(actual.fields[0].label).to.equal('Notes');
      chai.expect(actual.fields[0].value).to.equal('Hello jack');
      chai.expect(actual.fields[1].label).to.equal('Num reports');
      chai.expect(actual.fields[1].value).to.equal(2);
      chai.expect(actual.cards.length).to.equal(0);
    });
  });

  it('applies filters to values', () => {
    const script = `return { fields: [
                      { label: "Notes", value: "Hello", filter: "reversify" }
                    ] };`;
    Settings.returns(Promise.resolve({ contact_summary: script }));
    const contact = {};
    const reports = [];
    return service(contact, reports).then(actual => {
      chai.expect(actual.fields.length).to.equal(1);
      chai.expect(actual.fields[0].label).to.equal('Notes');
      chai.expect(actual.fields[0].value).to.equal('olleH');
      chai.expect(actual.cards.length).to.equal(0);
    });
  });

  it('does not crash when contact-summary function returns arrays with undefined elements #4125', () => {
    const script = `
                   return {
                     fields: [undefined],
                     cards: [undefined]
                   }
                   `;
    Settings.returns(Promise.resolve({ contact_summary: script }));
    const contact = {};
    const reports = [];
    return service(contact, reports).then(actual => {
      chai.expect(actual.fields).to.deep.equal([undefined]);
      chai.expect(actual.cards).to.deep.equal([undefined]);
    });
  });

  it('does not crash when contact-summary function returns non-array elements #4125', () => {
    const script = `
                   return {
                     fields: 'alpha',
                     cards: [{ fields: 'beta' }]
                   }
                   `;
    Settings.returns(Promise.resolve({ contact_summary: script }));
    const contact = {};
    const reports = [];
    return service(contact, reports).then(actual => {
      chai.expect(actual.fields).to.be.an('array');
      chai.expect(actual.fields.length).to.equal(0);
      chai.expect(actual.cards).to.be.an('array');
      chai.expect(actual.cards.length).to.equal(1);
      chai.expect(actual.cards[0].fields).to.equal('beta');
    });
  });

  it('does crash when contact summary throws an error', () => {
    const script = `return contact.some.field;`;

    Settings.returns(Promise.resolve({ contact_summary: script }));
    const contact = {};
    return service(contact)
      .then(function() {
        throw new Error('Expected error to be thrown');
      })
      .catch(function(err) {
        chai.expect(err.message).to.equal('Configuration error');
      });
  });

  it('should pass targets to the ContactSummary script', () => {
    const script = `
    return {
      fields: [contact.name, lineage[0].name],
      cards: [
        { fields: reports[0].type },
        { fields: targetDoc.date_updated }
      ],
    }
    `;

    Settings.returns(Promise.resolve({ contact_summary: script }));
    const contact = { name: 'boa' };
    const reports = [{ type: 'data' }, { type: 'record' }];
    const lineage = [{ name: 'parent' }, { name: 'grandparent' }];
    const targetDoc = { date_updated: 'yesterday', targets: [{ id: 'target', type: 'count' }] };

    return service(contact, reports, lineage, targetDoc).then(contactSummmary => {
      chai.expect(contactSummmary).to.deep.equal({
        fields: ['boa', 'parent'],
        cards: [
          { fields: 'data' },
          { fields: 'yesterday' },
        ]
      });
    });
  });
});
