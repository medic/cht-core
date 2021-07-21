import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ExternalAppLauncherService {
  appsToResolve: Record<string, Function> = { };

  constructor() { }

  isEnabled() {
    return !!(
      window.medicmobile_android
      && typeof window.medicmobile_android.cht_launchExternalApp === 'function'
    );
  }

  launchExternalApp(appID: string, appName: string, inputs: Record<string, any>): Promise<any>|undefined {
    try {
      window.medicmobile_android.cht_launchExternalApp(appID, appName, inputs);
      return new Promise(resolve => this.appsToResolve[appID] = resolve);
    } catch (error) {
      console.error(
        `ExternalAppLauncherService :: Error when launching external app with id: ${appID} and name: ${appName}`,
        error
      );
    }
  }

  resolveExternalAppResponse(response: Record<string, any>) {
    if (!response?.appID || !this.appsToResolve[response.appID]) {
      return;
    }

    this.appsToResolve[response.appID](response);
  }
}
