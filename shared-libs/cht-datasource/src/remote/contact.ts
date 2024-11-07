import { getResource, RemoteDataContext } from './libs/data-context';
import { UuidQualifier } from '../qualifier';
import { Nullable } from '../libs/core';
import * as Contact from '../contact';

/** @internal */
export namespace v1 {
  const getContact = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/contact');

  /** @internal */
  export const get =
    (remoteContext: RemoteDataContext) => (
      identifier: UuidQualifier
    ): Promise<Nullable<Contact.v1.Contact>> => getContact(remoteContext)(identifier.uuid);

  /** @internal */
  export const getWithLineage = (remoteContext: RemoteDataContext) => (
    identifier: UuidQualifier
  ): Promise<Nullable<Contact.v1.ContactWithLineage>> => getContact(remoteContext)(
    identifier.uuid,
    { with_lineage: 'true' }
  );
}
