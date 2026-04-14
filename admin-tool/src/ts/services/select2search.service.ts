import { Injectable } from '@angular/core';
import { CHTDatasourceService } from '@admin-tool-services/cht-datasource.service';
import { ContactTypesService } from '@admin-tool-services/contact-types.service';

const PAGE_SIZE = 20;

export interface Select2Doc {
  id: string;
  text: string;
}

export interface Select2Options {
  /** Pre-select this UUID when the dropdown is initialised. */
  initialValue?: string;
}

/**
 * Initialises a Select2 dropdown backed by the CHT datasource.
 *
 * Two modes are supported:
 *  - place: searches all configured place types via datasource.v1.place.getPageByType
 *  - person: searches all configured person types via datasource.v1.person.getPageByType
 *
 * The datasource facade methods (getPageByType, getByUuid) accept plain strings —
 * they wrap Qualifier internally. Do NOT pass Qualifier objects here.
 *
 * Select2 and jQuery are loaded globally via angular.json scripts.
 */
@Injectable({
  providedIn: 'root',
})
export class Select2SearchService {
  constructor(
    private chtDatasourceService: CHTDatasourceService,
    private contactTypesService: ContactTypesService,
  ) {}

  /**
   * Initialises a place (facility) Select2 on the given native element.
   * Searches all configured place contact types, paged via the CHT datasource.
   * @param el the native <select> element to enhance
   * @param options optional initial value
   */
  async initPlaceSelect(
    el: HTMLSelectElement,
    options: Select2Options = {},
  ): Promise<void> {
    const chtApi = await this.chtDatasourceService.get();
    const placeTypes = await this.contactTypesService.getPlaceTypes();
    const typeIds = placeTypes.map((t) => t.id);

    const search = async (
      term: string,
      page: number,
    ): Promise<Select2Doc[]> => {
      const results: Select2Doc[] = [];
      const cursor = page > 1 ? String((page - 1) * PAGE_SIZE) : null;

      for (const typeId of typeIds) {
        const response = await chtApi.v1.place.getPageByType(
          typeId,
          cursor,
          PAGE_SIZE,
        );
        const docs: any[] = response?.data ?? [];
        const filtered = term
          ? docs.filter((d) => d.name?.toLowerCase().includes(term.toLowerCase()),)
          : docs;
        filtered.forEach((doc) => results.push({ id: doc._id, text: doc.name }),);
      }

      return results;
    };

    this.initSelect2(el, search, { multiple: true });

    if (options.initialValue) {
      await this.preselectById(el, options.initialValue, (id) => chtApi.v1.place.getByUuid(id),);
    }
  }

  /**
   * Initialises a person (associated contact) Select2 on the given native element.
   * Searches all configured person contact types, paged via the CHT datasource.
   * @param el the native <select> element to enhance
   * @param options optional initial value
   */
  async initPersonSelect(
    el: HTMLSelectElement,
    options: Select2Options = {},
  ): Promise<void> {
    const chtApi = await this.chtDatasourceService.get();
    const personTypes = await this.contactTypesService.getPersonTypes();
    const typeIds = personTypes.map((t) => t.id);

    const search = async (
      term: string,
      page: number,
    ): Promise<Select2Doc[]> => {
      const results: Select2Doc[] = [];
      const cursor = page > 1 ? String((page - 1) * PAGE_SIZE) : null;

      for (const typeId of typeIds) {
        const response = await chtApi.v1.person.getPageByType(
          typeId,
          cursor,
          PAGE_SIZE,
        );
        const docs: any[] = response?.data ?? [];
        const filtered = term
          ? docs.filter((d) => d.name?.toLowerCase().includes(term.toLowerCase()),)
          : docs;
        filtered.forEach((doc) => results.push({ id: doc._id, text: doc.name }),);
      }

      return results;
    };

    this.initSelect2(el, search, { multiple: false });

    if (options.initialValue) {
      await this.preselectById(el, options.initialValue, (id) => chtApi.v1.person.getByUuid(id),);
    }
  }

  /**
   * Validates that the given contact is a descendant of one of the given place UUIDs
   * by walking up the contact's parent chain via the CHT datasource.
   * @param contactId the UUID of the contact to validate
   * @param placeIds the UUIDs of the selected facilities
   * @returns true if the contact belongs to one of the places, or if validation cannot be determined
   */
  async isContactInPlace(
    contactId: string,
    placeIds: string[],
  ): Promise<boolean> {
    if (!contactId || !placeIds?.length) {
      return true;
    }

    try {
      const chtApi = await this.chtDatasourceService.get();
      const contact = await chtApi.v1.contact.getByUuid(contactId);
      return this.checkParent(contact?.parent, placeIds);
    } catch (err) {
      console.error('Error validating contact hierarchy', err);
      return true;
    }
  }

  /**
   * Recursively walks the parent chain of a contact document to find
   * whether any ancestor matches one of the given place IDs.
   */
  private checkParent(parent: any, placeIds: string[]): boolean {
    if (!parent) {
      return false;
    }
    if (placeIds.includes(parent._id)) {
      return true;
    }
    return this.checkParent(parent.parent, placeIds);
  }

  /**
   * Wires up the Select2 plugin on the given element with an async search transport.
   */
  private initSelect2(
    el: HTMLSelectElement,
    search: (term: string, page: number) => Promise<Select2Doc[]>,
    options: { multiple: boolean },
  ): void {
    $(el).select2({
      width: '100%',
      allowClear: true,
      placeholder: '',
      multiple: options.multiple,
      minimumInputLength: 3,
      ajax: {
        delay: 300,
        transport: (params: any, success: any, failure: any) => {
          const term = params.data?.q ?? '';
          const page = params.data?.page ?? 1;
          search(term, page)
            .then((results) => success({
              results,
              pagination: { more: results.length === PAGE_SIZE },
            }),)
            .catch(failure);
        },
      },
    });
  }

  /**
   * Pre-selects a document by UUID using the provided fetcher function,
   * then appends it as a selected option in the Select2 element.
   */
  private async preselectById(
    el: HTMLSelectElement,
    uuid: string,
    fetcher: (id: string) => Promise<any>,
  ): Promise<void> {
    try {
      const doc = await fetcher(uuid);
      if (doc) {
        const $el = $(el);
        if (!$el.find(`option[value="${doc._id}"]`).length) {
          $el.append(new Option(doc.name, doc._id, true, true));
        }
        $el.trigger('change');
      }
    } catch (err) {
      console.error('Error pre-selecting document', err);
    }
  }
}
