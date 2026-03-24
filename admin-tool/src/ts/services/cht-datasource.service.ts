import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataContext, getDatasource, getRemoteDataContext } from '@medic/cht-datasource';
import { firstValueFrom } from 'rxjs';

import { SessionService } from '@admin-tool-services/session.service';

@Injectable({
  providedIn: 'root'
})
export class CHTDatasourceService {
  private initialized: Promise<void> | null = null;
  private settings: any = null;
  private userCtx: any = null;
  private dataContext!: DataContext;

  constructor(private http: HttpClient, private sessionService: SessionService) {}

  private async init() {
    this.userCtx = this.sessionService.userCtx();
    const settings = await firstValueFrom(this.http.get('/api/v1/settings'));
    this.settings = settings;
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
