import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { ParseProvider } from '@mm-providers/parse.provider';
import { XmlFormsContextUtilsService } from '@mm-services/xml-forms-context-utils.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
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
  let chtDatasourceService;
  let getExtensionLib;
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers({ now: new Date('2025-11-11') });
    telemetryService = {
      record: sinon.stub(),
    };
    getExtensionLib = sinon.stub();
    chtDatasourceService = {
      get: sinon.stub().resolves({ v1: { getExtensionLib } }),
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
        { provide: CHTDatasourceService, useValue: chtDatasourceService },
        XmlFormsContextUtilsService,
      ]
    });

    service = TestBed.inject(DeduplicateService);
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  describe('getDuplicates', () => {
    it('should return duplicates based on default matching', async () => {
      const results = await service.getDuplicates(CONTACT, CONTACT_TYPE, SIBLINGS);
      expect(results).to.deep.equal([SIBLINGS[1], SIBLINGS[0]]);
      expect(telemetryService.record.calledOnceWithExactly('enketo:contacts:some_type:duplicates_found', 2)).to.be.true;
    });

    it('should return duplicates based on default matching with invalid expression', async () => {
      const results = await service.getDuplicates(CONTACT, CONTACT_TYPE, SIBLINGS, { expression: true });
      expect(results).to.deep.equal([SIBLINGS[1], SIBLINGS[0]]);
      expect(telemetryService.record.calledOnceWithExactly('enketo:contacts:some_type:duplicates_found', 2)).to.be.true;
    });

    it('should not return duplicates when the expression is disabled', async () => {
      const results = await service.getDuplicates(CONTACT, CONTACT_TYPE, SIBLINGS, { disabled: true });
      expect(results).to.be.empty;
      expect(telemetryService.record.calledOnceWithExactly('enketo:contacts:some_type:duplicates_found', 0)).to.be.true;
    });

    it('should return duplicates for custom expression', async () => {
      const results = await service.getDuplicates(
        CONTACT,
        CONTACT_TYPE,
        SIBLINGS,
        { expression: 'current.reported_date === existing.reported_date' }
      );
      expect(results).to.deep.equal([SIBLINGS[3]]);
      expect(telemetryService.record.calledOnceWithExactly('enketo:contacts:some_type:duplicates_found', 1)).to.be.true;
    });

    it('should return duplicates using extensionLib in expression', async () => {
      const dupCheckFn = sinon.stub();
      dupCheckFn.returns(false);
      dupCheckFn.withArgs(
        sinon.match({ name: CONTACT.name }),
        sinon.match({ name: SIBLINGS[1].name })
      ).returns(true);

      getExtensionLib.withArgs('dupcheck.js').returns(dupCheckFn);

      const results = await service.getDuplicates(
        CONTACT,
        CONTACT_TYPE,
        SIBLINGS,
        { expression: 'extensionLib("dupcheck.js", current, existing)' }
      );

      expect(results).to.deep.equal([SIBLINGS[1]]);
      expect(getExtensionLib.called).to.be.true;
      expect(dupCheckFn.callCount).to.equal(4);
      expect(telemetryService.record.calledOnceWithExactly('enketo:contacts:some_type:duplicates_found', 1)).to.be.true;
    });
  });
});
