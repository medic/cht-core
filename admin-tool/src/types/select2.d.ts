/**
 * Extends the JQuery interface with Select2 plugin methods.
 * Select2 is loaded globally via angular.json scripts (select2.min.js).
 */

declare global {
  interface Select2Options {
    width?: string;
    allowClear?: boolean;
    placeholder?: string;
    multiple?: boolean;
    tags?: boolean;
    minimumInputLength?: number;
    ajax?: {
      delay?: number;
      transport?: (params: any, success: any, failure: any) => void;
    };
    templateResult?: (item: any) => any;
    templateSelection?: (item: any) => any;
  }

  interface JQuery {
    select2(options?: Select2Options): JQuery;
    select2(method: 'data'): any[];
    select2(method: 'data', value: any[]): JQuery;
    select2(method: 'destroy' | 'open' | 'close'): JQuery;
    select2(method: 'val'): string | string[];
  }
}

export {};
