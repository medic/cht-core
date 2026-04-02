import { Injectable } from '@angular/core';
import { PerformanceService } from '@mm-services/performance.service';

@Injectable({
  providedIn: 'root'
})
export class AndroidAppLauncherService {
  private resolve?: Function | null;
  private stopTracking: (() => void) | undefined;

  constructor(
    private readonly performanceService: PerformanceService,
  ) { }

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
    this.stopTracking?.();
    this.stopTracking = undefined;
    this.resolve(response);
    this.resolve = null;
  }

  launchAndroidApp(chtAndroidApp: ChtAndroidApp): Promise<any> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      try {
        const tracking = this.performanceService.track();
        this.stopTracking = () => tracking?.stop({ name: `enketo:external-app:${chtAndroidApp.action}` });
        this.executeLaunch(chtAndroidApp);
      } catch (error) {
        console.error('Error when launching Android app', error);
        this.stopTracking = undefined;
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
