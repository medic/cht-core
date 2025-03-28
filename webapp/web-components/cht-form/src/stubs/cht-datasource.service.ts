import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CHTDatasourceService {
  private readonly extensionLibs: Record<string, Function> = {};

  getSync() {
    return { v1: {
      getExtensionLib: (libId: string) => this.extensionLibs[libId]
    } };
  }

  addExtensionLib(libId: string, libFn: string) {
    try {
      const module = { };
      new Function('module', libFn)(module);
      // @ts-expect-error exports property supplied by the function
      this.extensionLibs[libId] = module.exports;
    } catch (e) {
      console.error(`Error loading extension lib: "["${libId}"`, e);
      throw e;
    }
  }

  clearExtensionLibs = () => Object
    .keys(this.extensionLibs)
    .forEach(key => delete this.extensionLibs[key]);
}
