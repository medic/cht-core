export type PluginType = 'visual' | 'service';

export interface PluginCompatibility {
  minCHT?: string;
  maxCHT?: string;
}

export interface PluginNavItem {
  path: string;
  key: string;
  tab_type?: 'primary' | 'secondary';
  permissions?: string[];
}

type ConfigLookup =  <T=unknown>(key: string) => T | undefined;

export interface PluginRoute {
  path: string;
  canActivate?: Array<any>,
  getComponent?: () => Promise<any>;
  // 1. No navigation button configuration
  // Used when the route is accessed indirectly — for example, 
  // via a link inside a user profile or some other navigation outside the main menu or app bar.

  // 2. Single navigation button
  // Appropriate when the route corresponds to a standalone screen, warranting just one button for direct access.

  // 3. Multiple navigation buttons
  // Applicable when the route is dynamic (e.g., takes a pageID or other parameter), 
  // and you want to present multiple buttons that correspond to sub-paths or variations of that route.
  nav?: PluginNavItem[] | ((configGet: ConfigLookup) => PluginNavItem[]);
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  type: PluginType;
  routes?: PluginRoute[];
  compatibility?: PluginCompatibility;
}

export interface PluginContext {
  // Core pipes, services, and dependencies exposed to plugins
  router: import('@angular/router').Router;
  auth: {
    has: (permissions: Array<string>) => Promise<boolean>
  },
  telemetry: { record: (event: string, data?: any) => void };
  config: { get: ConfigLookup, userInfo: <T=unknown>() => T | undefined };
  db: { /* surface we want to expose */ };
  pipes: Array<any>;
  moment: typeof import('moment');
}

export interface PluginContract {
  manifest: PluginManifest;
  init?(ctx: PluginContext): Promise<void> | void;
  afterInit?(ctx: PluginContext): Promise<void> | void;
  dispose?(): Promise<void> | void;
}
