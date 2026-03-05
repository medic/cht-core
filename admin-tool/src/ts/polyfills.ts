import '@angular/localize/init';
import 'zone.js';

(window as any).global = window;

declare global {
  interface Window {
    $: any;
    jQuery: any;
  }
}
