import { Nullable } from './libs/core';
import { isUuidQualifier, UuidQualifier } from './qualifier';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import { Contact } from './libs/contact';
import * as Remote from './remote';
import * as Local from './local';

export namespace V1 {
  /** @internal */
  interface AbstractPerson {
    date_of_birth?: Date;
    phone?: string;
    patient_id?: string;
    sex?: string;
  }

  /**
   * Immutable data about a person contact.
   */
  export interface Person extends Contact, AbstractPerson { }

  /** @internal */
  const assertPersonQualifier: (qualifier: unknown) => asserts qualifier is UuidQualifier = (qualifier: unknown) => {
    if (!isUuidQualifier(qualifier)) {
      throw new Error(`Invalid identifier [${JSON.stringify(qualifier)}].`);
    }
  };

  /**
   * Returns a person for the given qualifier.
   * @param context the current data context
   * @returns the person or `null` if no person is found for the qualifier
   * @throws Error if the provided context or qualifier is invalid
   */
  export const get = (context: DataContext) => {
    assertDataContext(context);
    const getPerson = adapt(context, Local.Person.V1.get, Remote.Person.V1.get);
    return async (qualifier: UuidQualifier): Promise<Nullable<Person>> => {
      assertPersonQualifier(qualifier);
      return getPerson(qualifier);
    };
  };
}
