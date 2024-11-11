/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * You can add your own extra polyfills to this file.
 *
 * This file is divided into 2 sections:
 *   1. Browser polyfills. These are applied before loading ZoneJS and are sorted by browsers.
 *   2. Application imports. Files imported after ZoneJS that should be loaded before your main
 *      file.
 *
 * The current setup is for so-called "evergreen" browsers; the last versions of browsers that
 * automatically update themselves. This includes Safari >= 10, Chrome >= 55 (including Opera),
 * Edge >= 13 on the desktop, and iOS 10 and Chrome on mobile.
 *
 * Learn more in https://angular.io/guide/browser-support
 */

/***************************************************************************************************
 * Load `$localize` onto the global scope - used if i18n tags appear in Angular templates.
 */
import '@angular/localize/init';

/***************************************************************************************************
 * BROWSER POLYFILLS
 */

/** IE10 and IE11 requires the following for NgClass support on SVG elements */
// import 'classlist.js';  // Run `npm install --save classlist.js`.

/**
 * Web Animations `@angular/platform-browser/animations`
 * Only required if AnimationBuilder is used within the application and using IE/Edge or Safari.
 * Standard animation support in Angular DOES NOT require any polyfills (as of Angular 6.0).
 */
// import 'web-animations-js';  // Run `npm install --save web-animations-js`.

/**
 * By default, zone.js will patch all possible macroTask and DomEvents
 * user can disable parts of macroTask/DomEvents patch by setting following flags
 * because those flags need to be set before `zone.js` being loaded, and webpack
 * will put import in the top of bundle, so user need to create a separate file
 * in this directory (for example: zone-flags.ts), and put the following flags
 * into that file, and then add the following code before importing zone.js.
 * import './zone-flags';
 *
 * The flags allowed in zone-flags.ts are listed here.
 *
 * The following flags will work for all browsers.
 *
 * (window as any).__Zone_disable_requestAnimationFrame = true; // disable patch requestAnimationFrame
 * (window as any).__Zone_disable_on_property = true; // disable patch onProperty such as onclick
 * (window as any).__zone_symbol__UNPATCHED_EVENTS = ['scroll', 'mousemove']; // disable patch specified eventNames
 *
 *  in IE/Edge developer tools, the addEventListener will also be wrapped by zone.js
 *  with the following flag, it will bypass `zone.js` patch for IE/Edge
 *
 *  (window as any).__Zone_enable_cross_context_check = true;
 *
 */

/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import './zone-flags';
import 'zone.js';

/***************************************************************************************************
 * APPLICATION IMPORTS
 */

// Polyfills for JS/Web API functions used in enketo-core but not found in Chrome 53
import 'core-js/es/object/entries';
import 'core-js/es/string/pad-start';
import '@webcomponents/webcomponentsjs/src/platform/child-node/after';
import '@webcomponents/webcomponentsjs/src/platform/child-node/before';
import '@webcomponents/webcomponentsjs/src/platform/child-node/replace-with';
import '@webcomponents/webcomponentsjs/src/platform/parent-node/append';
import '@webcomponents/webcomponentsjs/src/platform/parent-node/prepend';

(window as any).global = window;
declare global {
  interface Window {
    startupTimes: any;
    PouchDB: any;
    $: any;
    jQuery: any;
    bootstrapFeedback: any;
    medicmobile_android: any;
    CHTCore: any;
    angular: any;
    EnketoForm:any;
    _phdcChanges: { // Additional namespace
      // Specify your own contact_types here
      hierarchyDuplicatePrevention: Partial<{[key in 'person' | 'health_center']: Strategy;}>;
      // The Partial utility ensures that only the allowed keys (health_center, clinic, person, etc) are used, 
      // but none are mandatory.
    };
  }

  interface JQuery {
    daterangepicker(options?: any, callback?: Function) : any;
    select2(event?:any, options?:any):any;
  }
  interface Node {
    _couchId: any;
  }
}

type Strategy = {
  // Name is used by default (since it's hardcoded in the system) if no props are specified.
  // Should props be specified, only those items will be considered
  props?: {form_prop_path: string; db_doc_ref: string}[]; // TODO: perhaps add a weight to each property
  queryParams?: { // Usage example - see main.ts
    valuePaths: string[];
    //https://stackoverflow.com/questions/76130608/in-typescript-can-you-define-a-function-type-where-each-argument-can-be-one-of
    query: (...valuesAtPaths: string[]) => boolean;
    // TODO: ^ pass back tuple key & value ^
  };
} & (LevenshteinType | NormalizedLevenshteinType);
// https://dev.to/darkmavis1980/what-are-typescript-discriminated-unions-5hbb

type LevenshteinType = {
  type: 'Levenshtein';
  threshold: number;
}

type NormalizedLevenshteinType = {
  type: 'NormalizedLevenshtein';
  threshold: number; // TODO: Enforce range between 0 and 1 here
}

export const Levenshtein: Strategy = {
  type: 'Levenshtein',
  threshold: 1.5,
};

export const NormalizedLevenshtein: Strategy = {
  type: 'NormalizedLevenshtein',
  threshold: 0.334,
};

(window as any).process = {
  env: { DEBUG: undefined },
  browser: true,
  nextTick: require('next-tick')
};
