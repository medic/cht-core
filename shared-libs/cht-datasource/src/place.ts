import { Contact, NormalizedParent } from './libs/contact';
import * as Person from './person';

/** */
export namespace v1 {

  /**
   * Immutable data about a place contact.
   */
  export interface Place extends Contact {
    readonly contact?: NormalizedParent,
    readonly place_id?: string,
  }

  /**
   * Immutable data about a place contact, including the full records of the parent place lineage and the primary
   * contact for the place.
   */
  export interface PlaceWithLineage extends Place {
    readonly contact?: Person.v1.PersonWithLineage | NormalizedParent,
    readonly parent?: PlaceWithLineage | NormalizedParent,
  }
}
