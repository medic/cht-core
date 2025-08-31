import {  Injectable, inject } from '@angular/core';
import { Router, Routes } from '@angular/router';

import { AppRouteGuardProvider } from '../../app-route.guard.provider';

import { AuthService } from '@mm-services/auth.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { SettingsService } from '@mm-services/settings.service';
import { SessionService } from '@mm-services/session.service';
import { DbService } from '@mm-services/db.service';

import * as moment from 'moment';

import { PluginContract, PluginContext } from './plugin.contract';
import { PluginFallbackComponent } from './plugin-fallback.component';
import pipeArr from './plugin.pipes';

import { plugins as manifest } from '../auto-gen-manifest';

@Injectable({ providedIn: 'root' })
export class PluginManagerService {
  private readonly APP_VERSION = '4.21.0'; // TODO: get from service
  private readonly VISUAL_PLUGIN_BASE_ROUTE_PATH = 'plugin';
  private readonly BASE_PLUGIN_PERMISSION = 'can_view_plugins';
  private plugins = new Map<string, PluginContract>();

  private routes: Routes = []; // Passed to the angular router
  private navEntries: Array<NavEntry> = []; // Passed to the header tab service
  private permissions: Map<string, Array<string>> = new Map(); // Passed to the route guard

  // List of dependencies we're allowing the plugins access to
  private router = inject(Router);
  private database = inject(DbService);

  constructor(
    private readonly settingsService: SettingsService,
    private userSettingsService: UserSettingsService,
    private sessionService: SessionService,
    private authService:AuthService,
  ){}

  private initialized = false;
  private userInfo;
  private lookupConfFn;

  async init(){
    try {
      const [settings, user] = await Promise.all([this.settingsService.get(), this.userSettingsService.get()]);
      
      this.userInfo = {
        contact_id: [...(user?.contact_id ?? [])], // The linked "person" in the contact hierarchy
        facility_id: [...(user?.facility_id ?? [])], // The linked "place" to which the above person belongs
        name: (user?.name ?? '').toString(), // The username
        isAdmin: this.sessionService.isAdmin(),
        isOnlineOnly: this.sessionService.isOnlineOnly(),
        // Roles, admin or online status could be used to allow/disallow certain parts of screens or change service
        roles: [...(user?.roles ?? []).filter(item => item !== 'mm-online')],
      };
      console.log('[Plugin man] User info: ', this.userInfo);
      
      this.lookupConfFn = (key: string) => settings[key];

      this.initialized = true;
    } catch (e){
      console.error('Error initializing plugin manager: ', e);
    }
  }

  async loadAll(): Promise<void> {
    if (!this.initialized){
      throw Error('[Plugin man] The plugin manager has to be initialized first');
    }

    for (const [id, func] of Object.entries(manifest)) {
      await this.tryLoad(id, func as any);
    }

    // After all routes are collected, apply them once
    this.applyRoutes();
  }

  private async tryLoad(id: string, func: () => Promise<any>) {
    try {
      // Each plugin bundle must default-export an object that implements PluginContract
      const mod = await func();
      console.log('[Plugin man] mod: ', mod.plugin);
      const plugin: PluginContract = mod.plugin.default;
      console.log('[Plugin man] default: ', plugin);

      if (!plugin?.manifest?.id || plugin.manifest.id !== id) {
        throw new Error(`[Plugin man] Plugin ${id} has invalid manifest`);
      }

      this.plugins.set(id, plugin);

      const ctx: PluginContext = {
        router: this.router,
        auth: {
          has: async (permissions: Array<string>) => await this.authService.has(permissions)
        },
        telemetry: { record: (e, d) => console.log('[Plugin man] telemetry', id, e, d) },
        config: { 
          get: (key: string) => {
            console.log('[Plugin man] Key: ', key);
            return this.lookupConfFn?.(key) ?? undefined;
          },
          userInfo: () => {
            console.log('[Plugin man] Requesting user info');
            return this.userInfo;
          }
        },
        // We could provide an adapter over the service, limiting what a plugin has access to
        db: this.database,
        pipes: pipeArr,
        moment
      };

      await plugin.init?.(ctx);

      this.buildVisualRoutes(id, plugin, ctx);

      await plugin.afterInit?.(ctx);
    } catch (err) {
      // console.error(`[Plugin man] Failed to load plugin ${id} from ${url}`, err);
      console.error(`[Plugin man] Failed to load plugin ${id}`, err);
      // Do not crash the app. Optionally emit telemetry.
    }
  }

  private createPluginSpecificPermissionString = (id: string) => `can_view_${id}`;

  private getVisualPluginRoute = (id: string) => `${this.VISUAL_PLUGIN_BASE_ROUTE_PATH}/${id}`;

  private buildVisualRoutes = (pluginID: string, plugin: PluginContract, ctx: PluginContext) => {
    if (plugin.manifest.routes?.length) {
      const childRoutes: Routes = [];
      for (const r of plugin.manifest.routes){
        childRoutes.push({
          path: r.path,
          loadComponent: r.getComponent
            ? async () => {
              try {
                if (
                  plugin.manifest.compatibility?.minCHT &&
                  this.APP_VERSION < plugin.manifest.compatibility.minCHT
                ) {
                  throw Error(`⚠️ Plugin ${pluginID} requires CHT >= ${plugin.manifest.compatibility.minCHT}`);
                }
                return (await r.getComponent!()) as any;
              } catch (e){
                console.error(`Failed to load plugin ${pluginID}`, e);
                return PluginFallbackComponent;
              }
            }
            : undefined,
          data: { 
            id: pluginID,
            version: plugin.manifest.version,
            compatibility: plugin.manifest.compatibility,
            chtVersion: this.APP_VERSION
          },
          canActivate: r.canActivate,
        });

        const navItems = (typeof r.nav! === 'function'? 
          r.nav!(ctx.config.get) : 
          r.nav!) ?? [];
        for (const n of navItems){
          this.navEntries.push({
            key: n.key,
            route: `${this.getVisualPluginRoute(pluginID)}/${n.path}`,
            permissions: n.permissions ?? [],
            tab_type: n.tab_type ?? 'secondary'
          });

          this.permissions.set(`${this.getVisualPluginRoute(pluginID)}/${n.path}`, n.permissions ?? []);
        }
      }

      this.routes.push({
        path: this.VISUAL_PLUGIN_BASE_ROUTE_PATH,
        children: [{
          path: pluginID,
          children: childRoutes,
          data: { permissions: [this.createPluginSpecificPermissionString(pluginID)]},
          canActivate: [AppRouteGuardProvider]
          // The app route guard will determine if we can see this specific plugin
        }],
        data: { permissions: [this.BASE_PLUGIN_PERMISSION]},
        canActivate: [AppRouteGuardProvider]
        // The app route guard will determine if we have the permission to see plugins overall
      });
    }
  };

  private applyRoutes() {
    if (!this.routes.length) {
      return;
    }

    // Merge with existing config at runtime
    const routesBeforeError = this.router.config.filter(route => route.path !== '**' && route.path !== 'error/:code');
    const errorRoutes = this.router.config.filter(route => route.path === 'error/:code' || route.path === '**');

    const newConfig = [
      ...routesBeforeError,
      // Add our routes before error routes
      // https://stackoverflow.com/questions/49948281/routing-in-angular-does-the-order-of-paths-matter
      ...this.routes,
      ...errorRoutes
    ];
    
    this.router.resetConfig(newConfig);
  }

  getNavEntries(): Array<NavEntry> {
    return this.navEntries;
  };
}

type NavEntry = { key: string, route: string, permissions: Array<string>, tab_type: string };
