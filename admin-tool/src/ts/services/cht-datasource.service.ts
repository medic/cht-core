import { Injectable } from '@angular/core';
import { DataContext, getDatasource, getRemoteDataContext } from '@medic/cht-datasource';

import { SessionService } from '@admin-tool-services/session.service';
import { SettingsService } from '@admin-tool-services/settings.service';

@Injectable({
  providedIn: 'root'
})
export class CHTDatasourceService {
  private initialized: Promise<void> | null = null;
  private settings: any = null;
  private userCtx: any = null;
  private dataContext!: DataContext;

  constructor(private sessionService: SessionService, private settingsService: SettingsService) {}

  private async init() {
    this.userCtx = this.sessionService.userCtx();
    this.settings = await this.settingsService.get();
    this.dataContext = getRemoteDataContext();
  }

  isInitialized() {
    if (!this.initialized) {
      this.initialized = this.init();
    }
    return this.initialized;
  }

  async get() {
    await this.isInitialized();
    const dataSource = getDatasource(this.dataContext);
    return {
      ...dataSource,
      v1: {
        ...dataSource.v1,
        hasPermissions: (permissions, user?, chtSettings?) => {
          const userRoles = user?.roles ?? this.userCtx?.roles;
          const permsSettings = chtSettings?.permissions ?? this.settings?.permissions;
          return dataSource.v1.hasPermissions(permissions, userRoles, permsSettings);
        },
        hasAnyPermission: (permissionsGroupList, user?, chtSettings?) => {
          const userRoles = user?.roles ?? this.userCtx?.roles;
          const permsSettings = chtSettings?.permissions ?? this.settings?.permissions;
          return dataSource.v1.hasAnyPermission(permissionsGroupList, userRoles, permsSettings);
        },
      },
    };
  }
}
