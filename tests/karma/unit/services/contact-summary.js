describe('ContactSummary service', () => {

  'use strict';

  let service,
      Settings = sinon.stub();

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
    Settings.returns(KarmaUtils.mockPromise(null, { contact_summary: '' }));
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
    Settings.returns(KarmaUtils.mockPromise(null, { contact_summary: script }));
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
    Settings.returns(KarmaUtils.mockPromise(null, { contact_summary: script }));
    const contact = {};
    const reports = [];
    return service(contact, reports).then(actual => {
      chai.expect(actual.fields.length).to.equal(1);
      chai.expect(actual.fields[0].label).to.equal('Notes');
      chai.expect(actual.fields[0].value).to.equal('olleH');
      chai.expect(actual.cards.length).to.equal(0);
    });
  });
});
