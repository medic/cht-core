import { DataObject, getPagedGenerator, isIdentifiable, isRecord, NormalizedParent, Nullable, Page } from './libs/core';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import { Doc } from './libs/doc';
import * as Local from './local';
import { FreetextQualifier, UuidQualifier } from './qualifier';
import * as Remote from './remote';
import { DEFAULT_IDS_PAGE_LIMIT } from './libs/constants';
import { assertCursor, assertFreetextQualifier, assertLimit, assertUuidQualifier } from './libs/parameter-validators';
import * as Input from './input';
import { InvalidArgumentError } from './libs/error';
import * as Contact from './contact';

/** */
export namespace v1 {
  /**
   * A report document.
   */
  export interface Report extends Doc {
    readonly type: string
    readonly form: string
    readonly reported_date?: number
    readonly fields?: DataObject
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
     * Creates a new report record.
     * @param input input fields for creating a report
     * @returns the created report record
     * @throws InvalidArgumentError if `form` is not provided or is not a supported form id
     * @throws InvalidArgumentError if `contact` is not provided or is not the identifier of a valid contact
     * @throws InvalidArgumentError if the provided `reported_date` is not in a valid format. Valid formats are
     * 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', or <unix epoch>.
     */
    const curriedFn = async (input: Input.v1.ReportInput): Promise<Report> => {
      if (!isRecord(input)) {
        throw new InvalidArgumentError('Report data not provided.');
      }
      return fn(input);
    };
    return curriedFn;
  };

  /**
   * Returns a function for updating a report from the given data context.
   * @param context the current data context
   * @returns a function for updating a report
   * @throws Error if a data context is not provided
   */
  export const update = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Report.v1.update, Remote.Report.v1.update);

    /**
     * Updates an existing report to have the provided data.
     * @param updated the updated report data. The complete data for the report must be provided. Existing fields not
     * included in the updated data will be removed from the report. If the provided parent/patient/place lineage is
     * hydrated (e.g. for a {@link ReportWithLineage}), the lineage will be properly dehydrated before being stored.
     * @returns the updated report with the new `_rev` value
     * @throws InvalidArgumentError if `_id` is not provided
     * @throws ResourceNotFoundError if `_id does not identify an existing report
     * @throws InvalidArgumentError if `_rev` is not provided or does not match the report's current `_rev` value
     * @throws InvalidArgumentError if `form` is not provided or is not a supported form id
     * @throws InvalidArgumentError if `contact` is not provided or is not a valid contact
     * @throws InvalidArgumentError if any of the following read-only properties are changed: `reported_date`, `type`
     */
    const curriedFn = async <T extends Report | ReportWithLineage>(
      updated: Input.v1.UpdateReportInput<T>
    ): Promise<T> => {
      if (!isIdentifiable(updated)) {
        throw new InvalidArgumentError('Invalid report update input');
      }
      return fn(updated);
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
