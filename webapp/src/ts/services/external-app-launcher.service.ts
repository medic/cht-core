import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ExternalAppLauncherService {
  launchToResolve: Function;

  constructor() { }

  isEnabled() {
    return !!(
      window.medicmobile_android
      && typeof window.medicmobile_android.launchExternalApp === 'function'
    );
  }

  launchExternalApp(chtExternalApp: ChtExternalApp): Promise<any>|undefined {
    try {
      const { action, category, type, extras, uri, packageName, flags } = chtExternalApp;

      // If any parameter is undefined, then ensure that it's null value
      // Otherwise Android will receive a string with "undefined" as text.
      window.medicmobile_android.launchExternalApp(
        action || null,
        category || null,
        type || null,
        extras ? JSON.stringify(extras) : null,
        uri || null,
        packageName || null,
        flags || null
      );

      return new Promise(resolve => this.launchToResolve = resolve);

    } catch (error) {
      const message = 'ExternalAppLauncherService :: Error when launching external app. ';
      const details = `ChtExternalApp=${ JSON.stringify(chtExternalApp) }, Enabled=${ this.isEnabled() }`;
      console.error(message + details, error);
    }
  }

  resolveExternalAppResponse(response: Record<string, any>) {
    if (!response || !this.launchToResolve) {
      return;
    }

    this.launchToResolve(response);
    this.launchToResolve = null;
  }
}

interface ChtExternalApp {
  action: string;
  category?: string;
  type?: string;
  extras?: Record<string, any>;
  uri?: string;
  packageName?: string;
  flags?: number;
}
