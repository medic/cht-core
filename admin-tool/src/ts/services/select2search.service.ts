import { Injectable } from '@angular/core';
import { DbService } from '@admin-tool-services/db.service';
import { ContactTypesService } from '@admin-tool-services/contact-types.service';

const PAGE_SIZE = 20;
export interface Select2Doc {
  id: string;
  text: string;
  doc?: any;
}

export interface Select2Options {
  /** Pre-select this UUID when the dropdown is initialised. */
  initialValue?: string;
}

/**
 * Initialises a Select2 dropdown backed by the local PouchDB database.
 *
 * Queries the medic-offline-freetext/contacts_by_type_freetext view for
 * term-based search, matching the original AngularJS Select2Search behaviour.
 *
 * Results display name, phone, and parent lineage in gray — matching format.sender() output.
 */
@Injectable({
  providedIn: 'root',
})
export class Select2SearchService {
  constructor(
    private db: DbService,
    private contactTypesService: ContactTypesService,
  ) {}

  /**
   * Initialises a place (facility) Select2 on the given native element.
   */
  async initPlaceSelect(
    el: HTMLSelectElement,
    options: Select2Options = {},
  ): Promise<void> {
    const placeTypes = await this.contactTypesService.getPlaceTypes();
    const typeIds = placeTypes.map((t) => t.id);

    this.initSelect2(el, (term) => this.searchByTypes(typeIds, term), { multiple: true });

    if (options.initialValue) {
      await this.preselectById(el, options.initialValue);
    }
  }

  /**
   * Initialises a person (associated contact) Select2 on the given native element.
   */
  async initPersonSelect(
    el: HTMLSelectElement,
    options: Select2Options = {},
  ): Promise<void> {
    const personTypes = await this.contactTypesService.getPersonTypes();
    const typeIds = personTypes.map((t) => t.id);

    this.initSelect2(el, (term) => this.searchByTypes(typeIds, term), { multiple: false });

    if (options.initialValue) {
      await this.preselectById(el, options.initialValue);
    }
  }

  /**
   * Validates that the given contact is a descendant of one of the given place UUIDs.
   */
  async isContactInPlace(contactId: string, placeIds: string[]): Promise<boolean> {
    if (!contactId || !placeIds?.length) {
      return true;
    }

    try {
      const doc = await this.db.get().get(contactId);
      return this.checkParent(doc?.parent, placeIds);
    } catch (err) {
      console.error('Error validating contact hierarchy', err);
      return true;
    }
  }

  /**
   * Searches contacts using the medic-offline-freetext/contacts_by_type_freetext view.
   * Keys are [typeId, term] so CouchDB does the filtering server-side.
   */
  private async searchByTypes(typeIds: string[], term: string): Promise<Select2Doc[]> {
    if (!typeIds.length) {
      return [];
    }

    const results: Select2Doc[] = [];
    const seen = new Set<string>();

    for (const typeId of typeIds) {
      try {
        const response = await this.db.get().query('medic-offline-freetext/contacts_by_type_freetext', {
          startkey: [typeId, term.toLowerCase()],
          endkey: [typeId, term.toLowerCase() + '\ufff0'],
          include_docs: true,
          reduce: false,
          limit: PAGE_SIZE,
        });

        const rows: any[] = response?.rows ?? [];

        for (const row of rows) {
          const doc = row.doc;
          if (!doc || seen.has(doc._id)) {
            continue;
          }
          seen.add(doc._id);

          const lineage = await this.buildLineage(doc.parent);

          results.push({
            id: doc._id,
            text: doc.name,
            doc: { ...doc, _lineage: lineage },
          });
        }
      } catch (err) {
        console.error(`Error querying contacts_by_type_freetext for type ${typeId}`, err);
      }
    }

    return results;
  }

  /**
   * Recursively walks the parent chain and returns an array of parent names.
   */
  private async buildLineage(parent: any): Promise<string[]> {
    if (!parent?._id) {
      return [];
    }

    try {
      const doc = await this.db.get().get(parent._id);
      if (!doc?.name) {
        return [];
      }
      const ancestors = await this.buildLineage(doc.parent);
      return [doc.name, ...ancestors];
    } catch {
      return [];
    }
  }

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
   * Wires up the Select2 plugin with custom templateResult for rich display.
   */
  private initSelect2(
    el: HTMLSelectElement,
    search: (term: string) => Promise<Select2Doc[]>,
    options: { multiple: boolean },
  ): void {
    $(el).select2({
      width: '100%',
      allowClear: true,
      placeholder: '',
      multiple: options.multiple,
      minimumInputLength: 3,
      templateResult: (item: any) => this.renderResult(item),
      templateSelection: (item: any) => item.doc?.name ?? item.text ?? '',
      ajax: {
        delay: 300,
        transport: (params: any, success: any, failure: any) => {
          const term = params.data?.q ?? '';
          search(term)
            .then((results) => success({
              results,
              pagination: { more: results.length === PAGE_SIZE },
            }))
            .catch(failure);
        },
      },
    });
  }

  /**
   * Renders a Select2 result row matching the original format.sender() output:
   * name + phone + parent name in gray lineage block.
   */
  private renderResult(item: any): any {
    if (!item.doc) {
      return $('<span>' + (item.text || '&nbsp;') + '</span>');
    }

    const doc = item.doc;
    const parts: string[] = [];

    if (doc.name) {
      parts.push('<span class="name">' + this.escape(doc.name) + '</span>');
    }
    if (doc.phone) {
      parts.push('<span>' + this.escape(doc.phone) + '</span>');
    }
    if (doc._lineage?.length) {
      const items = doc._lineage
        .map((name: string) => '<li>' + this.escape(name) + '</li>')
        .join('');
      parts.push('<div class="position"><ol class="horizontal lineage">' + items + '</ol></div>');
    }

    return $('<span class="sender">' + parts.join('') + '</span>');
  }

  private escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Pre-selects a document by UUID, fetching it from PouchDB.
   */
  private async preselectById(el: HTMLSelectElement, uuid: string): Promise<void> {
    try {
      const doc = await this.db.get().get(uuid);
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
