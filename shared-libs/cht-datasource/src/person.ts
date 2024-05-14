import { Nullable } from './libs/core';
import { isUuidQualifier, UuidQualifier } from './qualifier';
import { DataContext, isLocalDataContext } from './libs/context';
import { Contact } from './libs/contact';
import * as Remote from './remote';
import * as Local from './local';

export namespace V1 {
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

  const assertPersonQualifier: (qualifier: unknown) => asserts qualifier is UuidQualifier = (qualifier: unknown) => {
    if (!isUuidQualifier(qualifier)) {
      throw new Error(`Invalid identifier [${JSON.stringify(qualifier)}].`);
    }
  };

  /**
   * Returns a person for the given qualifier.
   * @param context the current data context
   * @returns the person or <code>null</code> if no person is found for the qualifier
   */
  export const get = (context: DataContext) => async (qualifier: UuidQualifier): Promise<Nullable<Person>> => {
    assertPersonQualifier(qualifier);
    if (isLocalDataContext(context)) {
      return Local.Person.V1.get(context, qualifier);
    }
    return Remote.Person.V1.get(qualifier);
  };
}
