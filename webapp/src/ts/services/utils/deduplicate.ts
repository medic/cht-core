import * as Levenshtein from 'levenshtein';
import { DbService } from '@mm-services/db.service';
import { ParseProvider } from '@mm-providers/parse.provider';
import { XmlFormsContextUtilsService } from '@mm-services/xml-forms-context-utils.service';


export type Doc = { _id: string; name: string; reported_date: number;[key: string]: any };

const DEFAULT_CONTACT_DUPLICATE_EXPRESSION = 'levenshteinEq(3, current.name, existing.name)';

// Normalize the distance by dividing by the length of the longer string. 
// This can make the metric more adaptable across different string lengths
const normalizedLevenshteinEq = function (str1: string, str2: string) {
  const distance = levenshteinEq(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  return (maxLen === 0) ? 0 : (distance / maxLen);
};

// The Levenshtein distance is a measure of the number of edits (insertions, deletions, and substitutions) 
// required to change one string into another.
const levenshteinEq = function (str1: string, str2: string): number {
  return new Levenshtein(str1, str2).distance;
};


const requestSiblings = async function (dbService: DbService, parentId: string, contactType: string) {
  const siblings: Doc[] = [];
  const results = parentId && contactType && await dbService.get().query('medic-client/contacts_by_parent', {
    startkey: [parentId, contactType],
    endkey: [parentId, contactType, {}],
    include_docs: true
  });
  
  if (results) {
    // Desc order - reverse order by switching props
    siblings.push(...results.rows.map((row: { doc: Doc }) => row.doc)
      .sort((a: Doc, b: Doc) => (b.reported_date || 0) - (a.reported_date || 0)));
  }
  return siblings;
};

export type DuplicateCheck = { expression?: string; disabled?: boolean } | undefined;
const extractExpression = function (duplicateCheck: DuplicateCheck) {
  // eslint-disable-next-line eqeqeq
  if (duplicateCheck != null) {
    if (Object.prototype.hasOwnProperty.call(duplicateCheck, 'expression')) {
      return duplicateCheck.expression as string;
    } else if (Object.prototype.hasOwnProperty.call(duplicateCheck, 'disabled') && duplicateCheck.disabled) {
      return null; // No duplicate check should be performed
    }
  }

  return DEFAULT_CONTACT_DUPLICATE_EXPRESSION;
};

const getDuplicates = function (
  doc: Doc,
  siblings: Array<Doc>,
  config: {
    expression: string;
    parseProvider: ParseProvider;
    xmlFormsContextUtilsService: XmlFormsContextUtilsService;
  }
) {
  const { expression, parseProvider, xmlFormsContextUtilsService } = config;
  // eslint-disable-next-line eqeqeq
  const _siblings: Doc[] = siblings.filter((s) => !((doc._id != null && s._id === doc._id)));
  // Remove the currently edited doc from the sibling list

  const duplicates: Array<Doc> = [];
  for (const sibling of _siblings) {
    const parsed = parseProvider.parse(expression);
    const test = parsed(xmlFormsContextUtilsService, {
      current: doc,
      existing: sibling,
    });
    if (test) {
      duplicates.push(sibling);
    }
  }

  return duplicates;
};

export {
  normalizedLevenshteinEq,
  levenshteinEq,

  requestSiblings,
  extractExpression,
  getDuplicates,

  DEFAULT_CONTACT_DUPLICATE_EXPRESSION
};
