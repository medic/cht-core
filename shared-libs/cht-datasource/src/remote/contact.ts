import { getResource, getResources, postResource, RemoteDataContext } from './libs/data-context';
import {
  ContactTypeQualifier,
  FreetextQualifier,
  IdsQualifier,
  isContactTypeQualifier,
  isIdsQualifier,
  isPhonesQualifier,
  PhonesQualifier,
  UuidQualifier
} from '../qualifier';
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

  const postContactSummary = postResource('api/v1/contact/summary');

  /** @internal */
  export const getSummaries = (
    remoteContext: RemoteDataContext
  ) => ({ ids }: IdsQualifier): Promise<Contact.v1.ContactSummary[]> => {
    return postContactSummary(remoteContext)({ ids });
  };

  /** @internal */
  export const getUuidsPage = (remoteContext: RemoteDataContext) => (
    qualifier: ContactTypeQualifier | FreetextQualifier | PhonesQualifier,
    cursor: Nullable<string>,
    limit: number
  ): Promise<Page<string>> => {
    // Comma-joined rather than repeated, matching how `ids` is sent on `api/v1/contact`. Phone numbers
    // are not normalized, so a number containing a comma could not round-trip; the view key is the raw
    // `doc.phone` value and phone numbers do not contain commas.
    const phoneParams: Record<string, string> = isPhonesQualifier(qualifier)
      ? { phone: qualifier.phones.join(',') }
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

  /** @internal */
  export const getPage = (remoteContext: RemoteDataContext) => (
    qualifier: ContactTypeQualifier | IdsQualifier | PhonesQualifier,
    cursor: Nullable<string>,
    limit: number
  ): Promise<Page<Contact.v1.Contact>> => {
    const idsParams: Record<string, string> = isIdsQualifier(qualifier)
      ? { ids: qualifier.ids.join(',') }
      : {};
    // Comma-joined like `ids` above, for the same reason: see getUuidsPage.
    const phoneParams: Record<string, string> = isPhonesQualifier(qualifier)
      ? { phone: qualifier.phones.join(',') }
      : {};
    const typeParams: Record<string, string> = isContactTypeQualifier(qualifier)
      ? { type: qualifier.contactType }
      : {};

    const queryParams = {
      limit: limit.toString(),
      ...(cursor ? { cursor } : {}),
      ...typeParams,
      ...idsParams,
      ...phoneParams,
    };
    return getContacts(remoteContext)(queryParams);
  };
}
