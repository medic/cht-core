import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';

import { RouteSnapshotService } from '@mm-services/route-snapshot.service';
import { Selectors } from '@mm-selectors/index';
import { HeaderTabsService } from '@mm-services/header-tabs.service';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private primaryTab;
  private currentTab;

  constructor(
    private router: Router,
    private routeSnapshotService: RouteSnapshotService,
    private headerTabsService: HeaderTabsService,
    private store: Store,
  ) {
    this.subscribeToStore();
    this.getPrimaryTab();
  }

  private subscribeToStore() {
    this.store
      .select(Selectors.getCurrentTab)
      .subscribe(currentTab => this.currentTab = currentTab);
  }

  private getPrimaryTab() {
    this.headerTabsService
      .getPrimaryTab() // Not passing settings since icons aren't needed.
      .then(tab => this.primaryTab = tab);
  }

  /**
   * Navigates back.
   * @returns {boolean} Returns true if it navigated, returns false if it didn't navigated.
   */
  goBack(): boolean {
    const routeSnapshot = this.routeSnapshotService.get();

    if (!routeSnapshot) {
      console.error('NavigationService :: Cannot navigate back, routeSnapshot is undefined.');
      return false;
    }

    if (routeSnapshot.data?.name === 'contacts.deceased') {
      this.router.navigate(['/contacts', routeSnapshot.params?.id]);
      return true;
    }

    if (routeSnapshot.params?.id || routeSnapshot.params?.type_id) {
      const path = routeSnapshot.parent?.pathFromRoot?.map(route => route?.routeConfig?.path || '/');

      if (!path) {
        console.error('NavigationService :: Cannot determine path to navigate back');
        return false;
      }

      this.router.navigate(path);
      return true;
    }

    return false;
  }

  /**
   * Navigates to primary tab.
   * @returns {boolean} Returns true if it navigated, returns false if it didn't navigated.
   */
  goToPrimaryTab(): boolean {
    if (this.primaryTab?.name === this.currentTab) {
      return false;
    }

    if (!this.primaryTab?.route) {
      console.error('NavigationService :: Cannot navigate to primary tab, route is undefined.');
      return false;
    }

    this.router.navigate([ this.primaryTab.route ]);
    return true;
  }
}
