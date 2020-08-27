describe('HydrateContactNames service', () => {

  'use strict';

  let service;
  let GetSummaries;

  beforeEach(() => {
    GetSummaries = sinon.stub();
    module('adminApp');
    module($provide => {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('GetSummaries', GetSummaries);
    });
    inject($injector => service = $injector.get('HydrateContactNames'));
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
    GetSummaries.returns(Promise.resolve([]));
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
      { _id: 'a', name: 'arnie', age: 15 },
      { _id: 'c', name: 'charlie', colour: 'green' },
      { _id: 'd', name: 'dannie' }
    ];
    GetSummaries.returns(Promise.resolve(summaries));
    return service(given).then(actual => {
      chai.expect(actual[0].contact).to.equal('arnie');
      chai.expect(actual[0].lineage.length).to.equal(2);
      chai.expect(actual[0].lineage[0]).to.equal(null);
      chai.expect(actual[0].lineage[1]).to.equal('charlie');
      chai.expect(actual[1].contact).to.equal('dannie');
      chai.expect(actual[1].lineage).to.equal(undefined);
      chai.expect(GetSummaries.callCount).to.equal(1);
      chai.expect(GetSummaries.args[0][0]).to.deep.equal(['a', 'b', 'c', 'd' ]);
    });
  });

  it('searches for muted state in lineage', () => {
    const given = [
      { contact: 'a', lineage: [ 'b', 'c' ] },
      { contact: 'd' },
      { contact: 'c', muted: true },
      { contact: 'e', lineage: [ 'f', 'g' ] }
    ];

    const summaries = [
      { _id: 'a', name: 'arnie' },
      { _id: 'b', name: 'betty' },
      { _id: 'c', name: 'carol', muted: true },
      { _id: 'd', name: 'daisy', muted: true },
      { _id: 'e', name: 'elena' },
      { _id: 'f', name: 'felicity' },
      { _id: 'g', name: 'groot' }
    ];

    GetSummaries.resolves(summaries);
    return service(given).then(result => {
      chai.expect(result[0].muted).to.equal(true);
      chai.expect(result[1].muted).to.equal(undefined);
      chai.expect(result[2].muted).to.equal(true);
      chai.expect(result[3].muted).to.equal(false);
    });
  });

});
