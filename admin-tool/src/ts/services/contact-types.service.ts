import { Injectable } from '@angular/core';
import { SettingsService } from '@admin-tool-services/settings.service';

const contactTypesUtils = require('@medic/contact-types-utils');

/**
 * Represents a single configured contact type as returned by contact-types-utils.
 */
export interface ContactType {
  id: string;
  name_key?: string;
  person?: boolean;
  parents?: string[];
}

/**
 * Provides access to the configured CHT contact type hierarchy.
 * Wraps @medic/contact-types-utils with the Angular SettingsService,
 * mirroring the AngularJS ContactTypes service from the legacy admin app.
 */
@Injectable({
  providedIn: 'root',
})
export class ContactTypesService {
  constructor(private settingsService: SettingsService) {}

  /**
   * Returns all configured contact types.
   */
  async getAll(): Promise<ContactType[]> {
    const settings = await this.settingsService.get();
    return contactTypesUtils.getContactTypes(settings);
  }

  /**
   * Returns all configured place (non-person) contact types.
   */
  async getPlaceTypes(): Promise<ContactType[]> {
    const settings = await this.settingsService.get();
    return contactTypesUtils.getPlaceTypes(settings);
  }

  /**
   * Returns all configured person contact types.
   */
  async getPersonTypes(): Promise<ContactType[]> {
    const settings = await this.settingsService.get();
    return contactTypesUtils.getPersonTypes(settings);
  }

  /**
   * Returns the contact type matching the given id.
   * @param id the contact type id to look up
   */
  async get(id: string): Promise<ContactType | undefined> {
    const settings = await this.settingsService.get();
    return contactTypesUtils.getTypeById(settings, id);
  }

  /**
   * Returns true if the given type id is one of the hardcoded legacy types.
   * @param type the type id to check
   */
  isHardcodedType(type: string): boolean {
    return contactTypesUtils.isHardcodedType(type);
  }

  /**
   * Returns true if all provided places share the same contact type.
   * Used to validate that multiple facility selections are at the same hierarchy level.
   * @param places array of place documents
   */
  isSameContactType(places: any[]): boolean {
    return contactTypesUtils.isSameContactType(places);
  }
}
