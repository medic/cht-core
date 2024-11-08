import { Doc } from './libs/doc';
import {DataObject, Nullable} from './libs/core';
import {adapt, assertDataContext, DataContext} from './libs/data-context';
import * as Remote from './remote';
import * as Local from './local';
import {isUuidQualifier, UuidQualifier} from './qualifier';
import {InvalidArgumentError} from './libs/error';

/** */
export namespace v1 {
  /**
   * A report document.
   */
  export interface Report extends Doc {
    readonly form: string;
    readonly reported_date: Date;
    readonly fields: DataObject;
  }

  const assertReportQualifier: (qualifier: unknown) => asserts qualifier is UuidQualifier = (qualifier: unknown) => {
    if (!isUuidQualifier(qualifier)) {
      throw new InvalidArgumentError(`Invalid identifier [${JSON.stringify(qualifier)}].`);
    }
  };

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
      assertReportQualifier(qualifier);
      return fn(qualifier);
    };
    return curriedFn;
  };
}
