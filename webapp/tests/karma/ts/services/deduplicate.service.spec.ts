import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { DbService } from '@mm-services/db.service';
import { ParseProvider } from '@mm-providers/parse.provider';
import { XmlFormsContextUtilsService } from '@mm-services/xml-forms-context-utils.service';
import { DeduplicateService } from '@mm-services/deduplicate.service';

describe('Deduplicate', () => {
  let query;
  let service;

  beforeEach(async () => {
    query = sinon.stub();
    const dbService = {
      get: () => ({ query })
    };

    const pipesService: any = {
      getPipeNameVsIsPureMap: sinon.stub().returns(new Map([['date', { pure: true }]])),
      meta: sinon.stub(),
      getInstance: sinon.stub(),
    };
    const parserProvider = new ParseProvider(pipesService);
    const xmlFormsContextUtilsService = new XmlFormsContextUtilsService();

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: ParseProvider, useValue: parserProvider },
        { provide: XmlFormsContextUtilsService, useValue: xmlFormsContextUtilsService },
      ]
    });

    service = TestBed.inject(DeduplicateService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getDuplicates', () => {
    it('should return duplicates based on default matching', () => {
      const doc = {
        _id: 'new',
        name: 'Test',
        parent: { _id: 'parent1' },
        contact_type: 'some_type',
        reported_date: 1736845534000
      };
      const siblings = [
        {
          _id: 'sib1',
          name: 'Test1',
          parent: { _id: 'parent1' },
          contact_type: 'some_type',
          reported_date: 1736845534000
        },
        {
          _id: 'sib2',
          name: 'Test2',
          parent: { _id: 'parent1' },
          contact_type: 'some_type',
          reported_date: 1736845534000
        },
        {
          _id: 'sib3',
          name: 'Test the things',
          parent: { _id: 'parent1' },
          contact_type: 'some_type',
          reported_date: 1736845534000
        },
        {
          _id: 'sib4',
          name: 'Testimony',
          parent: { _id: 'parent1' },
          contact_type: 'some_type',
          reported_date: 1736845534000
        },
      ];
      const results = service.getDuplicates(
        doc,
        siblings,
        'levenshteinEq(current.name, existing.name, 3)',
      );
      expect(results.length).equal(2);
      expect(results).to.deep.equal([
        {
          _id: 'sib1',
          name: 'Test1',
          parent: { _id: 'parent1' },
          contact_type: 'some_type',
          reported_date: 1736845534000
        },
        {
          _id: 'sib2',
          name: 'Test2',
          parent: { _id: 'parent1' },
          contact_type: 'some_type',
          reported_date: 1736845534000
        },
      ]);
    });
  });
});
