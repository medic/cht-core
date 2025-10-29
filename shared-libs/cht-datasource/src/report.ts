import {
  DataObject,
  getPagedGenerator,
  isRecord,
  NormalizedParent,
  Nullable,
  Page
} from './libs/core';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import { Doc } from './libs/doc';
import * as Local from './local';
import { FreetextQualifier, UuidQualifier } from './qualifier';
import * as Remote from './remote';
import { DEFAULT_IDS_PAGE_LIMIT } from './libs/constants';
import {
  assertCursor,
  assertFreetextQualifier,
  assertLimit,
  assertUuidQualifier
} from './libs/parameter-validators';
import { ReportInput } from './input';
import { InvalidArgumentError } from './libs/error';
import * as Contact from './contact';

/** */
export namespace v1 {
  /**
   * A report document.
   */
  export interface Report extends Doc {
    readonly form: string;
    readonly reported_date: Date;
    readonly fields: DataObject;
    readonly contact?: NormalizedParent
  }

  /**
   * A report document with lineage information.
   */
  export interface ReportWithLineage extends Report {
    readonly contact?: Contact.v1.ContactWithLineage | NormalizedParent;
    readonly patient?: Contact.v1.ContactWithLineage | NormalizedParent;
    readonly place?: Contact.v1.ContactWithLineage | NormalizedParent;
  }


  /**
   * Returns a function for retrieving a report from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a report
   * @throws Error if a data context is not provided
   */
  export const get = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Report.v1.get, Remote.Report.v1.get);

    /**
     * Returns a report for the given qualifier.
     * @param qualifier identifier for the report to retrieve
     * @returns the report or `null` if no report is found for the qualifier
     * @throws Error if the qualifier is invalid
     */
    const curriedFn = async (
      qualifier: UuidQualifier
    ): Promise<Nullable<Report>> => {
      assertUuidQualifier(qualifier);
      return fn(qualifier);
    };
    return curriedFn;
  };

  /**
   * Returns a function for retrieving a paged array of report identifiers from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a paged array of report identifiers
   * @throws Error if a data context is not provided
   * @see {@link getUuids} which provides the same data, but without having to manually account for paging
   */
  export const getUuidsPage = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Report.v1.getUuidsPage, Remote.Report.v1.getUuidsPage);

    /**
     * Returns an array of report identifiers for the provided page specifications.
     * @param qualifier the limiter defining which identifiers to return
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of identifiers to return. Default is 10000.
     * @returns a page of report identifiers for the provided specification
     * @throws InvalidArgumentError if no qualifier is provided or if the qualifier is invalid
     * @throws InvalidArgumentError if the provided `limit` value is `<=0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    const curriedFn = async (
      qualifier: FreetextQualifier,
      cursor: Nullable<string> = null,
      limit: number | `${number}` = DEFAULT_IDS_PAGE_LIMIT
    ): Promise<Page<string>> => {
      assertFreetextQualifier(qualifier);
      assertCursor(cursor);
      assertLimit(limit);

      return fn(qualifier, cursor, Number(limit));
    };
    return curriedFn;
  };

  /**
   * Returns a function for getting a generator that fetches report identifiers from the given data context.
   * @param context the current data context
   * @returns a function for getting a generator that fetches report identifiers
   * @throws Error if a data context is not provided
   */
  export const getUuids = (context: DataContext): typeof curriedGen => {
    assertDataContext(context);
    const getPage = context.bind(v1.getUuidsPage);

    /**
     * Returns a generator for fetching all report identifiers that match the given qualifier
     * @param qualifier the limiter defining which identifiers to return
     * @returns a generator for fetching all report identifiers that match the given qualifier
     * @throws InvalidArgumentError if no qualifier is provided or if the qualifier is invalid
     */
    const curriedGen = (
      qualifier: FreetextQualifier
    ): AsyncGenerator<string, null> => {
      assertFreetextQualifier(qualifier);

      return getPagedGenerator(getPage, qualifier);
    };
    return curriedGen;
  };

  /**
   * Returns a function for creating a report from the given data context.
   * @param context the current data context
   * @returns a function for creating a report.
   * @throws Error if a data context is not provided
   */
  export const create = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Report.v1.create, Remote.Report.v1.create);
    /**
     * Returns a report doc.
     * @param input input to create the report doc.
     * @returns the created report doc.
     * @throws InvalidArgumentError if input is not of valid type.
     * @throws Error if input is not an object
     * @throws Error if type is not provided or is empty
     * @throws Error if form is not provided or is empty
     * @throws Error if contact is not provided or is empty
     * @throws Error if reported_date is not in a valid format.
     * Valid formats are 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', or <unix epoch>.
     */
    const curriedFn = async (input: ReportInput): Promise<Report> => {
      return fn(input);
    };
    return curriedFn;
  };

  /**
   * Returns a function to update a report from the given data context.
   * @param context the current data context
   * @returns a function for updating a report.
   * @throws Error if a data context is not provided
   */
  export const update = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Report.v1.update, Remote.Report.v1.update);

    /**
     * Returns the updated Report Doc for the provided updateInput
     * @param updateInput the Doc containing updated fields
     * @returns updated report Doc
     * @throws InvalidArgumentError if updateInput has changes in immutable fields
     * @throws InvalidArgumentError if updateInput does not contain required fields
     * @throws InvalidArgumentError if updateInput fields are not of expected type
     */
    const curriedFn = async (updateInput: unknown): Promise<Report> => {
      if (!isRecord(updateInput)) {
        throw new InvalidArgumentError('Invalid report update input');
      }
      return fn(updateInput);
    };
    return curriedFn;
  };

  /**
   * Returns a function for retrieving a report with lineage from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a report with lineage
   * @throws Error if a data context is not provided
   */
  export const getWithLineage = (context: DataContext): typeof curriedFnWithLineage => {
    assertDataContext(context);
    const fn = adapt(context, Local.Report.v1.getWithLineage, Remote.Report.v1.getWithLineage);

    /**
     * Returns a report with lineage for the given qualifier.
     * @param qualifier identifier for the report to retrieve
     * @returns the report with lineage or `null` if no report is found for the qualifier
     * @throws Error if the qualifier is invalid
     */
    const curriedFnWithLineage = async (
      qualifier: UuidQualifier
    ): Promise<Nullable<ReportWithLineage>> => {
      assertUuidQualifier(qualifier);
      return await fn(qualifier);
    };
    return curriedFnWithLineage;
  };
}
