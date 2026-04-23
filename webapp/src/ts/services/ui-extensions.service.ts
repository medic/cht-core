import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

import { SessionService } from '@mm-services/session.service';

interface UiExtensionProperties {
  readonly id: string;
  readonly type: string;
  readonly roles?: string[];
  readonly icon?: string;
  readonly title?: string;
  readonly weight?: number;
  readonly config?: Record<string, unknown>;
}

interface UiExtension {
  readonly properties: UiExtensionProperties;
  readonly Element: new () => HTMLElement;
}

@Injectable({
  providedIn: 'root'
})
export class UiExtensionsService {
  private extensionProperties: UiExtensionProperties[] = [];
  private extensionScripts: Record<string, new () => HTMLElement> = {};
  private initialized = false;

  constructor(
    private readonly http: HttpClient,
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
      const request = this.http.get<UiExtensionProperties[]>('/ui-extension', { responseType: 'json' });
      const extensions = (await lastValueFrom(request)) as UiExtensionProperties[];
      this.extensionProperties = extensions.filter(extension => {
        if (!extension.roles?.length) {
          return true;
        }
        return extension.roles.some(role => this.sessionService.hasRole(role));
      });
    } catch (e) {
      console.error('Error loading UI extension properties', e);
    }
  }

  private async loadExtensionScript(id: string) {
    const request = this.http.get('/ui-extension/' + id, { responseType: 'text' });
    const result = await lastValueFrom(request);
    const module = { exports: null as any };
    new Function('module', result)(module);
    const Element = module.exports;
    if (!Element || !(Element.prototype instanceof HTMLElement)) {
      throw new Error(`Could not load UI Extension element with id [${id}].`);
    }
    return Element as new () => HTMLElement;
  }

  async getPropertiesByType(type: string): Promise<UiExtensionProperties[]> {
    await this.init();
    return this.extensionProperties.filter(extension => extension.type === type);
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
