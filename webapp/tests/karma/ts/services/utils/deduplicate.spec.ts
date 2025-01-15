import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { DbService } from '@mm-services/db.service';
import { ParseProvider } from '@mm-providers/parse.provider';
import { XmlFormsContextUtilsService } from '@mm-services/xml-forms-context-utils.service';
import { 
  normalizedLevenshteinEq,
  levenshteinEq,
  requestSiblings,
  extractExpression,
  DEFAULT_CONTACT_DUPLICATE_EXPRESSION,
  getDuplicates, 
} from '../../../../../src/ts/services/utils/deduplicate';

describe('Deduplicate', () => {
  let dbService;
  let query;

  beforeEach(() => {
    query = sinon.stub();
    dbService = {
      get: () => ({ query })
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService }
      ]
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('normalizedLevenshteinEq', () => {
    it('should return return a score of 3', () => {
      // Score/distance / maxLength
      // 3 (3 characters need to be added to make str1 = str2) / 5 (Test123 is the larger string)
      // ~  0.42857142857142855
      expect(normalizedLevenshteinEq('Test123', 'Test')).lessThanOrEqual(0.42857142857142855);
    });
  });

  describe('levenshteinEq', () => {
    it('should return return a score of 3', () => {
      expect(levenshteinEq('Test123', 'Test')).to.equal(3);
    });
  });

  describe('requestSiblings', () => {
    it('should return results filtered by parent and contact type', async function () {
      query.resolves({
        offset: 0,
        rows: [
          { id: 'sib1', doc: { _id: 'sib1', name: 'Sibling1', parent: { _id: 'parent1' }, contact_type: 'some_type' } },
          { id: 'sib2', doc: { _id: 'sib2', name: 'Sibling2', parent: { _id: 'parent1' }, contact_type: 'some_type' }},
        ],
        total_rows: 6
      });
      const siblings = await requestSiblings(dbService, 'parent1', 'some_type');
      expect(siblings.length).to.equal(2);
      expect(siblings).to.deep.equal([
        { _id: 'sib1', name: 'Sibling1', parent: { _id: 'parent1' }, contact_type: 'some_type' },
        { _id: 'sib2', name: 'Sibling2', parent: { _id: 'parent1' }, contact_type: 'some_type' },
      ]);
    });
  });

  describe('extractExpression', () => {
    it('should return a default expression when none is provided', () => {
      expect(extractExpression(undefined)).to.equal(DEFAULT_CONTACT_DUPLICATE_EXPRESSION);
    });
  });

  describe('getDuplicates', () => {
    let pipesService;
    let parseProvider;
    beforeEach(() => {
      pipesService = {
        getPipeNameVsIsPureMap: sinon.stub().returns(new Map([['date', { pure: true }]])),
        meta: sinon.stub(),
        getInstance: sinon.stub(),
      };
      parseProvider = new ParseProvider(pipesService);
    });

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
      const results = getDuplicates(
        doc,
        siblings,
        {
          expression: DEFAULT_CONTACT_DUPLICATE_EXPRESSION,
          parseProvider,
          xmlFormsContextUtilsService: new XmlFormsContextUtilsService()
        }
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
