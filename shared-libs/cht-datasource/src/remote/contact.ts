import { getResource, getResources, RemoteDataContext } from './libs/data-context';
import { ContactGetUuidsQualifier, isPhoneQualifier, UuidQualifier } from '../qualifier';
import { Nullable, Page } from '../libs/core';
import * as Contact from '../contact';
import { isContactType, isFreetextType } from '../libs/parameter-validators';

/** @internal */
export namespace v1 {
  const getContact = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/contact');

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

  /** @internal */
  export const getUuidsPage = (remoteContext: RemoteDataContext) => (
    qualifier: ContactGetUuidsQualifier,
    cursor: Nullable<string>,
    limit: number
  ): Promise<Page<string>> => {
    const phoneParams: Record<string, string> = isPhoneQualifier(qualifier)
      ? { phone: qualifier.phone }
      : {};
    const freetextParams: Record<string, string> = isFreetextType(qualifier)
      ? { freetext: qualifier.freetext }
      : {};
    const typeParams: Record<string, string> = isContactType(qualifier)
      ? { type: qualifier.contactType }
      : {};

    const queryParams = {
      limit: limit.toString(),
      ...(cursor ? { cursor } : {}),
      ...typeParams,
      ...freetextParams,
      ...phoneParams,
    };
    return getContactUuids(remoteContext)(queryParams);
  };
}
