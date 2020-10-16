import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { HydrateContactNamesService } from '@mm-services/hydrate-contact-names.service';
import { GetSummariesService } from '@mm-services/get-summaries.service';

describe('HydrateContactNames service', () => {
  let service:HydrateContactNamesService;
  let GetSummaries;

  beforeEach(() => {
    GetSummaries = sinon.stub();
    TestBed.configureTestingModule({
      providers: [
        { provide: GetSummariesService, useValue: { get: GetSummaries } },
      ]
    });

    service = TestBed.inject(HydrateContactNamesService);
  });

  afterEach(() => {
    sinon.restore();
  });


  it('returns empty array when given no summaries', () => {
    return service.get([]).then(actual => {
      expect(actual).to.deep.equal([]);
    });
  });

  it('does nothing when summaries not found', () => {
    const given = [{
      contact: 'a',
      lineage: [ 'b', 'c' ]
    }];
    GetSummaries.resolves([]);
    return service.get(given).then(actual => {
      expect(actual).to.deep.equal(given);
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
    GetSummaries.resolves(summaries);
    return service.get(given).then(actual => {
      expect(actual[0].contact).to.equal('arnie');
      expect(actual[0].lineage.length).to.equal(2);
      expect(actual[0].lineage[0]).to.equal(null);
      expect(actual[0].lineage[1]).to.equal('charlie');
      expect(actual[1].contact).to.equal('dannie');
      expect(actual[1].lineage).to.equal(undefined);
      expect(GetSummaries.callCount).to.equal(1);
      expect(GetSummaries.args[0][0]).to.deep.equal(['a', 'b', 'c', 'd' ]);
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
    return service.get(given).then(result => {
      expect(result[0].muted).to.equal(true);
      expect(result[1].muted).to.equal(undefined);
      expect(result[2].muted).to.equal(true);
      expect(result[3].muted).to.equal(false);
    });
  });
});
