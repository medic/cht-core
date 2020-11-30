import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '@mm-services/auth.service';
import { HeaderTabsService } from '@mm-services/header-tabs.service';

@Component({
  template: '',
})
export class HomeComponent implements OnInit {

  constructor(
    private authService:AuthService,
    private headerTabsService:HeaderTabsService,
    private router:Router,
  ) { }

  ngOnInit() {
    return this.findFirstAuthorizedTab().then(route => {
      if (!route) {
        route = 'error';
      }
      this.router.navigate([route]);
    });
  }

  findFirstAuthorizedTab() {
    const tabs = this.headerTabsService.get();
    return Promise
      .all(tabs.map(tab => this.authService.has(tab.permissions)))
      .then(results => {
        const idx = results.findIndex(result => result);
        if (idx === -1) {
          return;
        }
        return tabs[idx].route;
      });
  }
}
