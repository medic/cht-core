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
      const extrasStr = extras ? JSON.stringify(extras) : null;

      window.medicmobile_android.launchExternalApp(
        action || null,
        category || null,
        type || null,
        extrasStr,
        uri || null,
        packageName || null,
        flags || null
      );

      return new Promise(resolve => this.launchToResolve = resolve);

    } catch (error) {
      const message = `ExternalAppLauncherService :: Error when launching external app.
       ChtExternalApp=${ JSON.stringify(chtExternalApp) }, Enabled=${this.isEnabled()}`;
      console.error(message, error);
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
