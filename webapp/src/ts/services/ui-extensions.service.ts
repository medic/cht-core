import { Injectable } from '@angular/core';

import { SessionService } from '@mm-services/session.service';
import { DbService } from '@mm-services/db.service';
import { DOC_TYPES, PREFIXES } from '@medic/constants';

interface UiExtensionProperties {
  readonly id: string;
  readonly extension_type: string;
  readonly roles?: string[];
  readonly icon?: string;
  readonly resource_icon?: string;
  readonly title?: string;
  readonly config?: Record<string, unknown>;
  readonly accent_color?: string;
  readonly weight?: number;
}

interface UiExtension {
  readonly properties: UiExtensionProperties;
  readonly Element: new () => HTMLElement;
}

@Injectable({
  providedIn: 'root'
})
export class UiExtensionsService {
  private readonly ATTACHMENT_NAME = 'extension.js';
  private extensionProperties: UiExtensionProperties[] = [];
  private extensionScripts: Record<string, new () => HTMLElement> = {};
  private initialized = false;

  constructor(
    private readonly dbService: DbService,
    private readonly sessionService: SessionService,
  ) { }

  private async init() {
    if (this.initialized) {
      return;
    }
    await this.loadExtensionProperties();
    this.initialized = true;
  }

  private async loadExtensionProperties() {
    try {
      const result = await this.dbService.get().allDocs({
        startkey: PREFIXES.UI_EXTENSION,
        endkey: `${PREFIXES.UI_EXTENSION}\ufff0`,
        include_docs: true,
      });
      this.extensionProperties = result.rows
        .map(({ doc }) => doc)
        .filter(({ type }) => type === DOC_TYPES.UI_EXTENSION)
        .filter(({ roles }) => {
          const extRoles = roles === null || roles === undefined ? [] : roles;
          if (!Array.isArray(extRoles)) {
            return false;
          }
          return !extRoles.length || extRoles.some(role => this.sessionService.hasRole(role));
        })
        .map(doc => {
          const id = doc._id.replace(PREFIXES.UI_EXTENSION, '');
          return { ...doc, id };
        });
    } catch (e) {
      console.error('Error loading UI extension properties', e);
    }
  }

  private async loadExtensionScript(id: string) {
    const blob: Blob = await this.dbService
      .get()
      .getAttachment(`${PREFIXES.UI_EXTENSION}${id}`, this.ATTACHMENT_NAME);
    const source = await blob.text();
    const module = { exports: null as any };
    new Function('module', source)(module);
    const Element = module.exports;
    if (!Element || !(Element.prototype instanceof HTMLElement)) {
      throw new Error(`Could not load UI Extension element with id [${id}].`);
    }
    return Element as new () => HTMLElement;
  }

  async getPropertiesByType(type: string): Promise<UiExtensionProperties[]> {
    await this.init();
    return this.extensionProperties
      .filter(extension => extension.extension_type === type)
      .sort((a, b) => {
        if (a.weight !== undefined && b.weight !== undefined) {
          return a.weight - b.weight;
        }
        if (a.weight !== undefined) {
          return -1;
        }
        if (b.weight !== undefined) {
          return 1;
        }
        return a.id.localeCompare(b.id);
      });
  }

  async getProperties(id: string): Promise<UiExtensionProperties> {
    await this.init();
    const props = this.extensionProperties.find(extension => extension.id === id);
    if (!props) {
      throw new Error(`UI Extension with id [${id}] not found.`);
    }
    return props;
  }

  async getExtension(id: string): Promise<UiExtension> {
    const properties = await this.getProperties(id);

    if (!this.extensionScripts[id]) {
      this.extensionScripts[id] = await this.loadExtensionScript(id);
    }

    return {
      properties,
      Element: this.extensionScripts[id],
    };
  }
}
