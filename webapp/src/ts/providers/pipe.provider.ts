import { Injectable, Compiler, Injector } from "@angular/core";

@Injectable()
export class PipeProvider {
  _pipeMeta;

  unknownPipe(name) {
    throw Error(`The pipe '${name}' could not be found`);
  }

  constructor (private compiler: Compiler, private injector: Injector) {
    this._pipeMeta = new Map();

    /*this.compiler._metadataResolver._pipeCache.forEach(v => {
      this._pipeMeta.set(v.name, v);
    });*/
  }

  meta(name) {
    const meta = this._pipeMeta.get(name);
    if (!meta) {
      this.unknownPipe(name);
    }
    return meta;
  }

  getPipeNameVsIsPureMap() {
    const _map = new Map();
    this._pipeMeta.forEach((v, k) => {
      _map.set(k, v.pure);
    });
    return _map;
  }

  resolveDep(dep) {
    return this.injector.get(dep.token.identifier.reference)
  }

  getInstance(name) {
    const {type: {reference: ref, diDeps: deps}} = this.meta(name);
    if (!ref) {
      this.unknownPipe(name);
    }

    if (!deps.length) {
      return new ref();
    } else {
      const args = [];
      for (const dep of deps) {
        args.push(this.resolveDep(dep));
      }
      return new ref(...args);
    }
  }
}
