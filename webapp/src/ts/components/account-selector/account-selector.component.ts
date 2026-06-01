import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

import { SessionCacheService, CachedAccount } from '@mm-services/session-cache.service';

@Component({
  templateUrl: './account-selector.component.html',
  imports: [
    NgFor,
    NgIf,
  ],
})
export class AccountSelectorComponent implements OnInit {
  accounts: CachedAccount[] = [];

  constructor(private readonly sessionCacheService: SessionCacheService) {}

  ngOnInit(): void {
    this.sessionCacheService.cacheCurrentSessionForSelector();
    this.accounts = this.sessionCacheService.listCachedAccounts();
  }

  addAccount(): void {
    this.sessionCacheService.navigateToAddAccountLogin();
  }

  selectAccount(username: string): void {
    if (!this.sessionCacheService.restoreSession(username)) {
      console.warn(`No cached session found for "${username}"`);
    }
  }
}
