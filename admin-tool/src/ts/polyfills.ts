import '@angular/localize/init';
import 'zone.js';

(window as any).global = window;
// process shim for Node.js libraries used in browser context
(window as any).process = (window as any).process || { browser: true, env: {}, version: '', versions: {} };

declare global {
  interface Window {
    $: any;
    jQuery: any;
  }
}
