// import { Injectable } from '@angular/core';

// @Injectable({
//   providedIn: 'root'
// })
// export class AndroidAppLauncherService {
//   private resolve?: Function | null;

//   constructor() { }

//   isEnabled() {
//     return !!(
//       window.medicmobile_android
//       && typeof window.medicmobile_android.launchExternalApp === 'function'
//     );
//   }

//   resolveAndroidAppResponse(response: Record<string, any>) {
//     if (!this.resolve) {
//       return;
//     }

//     this.resolve(response);
//     this.resolve = null;
//   }

//   launchAndroidApp(chtAndroidApp: ChtAndroidApp): Promise<any> {
//     return new Promise((resolve, reject) => {
//       this.resolve = resolve;
//       try {
//         this.executeLaunch(chtAndroidApp);
//       } catch (error) {
//         console.error('Error when launching Android app', error);
//         this.resolve = null;
//         const details = `ChtAndroidApp=${JSON.stringify(chtAndroidApp)}, Enabled=${this.isEnabled()}`;
//         const message = `AndroidAppLauncherService :: Error when launching Android app. ${details}`;
//         reject(message);
//       }
//     });
//   }

//   private executeLaunch(chtAndroidApp: ChtAndroidApp) {
//     const { action, category, type, extras, uri, packageName, flags } = chtAndroidApp;

//     // If any parameter is undefined, then ensure that it's null value
//     // Otherwise Android will receive a string with "undefined" as text.
//     window.medicmobile_android.launchExternalApp(
//       action || null,
//       category || null,
//       type || null,
//       extras ? JSON.stringify(extras) : null,
//       uri || null,
//       packageName || null,
//       flags || null
//     );
//   }
// }

// interface ChtAndroidApp {
//   action: string;
//   category?: string;
//   type?: string;
//   extras?: Record<string, any>;
//   uri?: string;
//   packageName?: string;
//   flags?: number;
// }


import { Injectable } from '@angular/core';
// --- CHANGED --- Corrected the import to use PerformanceTracker from the local file
import { PerformanceService, PerformanceTracker } from './performance.service';

@Injectable({
  providedIn: 'root'
})
export class AndroidAppLauncherService {
  private resolve?: Function | null;

  // --- ADDED --- Properties to hold the tracker and action name
  private appLaunchTracker: PerformanceTracker | undefined;
  private externalAppAction: string | undefined;

  // --- MODIFIED CONSTRUCTOR --- Injected PerformanceService
  constructor(private performanceService: PerformanceService) { }

  isEnabled() {
    return !!(
      (window as any).medicmobile_android &&
      typeof (window as any).medicmobile_android.launchExternalApp === 'function'
    );
  }

  resolveAndroidAppResponse(response: Record<string, any>) {
    // --- ADDED --- Stop the timer and record the telemetry data
    if (this.appLaunchTracker && this.externalAppAction) {
      const trackingName = `enketo:external-app:${this.externalAppAction}`;
      this.appLaunchTracker.stop({ name: trackingName });
      this.appLaunchTracker = undefined;
      this.externalAppAction = undefined;
    }

    if (!this.resolve) {
      return;
    }

    this.resolve(response);
    this.resolve = null;
  }

  launchAndroidApp(chtAndroidApp: ChtAndroidApp): Promise<any> {
    // --- ADDED --- Start the timer and store the action name for later
    this.externalAppAction = chtAndroidApp.action;
    this.appLaunchTracker = this.performanceService.track();

    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      try {
        this.executeLaunch(chtAndroidApp);
      } catch (error) {
        console.error('Error when launching Android app', error);
        this.resolve = null;

        // --- ADDED --- Clean up the tracker if the launch fails
        this.appLaunchTracker = undefined;
        this.externalAppAction = undefined;

        const details = `ChtAndroidApp=${JSON.stringify(chtAndroidApp)}, Enabled=${this.isEnabled()}`;
        const message = `AndroidAppLauncherService :: Error when launching Android app. ${details}`;
        reject(message);
      }
    });
  }

  private executeLaunch(chtAndroidApp: ChtAndroidApp) {
    const { action, category, type, extras, uri, packageName, flags } = chtAndroidApp;

    (window as any).medicmobile_android.launchExternalApp(
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