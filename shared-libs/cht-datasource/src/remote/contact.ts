import { getPageQueryParams, getResource, getResources, RemoteDataContext } from './libs/data-context';
import { ContactTypeQualifier, FreetextQualifier, IdsQualifier, UuidQualifier } from '../qualifier';
import { Nullable, Page } from '../libs/core';
import * as Contact from '../contact';
import { isContactType, isFreetextType } from '../libs/parameter-validators';

/** @internal */
export namespace v1 {
  const getContact = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/contact');

  const getContacts = (remoteContext: RemoteDataContext) => getResources(remoteContext, 'api/v1/contact');

  const getContactUuids = (remoteContext: RemoteDataContext) => getResources(remoteContext, 'api/v1/contact/uuid');

  /** @internal */
  export const get = (remoteContext: RemoteDataContext) => (
    identifier: UuidQualifier
  ): Promise<Nullable<Contact.v1.Contact>> => getContact(remoteContext)(identifier.uuid);

  /** @internal */
  export const getWithLineage = (
    remoteContext: RemoteDataContext
  ) => (
    identifier: UuidQualifier
  ): Promise<Nullable<Contact.v1.ContactWithLineage>> => getContact(remoteContext)(identifier.uuid, {
    with_lineage: 'true',
  });

  const getContactQueryParams = (
    qualifier: ContactTypeQualifier | FreetextQualifier,
    cursor: Nullable<string>,
    limit: number
  ): Record<string, string> => {
    const freetextParams: Record<string, string> = isFreetextType(qualifier) ? { freetext: qualifier.freetext } : {};
    const typeParams: Record<string, string> = isContactType(qualifier) ? { type: qualifier.contactType } : {};
    return getPageQueryParams(cursor, limit, { ...typeParams, ...freetextParams });
  };

  /** @internal */
  export const getUuidsPage = (remoteContext: RemoteDataContext) => (
    qualifier: ContactTypeQualifier | FreetextQualifier,
    cursor: Nullable<string>,
    limit: number
  ): Promise<Page<string>> => getContactUuids(remoteContext)(getContactQueryParams(qualifier, cursor, limit));

  /** @internal */
  export const getPage = (remoteContext: RemoteDataContext) => (
    // When an IdsQualifier is provided the requested contacts are returned; otherwise all contacts are returned.
    qualifier: IdsQualifier | undefined,
    cursor: Nullable<string>,
    limit: number
  ): Promise<Page<Contact.v1.Contact>> => {
    const idsParams: Record<string, string> = qualifier ? { ids: qualifier.ids.join(',') } : {};
    return getContacts(remoteContext)(getPageQueryParams(cursor, limit, idsParams));
  };
}
