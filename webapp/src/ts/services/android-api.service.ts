import { Injectable, NgZone } from '@angular/core';

import { AndroidAppLauncherService } from '@mm-services/android-app-launcher.service';
import { GeolocationService } from '@mm-services/geolocation.service';
import { MRDTService } from '@mm-services/mrdt.service';
import { SessionService } from '@mm-services/session.service';
import { NavigationService } from '@mm-services/navigation.service';

/**
 * An API to provide integration with the medic-android app.
 *
 * This service must maintain backwards compatibility as we cannot
 * guarantee the all clients will be on a recent version of the app.
 */
@Injectable({
  providedIn: 'root',
})
export class AndroidApiService {

  constructor(
    private androidAppLauncherService:AndroidAppLauncherService,
    private geolocationService:GeolocationService,
    private mrdtService:MRDTService,
    private sessionService:SessionService,
    private zone:NgZone,
    private navigationService:NavigationService,
  ) { }

  private runInZone(property:string, args:any[]=[]) {
    if (!this[property] || typeof this[property] !== 'function') {
      return;
    }

    if (NgZone.isInAngularZone()) {
      return this[property](...args);
    }

    return this.zone.run(() => this[property](...args));
  }

  /**
   * Close all select2 dropdowns
   * @return {boolean} `true` if any select2s were closed.
   */
  private closeSelect2($container) {
    // If there are any select2 dropdowns open, close them.  The select
    // boxes are closed while they are checked - this saves us having to
    // iterate over them twice
    let closed = false;
    $container
      .find('select.select2-hidden-accessible')
      .each(function() {
        const elem = <any>$(this);
        if (elem.select2('isOpen')) {
          elem.select2('close');
          closed = true;
        }
      });
    return closed;
  }

  /**
   * Close the highest-priority dropdown within a particular container.
   * @return {boolean} `true` if a dropdown was closed; `false` otherwise.
   */
  private closeDropdownsIn($container) {
    if (this.closeSelect2($container)) {
      return true;
    }

    // todo: this probably won't work because dropdowns are now angular directives!

    // If there is a dropdown menu open, close it
    const $dropdown = $container.find('.filter.dropdown.open:visible');
    if ($dropdown.length) {
      $dropdown.removeClass('open');
      return true;
    }

    // On an Enketo form, go to the previous page (if there is one)
    if ($container.find('.enketo .btn.previous-page:visible:enabled:not(".disabled")').length) {
      window.history.back();
      return true;
    }

    return false;
  }

  /*
   * Find the modal with highest z-index, and ignore the rest
   */
  private closeTopModal($modals) {
    let $topModal;
    $modals.each(function() {
      const $modal = $(this);
      if (!$topModal) {
        $topModal = $modal;
        return;
      }
      if ($topModal.css('z-index') <= $modal.css('z-index')) {
        $topModal = $modal;
      }
    });

    if (!this.closeDropdownsIn($topModal)) {
      // Try to close by clicking modal's top-right `X` or `[ Cancel ]`
      // button.
      $topModal
        .find('.btn.cancel:visible:not(:disabled), button.close:visible:not(:disabled)')
        .click();
    }
  }

  private closeUserInterfaceElements() {
    // If there's a modal open, close any dropdowns inside it, or try to close the modal itself.
    const $modals = $('.modal:visible');
    if ($modals.length) {
      this.closeTopModal($modals);
      return true;
    }

    // If the hotdog hamburger options menu is open, close it
    const $optionsMenu = $('.dropdown.options.open');
    if ($optionsMenu.length) {
      $optionsMenu.removeClass('open');
      return true;
    }

    // If there is an actionbar drop-up menu open, close it
    const $dropup = $('.actions.dropup.open:visible');
    if ($dropup.length) {
      $dropup.removeClass('open');
      return true;
    }

    if (this.closeDropdownsIn($('body'))) {
      return true;
    }

    // Nothing to close.
    return false;
  }

  /**
   * Handle hardware back-button when it's pressed inside the Android app.
   *
   * This function is intended to always return 'true' and not give back the control of back-button to the Android app.
   * This prevents Android from minimizing the app when the primary tab is active. Ref: #6698.
   *
   * Warning: If this function returns a falsy value, the Android app will handle the back-button
   *          and possibly minimize the app.
   *
   * @return {boolean}
   */
  back() {
    if (this.closeUserInterfaceElements()) {
      return true;
    }

    if (this.navigationService.goBack()) {
      return true;
    }

    this.navigationService.goToPrimaryTab();
    // Not giving back the control to the Android app so it doesn't minimize the app. Ref: #6698
    return true;
  }

  /**
   * Kill the session.
   */
  logout() {
    this.sessionService.logout();
  }

  /**
   * Handle the response from the MRDT app
   * @param response The stringified JSON response from the MRDT app.
   */
  mrdtResponse(response) {
    try {
      this.mrdtService.respond(JSON.parse(response));
    } catch (e) {
      return console.error(
        new Error(`Unable to parse JSON response from android app: "${response}", error message: "${e.message}"`)
      );
    }
  }

  /**
   * Handle the response from the MRDT app
   * @param response The stringified JSON response from the MRDT app.
   */
  mrdtTimeTakenResponse(response) {
    try {
      this.mrdtService.respondTimeTaken(JSON.parse(response));
    } catch (e) {
      return console.error(
        new Error(`Unable to parse JSON response from android app: "${response}", error message: "${e.message}"`)
      );
    }
  }

  smsStatusUpdate(id, destination, content, status, detail) {
    console.debug('smsStatusUpdate() :: ' +
      ' id=' + id +
      ', destination=' + destination +
      ', content=' + content +
      ', status=' + status +
      ', detail=' + detail);
    // TODO storing status updates for SMS should be implemented as part of #4812
  }

  locationPermissionRequestResolve() {
    this.geolocationService.permissionRequestResolved();
  }

  resolveCHTExternalAppResponse(response) {
    this.androidAppLauncherService.resolveAndroidAppResponse(response);
  }

  v1 = {
    back: () => this.runInZone('back'),
    logout: () => this.runInZone('logout'),
    mrdtResponse: (...args) => this.runInZone('mrdtResponse', args),
    mrdtTimeTakenResponse: (...args) => this.runInZone('mrdtTimeTakenResponse', args),
    smsStatusUpdate: (...args) => this.runInZone('smsStatusUpdate', args),
    locationPermissionRequestResolved: () => this.runInZone('locationPermissionRequestResolve'),
    resolveCHTExternalAppResponse: (...args) => this.runInZone('resolveCHTExternalAppResponse', args),
  };
}
