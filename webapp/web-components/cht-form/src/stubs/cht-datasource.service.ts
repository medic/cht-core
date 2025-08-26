import { Injectable } from '@angular/core';
import { DataContext } from '@medic/cht-datasource';

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

  bind<R, F extends (arg?: unknown) => Promise<R>>(
    _: (ctx: DataContext) => F
  ): (...p: Parameters<F>) => ReturnType<F> {
    return (..._) => Promise.resolve() as ReturnType<F>;
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
