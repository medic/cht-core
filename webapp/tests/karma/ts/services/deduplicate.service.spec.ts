import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { ParseProvider } from '@mm-providers/parse.provider';
import { XmlFormsContextUtilsService } from '@mm-services/xml-forms-context-utils.service';
import { DeduplicateService } from '@mm-services/deduplicate.service';
import { PipesService } from '@mm-services/pipes.service';
import { TelemetryService } from '@mm-services/telemetry.service';

const CONTACT_TYPE = 'some_type';
const CONTACT = {
  _id: 'new',
  name: 'Test',
  date_of_birth: '2000-01-01',
  parent: { _id: 'parent1' },
  contact_type: CONTACT_TYPE,
  reported_date: 1736845534000
};

const SIBLINGS = [
  {
    _id: 'sib1',
    name: 'Test1',
    date_of_birth: '2000-01-31',
    parent: { _id: 'parent1' },
    contact_type: CONTACT_TYPE,
    reported_date: 1736845534001
  },
  {
    _id: 'sib2',
    name: 'Test2',
    date_of_birth: '2000-01-02',
    parent: { _id: 'parent1' },
    contact_type: CONTACT_TYPE,
    reported_date: 1736845534002
  },
  {
    _id: 'sib3',
    name: 'Test3',
    date_of_birth: '2022-01-01',
    parent: { _id: 'parent1' },
    contact_type: CONTACT_TYPE,
    reported_date: 1736845534003
  },
  {
    _id: 'sib4',
    name: 'Testimony',
    date_of_birth: '2000-01-01',
    parent: { _id: 'parent1' },
    contact_type: CONTACT_TYPE,
    reported_date: 1736845534000
  },
];

describe('Deduplicate', () => {
  let service;
  let telemetryService;

  beforeEach(async () => {
    telemetryService = {
      record: sinon.stub(),
    };
    const pipesService: any = {
      getPipeNameVsIsPureMap: sinon.stub().returns(new Map()),
      meta: sinon.stub(),
      getInstance: sinon.stub(),
    };
    TestBed.configureTestingModule({
      providers: [
        ParseProvider,
        { provide: PipesService, useValue: pipesService },
        { provide: TelemetryService, useValue: telemetryService },
        XmlFormsContextUtilsService,
      ]
    });

    service = TestBed.inject(DeduplicateService);
  });

  afterEach(() => sinon.restore());

  describe('getDuplicates', () => {
    it('should return duplicates based on default matching', () => {
      const results = service.getDuplicates(CONTACT, CONTACT_TYPE, SIBLINGS);
      expect(results).to.deep.equal([SIBLINGS[1], SIBLINGS[0]]);
      expect(telemetryService.record.calledOnceWithExactly('enketo:contacts:some_type:duplicates_found', 2)).to.be.true;
    });

    it('should return duplicates based on default matching with invalid expression', () => {
      const results = service.getDuplicates(CONTACT, CONTACT_TYPE, SIBLINGS, { expression: true });
      expect(results).to.deep.equal([SIBLINGS[1], SIBLINGS[0]]);
      expect(telemetryService.record.calledOnceWithExactly('enketo:contacts:some_type:duplicates_found', 2)).to.be.true;
    });

    it('should not return duplicates when the expression is disabled', () => {
      const results = service.getDuplicates(CONTACT, CONTACT_TYPE, SIBLINGS, { disabled: true });
      expect(results).to.be.empty;
      expect(telemetryService.record.calledOnceWithExactly('enketo:contacts:some_type:duplicates_found', 0)).to.be.true;
    });

    it('should return duplicates for custom expression', () => {
      const results = service.getDuplicates(
        CONTACT,
        CONTACT_TYPE,
        SIBLINGS,
        { expression: 'current.reported_date === existing.reported_date' }
      );
      expect(results).to.deep.equal([SIBLINGS[3]]);
      expect(telemetryService.record.calledOnceWithExactly('enketo:contacts:some_type:duplicates_found', 1)).to.be.true;
    });
  });
});
