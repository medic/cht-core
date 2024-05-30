import { Nullable } from './libs/core';
import { isUuidQualifier, UuidQualifier } from './qualifier';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import { Contact, NormalizedParent } from './libs/contact';
import * as Remote from './remote';
import * as Local from './local';
import * as Place from './place';

export namespace v1 {
  /**
   * Immutable data about a person contact.
   */
  export interface Person extends Contact {
    readonly date_of_birth?: Date;
    readonly phone?: string;
    readonly patient_id?: string;
    readonly sex?: string;
  }

  /**
   * Immutable data about a person contact, including the full records of the parent place lineage.
   */
  export interface PersonWithLineage extends Person {
    readonly parent?: Place.v1.PlaceWithLineage | NormalizedParent,
  }

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
    const getPerson = adapt(context, Local.Person.v1.get, Remote.Person.v1.get);
    return async (qualifier: UuidQualifier): Promise<Nullable<Person>> => {
      assertPersonQualifier(qualifier);
      return getPerson(qualifier);
    };
  };
}
