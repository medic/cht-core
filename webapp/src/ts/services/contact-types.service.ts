import { Injectable } from '@angular/core';
import * as contactTypesUtils from '@medic/contact-types-utils';

import { SettingsService } from '@mm-services/settings.service';

@Injectable({
  providedIn: 'root'
})
export class ContactTypesService {
  constructor(private settingsService:SettingsService) {
  }

  static HARDCODED_TYPES() {
    return contactTypesUtils.HARDCODED_TYPES;
  }

  /**
   * Returns a Promise to resolve the configured contact type identified by the given id.
   */
  get(id) {
    return this.settingsService
      .get()
      .then(config => contactTypesUtils.getTypeById(config, id));
  }

  /**
   * Returns a Promise to resolve an array of configured contact types.
   */
  getAll () {
    return this.settingsService
      .get()
      .then(config => contactTypesUtils.getContactTypes(config));
  }

  /**
   * Returns true if the given type is one of the contact types that
   * were hardcoded in old versions.
   */
  isHardcodedType(type) {
    return contactTypesUtils.isHardcodedType(type);
  }

  /**
   * Returns true if the given doc is a contact type.
   */
  includes(doc?) {
    const type = doc && doc.type;
    if (!type) {
      return false;
    }
    return type === 'contact' ||   // configurable hierarchy
      contactTypesUtils.isHardcodedType(type);  // hardcoded
  }

  /**
   * Returns a Promise to resolve an array of child type names for the
   * given type id. If parent is falsey, returns the types with no parent.
   */
  getChildren(parent?) {
    return this.settingsService
      .get()
      .then(config => contactTypesUtils.getChildren(config, parent));
  }

  /**
   * Returns a Promise to resolve all the configured place contact types
   */
  getPlaceTypes() {
    return this.settingsService
      .get()
      .then(config => contactTypesUtils.getPlaceTypes(config));
  }

  /**
   * Returns a Promise to resolve all the configured person contact types
   */
  getPersonTypes() {
    return this.settingsService
      .get()
      .then(config => contactTypesUtils.getPersonTypes(config));
  }

  /**
   * @returns {string} returns the contact type id of a given contact document
   */
  getTypeId(contact?) {
    return contactTypesUtils.getTypeId(contact);
  }

  getTypeById(contactTypes, typeId) {
    return contactTypes?.find(type => type?.id === typeId);
  }

  /**
   *  @returns {boolean} returns whether the provided type is a person type
   */
  isPersonType(type?) {
    return contactTypesUtils.isPersonType(type);
  }

  getLeafPlaceTypes() {
    return this.settingsService
      .get()
      .then(config => contactTypesUtils.getLeafPlaceTypes(config));
  }

  isLeafPlaceType(types, typeId) {
    if (!typeId || !types?.length) {
      return false;
    }
    return !!types.find((type:ContactType) => type?.id === typeId);
  }
}

interface ContactType {
  id:string;
}
