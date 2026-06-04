import { getResource, getResources, postResource, RemoteDataContext } from './libs/data-context';
import { ContactGetUuidsQualifier, isPhoneQualifier, isPhonesQualifier, UuidQualifier } from '../qualifier';
import { Nullable, Page } from '../libs/core';
import * as Contact from '../contact';
import { isContactType, isFreetextType } from '../libs/parameter-validators';

/** @internal */
export namespace v1 {
  const getContact = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/contact');

  const getContactUuids = (remoteContext: RemoteDataContext) => getResources(remoteContext, 'api/v1/contact/uuid');

  const postContactUuids = (
    remoteContext: RemoteDataContext
  ) => postResource('api/v1/contact/uuid')(remoteContext);

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
    const cursorParam: Record<string, string> = cursor ? { cursor } : {};
    if (isPhonesQualifier(qualifier)) {
      return postContactUuids(remoteContext)({ phones: qualifier.phones, limit, ...cursorParam });
    }

    const queryParams = {
      limit: limit.toString(),
      ...cursorParam,
      ...toQualifierParams(qualifier),
    };
    return getContactUuids(remoteContext)(queryParams);
  };
}
