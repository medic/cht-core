import { getResource, getResources, postResource, RemoteDataContext } from './libs/data-context';
import { ContactGetUuidsQualifier, isPhoneQualifier, isPhonesQualifier, UuidQualifier } from '../qualifier';
import { Nullable, Page } from '../libs/core';
import * as Contact from '../contact';
import { isContactType, isFreetextType } from '../libs/parameter-validators';

/** @internal */
export namespace v1 {
  const getContact = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/contact');

  const getContactUuids = (remoteContext: RemoteDataContext) => getResources(remoteContext, 'api/v1/contact/uuid');

  // POSTed to the same path for the bulk variant; body carries the array-valued qualifier(s) and
  // pagination. Used when the qualifier shape can't fit a single GET (multi-value lookups).
  // `postResource(path)` is called per-invocation (not at module load) so test stubs can intercept.
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

  /** @internal */
  export const getUuidsPage = (remoteContext: RemoteDataContext) => (
    qualifier: ContactGetUuidsQualifier,
    cursor: Nullable<string>,
    limit: number
  ): Promise<Page<string>> => {
    // Bulk qualifiers go over POST so the array can sit in a JSON body — avoids URL-length limits
    // and the ambiguity of repeated/comma-encoded query params.
    if (isPhonesQualifier(qualifier)) {
      return postContactUuids(remoteContext)({
        phones: qualifier.phones,
        limit,
        ...(cursor ? { cursor } : {}),
      });
    }

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
