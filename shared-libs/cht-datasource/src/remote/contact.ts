import { getResource, getResources, RemoteDataContext } from './libs/data-context';
import { ContactTypeQualifier, FreetextQualifier, UuidQualifier } from '../qualifier';
import { Nullable, Page } from '../libs/core';
import * as ContactType from '../contact-types';

/** @internal */
export namespace v1 {
  const getContact = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/contact');

  const getContactUuids = (remoteContext: RemoteDataContext) => getResources(remoteContext, 'api/v1/contact/uuid');

  /** @internal */
  export const get = (remoteContext: RemoteDataContext) => (
    identifier: UuidQualifier
  ): Promise<Nullable<ContactType.v1.Contact>> => getContact(remoteContext)(identifier.uuid);

  /** @internal */
  export const getWithLineage = (
    remoteContext: RemoteDataContext
  ) => (
    identifier: UuidQualifier
  ): Promise<Nullable<ContactType.v1.ContactWithLineage>> => getContact(remoteContext)(identifier.uuid, {
    with_lineage: 'true',
  });

  /** @internal */
  export const getUuidsPage =
    (remoteContext: RemoteDataContext) => (
      qualifier: ContactTypeQualifier | FreetextQualifier,
      cursor: Nullable<string>,
      limit: number
    ): Promise<Page<string>> => {
      let freetext = '';
      let contactType = '';

      if (ContactType.v1.isContactType(qualifier)) {
        contactType = qualifier.contactType;
      }

      if (ContactType.v1.isFreetextType(qualifier)) {
        freetext = qualifier.freetext;
      }

      const queryParams = {
        limit: limit.toString(),
        ...(cursor ? { cursor } : {}),
        ...(contactType ? { type: contactType } : {}),
        ...(freetext ? { freetext: freetext } : {}),
      };
      return getContactUuids(remoteContext)(queryParams);
    };
}
