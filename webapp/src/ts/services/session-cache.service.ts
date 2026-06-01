import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';

import { SessionService } from '@mm-services/session.service';
import { LocationService } from '@mm-services/location.service';

const SESSION_CACHE_KEY = 'cht-session-cache';
const USER_CTX_COOKIE = 'userCtx';
const LOGIN_COOKIE = 'login';

export interface CachedAccount {
  username: string;
}

type SessionCache = Record<string, string>;

@Injectable({
  providedIn: 'root'
})
export class SessionCacheService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly cookieService: CookieService,
    private readonly router: Router,
    private readonly locationService: LocationService,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  async switchUser(): Promise<void> {
    this.cacheActiveSession();
    this.clearActiveSession();
    await this.router.navigate(['/switch-user']);
  }

  cacheCurrentSessionForSelector(): void {
    if (this.cacheActiveSession()) {
      this.clearActiveSession();
    }
  }

  cacheActiveSession(): boolean {
    const userCtx = this.sessionService.userCtx();
    const username = userCtx?.name;
    const sessionToken = this.cookieService.get(USER_CTX_COOKIE);
    if (!username || !sessionToken) {
      return false;
    }

    const sessionCache = this.getSessionCache();
    sessionCache[username] = sessionToken;
    this.setSessionCache(sessionCache);
    return true;
  }

  listCachedAccounts(): CachedAccount[] {
    return Object
      .keys(this.getSessionCache())
      .sort((left, right) => left.localeCompare(right))
      .map(username => ({ username }));
  }

  restoreSession(username: string): boolean {
    const sessionToken = this.getSessionCache()[username];
    if (!sessionToken) {
      return false;
    }

    this.cookieService.set(USER_CTX_COOKIE, sessionToken, undefined, '/');
    this.cookieService.delete(LOGIN_COOKIE, '/');
    this.sessionService.userCtxCookieValue = undefined;
    this.document.location.href = this.getAppUrl('#/home');
    return true;
  }

  navigateToAddAccountLogin(): void {
    const redirect = encodeURIComponent(this.getAppUrl('#/switch-user'));
    this.document.location.href = `/${this.locationService.dbName}/login?redirect=${redirect}`;
  }

  private clearActiveSession(): void {
    this.cookieService.delete(USER_CTX_COOKIE, '/');
    this.cookieService.delete(LOGIN_COOKIE, '/');
    this.sessionService.userCtxCookieValue = undefined;
  }

  private getAppUrl(hashPath: string): string {
    return `${this.document.location.pathname}${hashPath}`;
  }

  private getSessionCache(): SessionCache {
    const raw = this.getStorage().getItem(SESSION_CACHE_KEY);
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {};
      }

      return Object.entries(parsed).reduce((cache, [username, token]) => {
        if (typeof token === 'string') {
          cache[username] = token;
        }
        return cache;
      }, {} as SessionCache);
    } catch (error) {
      console.warn('Unable to parse cached sessions', error);
      return {};
    }
  }

  private setSessionCache(sessionCache: SessionCache): void {
    this.getStorage().setItem(SESSION_CACHE_KEY, JSON.stringify(sessionCache));
  }

  private getStorage(): Storage {
    return this.document.defaultView?.localStorage || window.localStorage;
  }
}
