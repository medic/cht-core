describe('HydrateContactNames service', () => {

  'use strict';

  let service,
      query;

  beforeEach(() => {
    query = sinon.stub();
    module('inboxApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({ query: query }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject($injector => service = $injector.get('HydrateContactNames'));
  });

  afterEach(() => {
    KarmaUtils.restore(query);
  });

  it('returns empty array when given no summaries', () => {
    return service([]).then(actual => {
      chai.expect(actual).to.deep.equal([]);
    });
  });

  it('does nothing when summaries not found', () => {
    const given = [{
      contact: 'a',
      lineage: [ 'b', 'c' ]
    }];
    query.returns(Promise.resolve({ rows: [] }));
    return service(given).then(actual => {
      chai.expect(actual).to.deep.equal(given);
    });
  });

  it('replaces ids with names', () => {
    const given = [
      { contact: 'a', lineage: [ 'b', 'c' ] },
      { contact: 'd' }
    ];
    const summaries = [
      { id: 'a', value: { name: 'arnie', age: 15 } },
      { id: 'c', value: { name: 'charlie', colour: 'green' } },
      { id: 'd', value: { name: 'dannie' } }
    ];
    query.returns(Promise.resolve({ rows: summaries }));
    return service(given).then(actual => {
      chai.expect(actual[0].contact).to.equal('arnie');
      chai.expect(actual[0].lineage.length).to.equal(2);
      chai.expect(actual[0].lineage[0]).to.equal(null);
      chai.expect(actual[0].lineage[1]).to.equal('charlie');
      chai.expect(actual[1].contact).to.equal('dannie');
      chai.expect(actual[1].lineage).to.equal(undefined);
      chai.expect(query.callCount).to.equal(1);
      chai.expect(query.args[0][0]).to.equal('medic-client/doc_summaries_by_id');
      chai.expect(query.args[0][1]).to.deep.equal({ keys: ['a', 'b', 'c', 'd' ] });
    });
  });

});
