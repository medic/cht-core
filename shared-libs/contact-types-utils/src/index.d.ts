export interface ContactType {
  readonly id: string,
  readonly name_key?: string,
  readonly group_key: string,
  readonly create_key: string,
  readonly edit_key: string,
  readonly primary_contact_key?: string,
  readonly parents?: string[],
  readonly icon: string,
  readonly create_form: string,
  readonly edit_form?: string,
  readonly count_visits?: boolean,
  readonly person?: boolean,
  [key: string]: unknown;
}

export function getTypeId(doc: Record<string, unknown>): string | undefined;
export function getTypeById(config: Record<string, unknown>, typeId: string): ContactType | null;
export function isPersonType(type: Record<string, unknown>): boolean;
export function isPlaceType(type: Record<string, unknown>): boolean;
export function hasParents(type: Record<string, unknown>): boolean;
export function isParentOf(parentType?: string | Record<string, unknown>, childType?: Record<string, unknown>): boolean;
export function getLeafPlaceTypes(config: Record<string, unknown>): ContactType[];
export function getContactType(
  config: Record<string, unknown>,
  contact: Record<string, unknown>
): ContactType | undefined;
export function isPerson(config: Record<string, unknown>, contact: Record<string, unknown>): boolean;
export function isPlace(config: Record<string, unknown>, contact: Record<string, unknown>): boolean;
export function isContact(config: Record<string, unknown>, contact: Record<string, unknown>): boolean;
export function isHardcodedType(type: string): boolean;
export declare const HARDCODED_TYPES: string[];
export function getContactTypes(config?: Record<string, unknown>): ContactType[];
export function getContactTypeIds(config?: Record<string, unknown>): string[];
export function getChildren(
  config?: Record<string, unknown>,
  parentType?: string | Record<string, unknown>
): ContactType[];
export function getPlaceTypes(config?: Record<string, unknown>): ContactType[];
export function getPersonTypes(config?: Record<string, unknown>): ContactType[];
