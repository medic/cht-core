import { Injectable } from '@angular/core';
import { DataContext, getDatasource, getLocalDataContext, getRemoteDataContext } from '@medic/cht-datasource';
import * as extensionLibs from '@medic/extension-libs';
import { DOC_IDS } from '@medic/constants';

import { SettingsService } from '@mm-services/settings.service';
import { ChangesService } from '@mm-services/changes.service';
import { SessionService } from '@mm-services/session.service';
import { DbService } from '@mm-services/db.service';
import { TranslateService } from '@mm-services/translate.service';
import { CustomResourceService } from '@mm-services/custom-resource.service';

@Injectable({
  providedIn: 'root'
})
export class CHTDatasourceService {
  private userCtx;
  private dataContext!: DataContext;
  private settings;
  private initialized;

  constructor(
    private sessionService: SessionService,
    private settingsService: SettingsService,
    private changesService: ChangesService,
    private readonly dbService: DbService,
    private readonly translateService: TranslateService,
    private readonly customResourceService: CustomResourceService
  ) { }

  isInitialized() {
    if (!this.initialized) {
      this.initialized = this.init();
    }

    return this.initialized;
  }

  private async init() {
    this.watchChanges();
    this.userCtx = this.sessionService.userCtx();
    await Promise.all([this.getSettings(), this.customResourceService.init()]);
    this.dataContext = await this.createDataContext();
  }

  private async createDataContext() {
    const settingsService = { getAll: () => this.settings };
    if (this.sessionService.isOnlineOnly(this.userCtx)) {
      return getRemoteDataContext(settingsService);
    }

    const sourceDatabases = { medic: await this.dbService.get() };
    return getLocalDataContext(settingsService, sourceDatabases);
  }

  private async loadExtensionLibs() {
    return extensionLibs.load(this.dbService.get()).catch(err => {
      console.error('Error reloading extension libs - keeping the previous version', err);
    });
  }

  private async getSettings() {
    const settings = await this.settingsService.get();
    this.settings = settings;
  }

  private watchChanges() {
    this.changesService.subscribe({
      key: 'cht-script-api-config-changes',
      filter: change => [ DOC_IDS.SETTINGS, DOC_IDS.EXTENSION_LIBS ].includes(change.id),
      callback: change => change.id === DOC_IDS.SETTINGS ? this.getSettings() : this.loadExtensionLibs()
    });
  }

  private getRolesFromUser(user) {
    return user?.roles || this.userCtx?.roles;
  }

  /**
   * Binds a cht-datasource function to the data context.
   * (e.g. `const getPersonWithLineage = this.bind(Person.v1.getWithLineage);`)
   * @see {@link bindGenerator} for binding a function that returns an `AsyncGenerator`
   * @param fn the function to bind. It should accept a data context as the parameter and return another function that
   * results in a `Promise`.
   * @returns a "context-aware" version of the function that is bound to the data context and ready to be used
   */
  bind<R, F extends (arg?: unknown) => Promise<R>>(fn: (ctx: DataContext) => F): F {
    return (async (...p: Parameters<F>) => {
      await this.isInitialized();
      const contextualFn = this.dataContext.bind(fn);
      return contextualFn(...p);
    }) as F;
  }

  /**
   * Binds a cht-datasource function to the data context.
   * (e.g. `const getTargets = this.bindGenerator(Target.v1.getAll);`)
   * @see {@link bind} for binding a function that returns a `Promise`
   * @param fn the function to bind. It should accept a data context as the parameter and return another function that
   * results in an `AsyncGenerator`.
   * @returns a "context-aware" version of the function that is bound to the data context and ready to be used
   */
  bindGenerator<R, F extends (arg?: unknown) => AsyncGenerator<R>>(fn: (ctx: DataContext) => F): F {
    const self = this; // NOSONAR
    return async function* (...p: Parameters<F>) {
      await self.isInitialized();
      for await (const value of self.dataContext.bind(fn)(...p)) {
        yield value;
      }
    } as F;
  }

  async get() {
    await this.isInitialized();
    const dataSource = getDatasource(this.dataContext);
    return {
      ...dataSource,
      v1: {
        ...dataSource.v1,
        hasPermissions: (permissions, user?, chtSettings?) => {
          const userRoles = this.getRolesFromUser(user);
          return dataSource.v1.hasPermissions(permissions, userRoles, chtSettings?.permissions);
        },
        hasAnyPermission: (permissionsGroupList, user?, chtSettings?) => {
          const userRoles = this.getRolesFromUser(user);
          return dataSource.v1.hasAnyPermission(permissionsGroupList, userRoles, chtSettings?.permissions);
        },
        getExtensionLib: (id) => {
          return extensionLibs.get(id);
        },
        translate: (key: string, interpolateParams?: Record<string, unknown>) => {
          return this.translateService.instant(key, interpolateParams);
        },
        getResource: (name: string) => {
          return this.customResourceService.getResource(name);
        },
        analytics: {
          getTargetDocs: () => ([]),
        },
      }
    };
  }

  async getDataContext() {
    await this.isInitialized();
    return this.dataContext;
  }
}
