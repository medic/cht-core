import { PluginContract, PluginManifest, PluginNavItem, PluginContext } from '../core/plugin.contract';
import { routes, BASE_PATH } from '../template-renderer/templates.routes';

let context;

const manifest: PluginManifest = {
  id: 'template-renderer',
  name: 'Template Renderer',
  version: '0.1.0',
  type: 'visual',
  routes: [
    ...routes.map(e => ({ 
      path: e.path!, 
      getComponent: () => Promise.resolve(e.component!), 
      canActivate: e.canActivate,
      nav(configGet) {
        const pages : {
          [key:string]: { permissions: Array<string>, tab_type: 'primary' | 'secondary' },
        } = configGet('pages') ?? {};
        const customPages: Array<PluginNavItem> = [];
        for (const [key, value] of Object.entries(pages)) {
          const item = {
            key: key,
            path: `${BASE_PATH}/${key}`,
            permissions: value?.permissions ?? [],
            tab_type: value?.tab_type ?? 'secondary'
          };
          customPages.push(item);
        }
        return customPages;
      },
    }))
  ],
};

const plugin: PluginContract = {
  manifest,
  async init(ctx) {
    console.log('Ctx: ', ctx);
    // pre-warm config or register telemetry categories
    context = ctx;
  },
  async afterInit(ctx) {
    console.log('Ctx: ', ctx);
    // Nothing for now
  },
  dispose() { 
    // Clean up code
  }
};

export default plugin;
export { context, PluginContext };
