import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AndroidAppLauncherService {
  private resolve: Function | null;

  constructor() { }

  isEnabled() {
    return !!(
      window.medicmobile_android
      && typeof window.medicmobile_android.launchExternalApp === 'function'
    );
  }

  resolveAndroidAppResponse(response: Record<string, any>) {
    if (!this.resolve) {
      return;
    }

    this.resolve(response);
    this.resolve = null;
  }

  launchAndroidApp(chtAndroidApp: ChtAndroidApp): Promise<any> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      try {
        this.executeLaunch(chtAndroidApp);
      } catch (error) {
        console.error(error);
        this.resolve = null;
        const details = `ChtAndroidApp=${JSON.stringify(chtAndroidApp)}, Enabled=${this.isEnabled()}`;
        const message = `AndroidAppLauncherService :: Error when launching Android app. ${details}`;
        reject(message);
      }
    });
  }

  private executeLaunch(chtAndroidApp: ChtAndroidApp) {
    const { action, category, type, extras, uri, packageName, flags } = chtAndroidApp;

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
  }
}

interface ChtAndroidApp {
  action: string;
  category?: string;
  type?: string;
  extras?: Record<string, any>;
  uri?: string;
  packageName?: string;
  flags?: number;
}
