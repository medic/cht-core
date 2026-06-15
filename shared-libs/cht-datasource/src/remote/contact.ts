import { getResource, getResources, RemoteDataContext } from './libs/data-context';
import { ContactGetUuidsQualifier, isPhoneQualifier, isPhonesQualifier, UuidQualifier } from '../qualifier';
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

  const toQualifierParams = (qualifier: ContactGetUuidsQualifier): Record<string, string> => {
    if (isPhoneQualifier(qualifier)) {
      return { phone: qualifier.phone };
    }
    if (isPhonesQualifier(qualifier)) {
      return { phones: qualifier.phones.join(',') };
    }
    const params: Record<string, string> = {};
    if (isFreetextType(qualifier)) {
      params.freetext = qualifier.freetext;
    }
    if (isContactType(qualifier)) {
      params.type = qualifier.contactType;
    }
    return params;
  };

  /** @internal */
  export const getUuidsPage = (remoteContext: RemoteDataContext) => (
    qualifier: ContactGetUuidsQualifier,
    cursor: Nullable<string>,
    limit: number
  ): Promise<Page<string>> => {
    const queryParams = {
      limit: limit.toString(),
      ...(cursor ? { cursor } : {}),
      ...toQualifierParams(qualifier),
    };
    return getContactUuids(remoteContext)(queryParams);
  };
}
