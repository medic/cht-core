import { Injectable, NgZone } from '@angular/core';

import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { DbService } from '@mm-services/db.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { isValidGeolocation } from '@mm-services/contact-geolocation.service';
import { MAP_MAX_DATA_ZOOM, MAP_TILES_URL } from '@mm-components/map/map-style';

export const LAST_PREFETCH_DATE_KEY = 'medic-map-tiles-prefetch-date';

const RUN_INTERVAL = 24 * 60 * 60 * 1000;
const RADIUS_METERS = 5 * 1000;
const METERS_PER_DEGREE = 111195;
const CONCURRENCY = 4;
// ~140 tiles cover the default radius around one facility; this is a safety valve against odd configurations
const MAX_TILES = 1000;
const MAX_CONSECUTIVE_FAILURES = 3;
const CACHE_NAME = 'cht-map-tiles';

/**
 * Downloads the map tiles covering the area around the user's facilities, so maps work in the field even for
 * households never viewed while online. Runs at most once a day, after a successful sync: the requests go through
 * the service worker, whose runtime caching route stores the responses (see api/src/generate-service-worker.js).
 */
@Injectable({
  providedIn: 'root'
})
export class MapTilesPrefetchService {
  private initialized = false;
  private running = false;

  constructor(
    private dbService: DbService,
    private dbSyncService: DBSyncService,
    private userSettingsService: UserSettingsService,
    private telemetryService: TelemetryService,
    private ngZone: NgZone,
  ) {
  }

  init() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    this.dbSyncService.subscribe(({ to, from }) => {
      if (to !== SyncStatus.Success || from !== SyncStatus.Success) {
        return;
      }
      this.ngZone.runOutsideAngular(() => {
        void this.prefetch().catch(error => console.error('Error while prefetching map tiles', error));
      });
    });
  }

  private async prefetch() {
    if (this.running || !this.isDue() || !this.isControlled()) {
      return;
    }

    this.running = true;
    try {
      const geolocations = await this.getFacilityGeolocations();
      if (!geolocations.length) {
        return;
      }

      const urls = await this.getUncachedUrls(this.getTileUrls(geolocations));
      const { downloaded, aborted } = await this.downloadAll(urls);
      if (aborted) {
        console.warn(`Map tiles prefetch aborted after downloading ${downloaded}/${urls.length} tiles`);
        return; // not marking the run as done, so the next successful sync retries
      }

      window.localStorage.setItem(LAST_PREFETCH_DATE_KEY, Date.now().toString());
      if (downloaded) {
        void this.telemetryService.record('map:tiles-prefetch', downloaded);
      }
    } finally {
      this.running = false;
    }
  }

  private isDue() {
    const lastRun = Number(window.localStorage.getItem(LAST_PREFETCH_DATE_KEY));
    return !lastRun || Date.now() - lastRun >= RUN_INTERVAL;
  }

  // without a controlling service worker the responses would not be cached, making the downloads pointless
  private isControlled() {
    return !!window.navigator.serviceWorker?.controller;
  }

  private async getFacilityGeolocations() {
    const userSettings = await this.userSettingsService.get() as any;
    const ids = [userSettings.facility_id].flat().filter(Boolean);
    if (!ids.length) {
      return [];
    }
    const result = await this.dbService.get().allDocs({ keys: ids, include_docs: true });
    return result.rows
      .map(row => row.doc?.geolocation)
      .filter(isValidGeolocation);
  }

  private getTileUrls(geolocations) {
    const urls = new Set<string>();
    for (const geolocation of geolocations) {
      for (let zoom = 0; zoom <= MAP_MAX_DATA_ZOOM; zoom++) {
        this.addTileUrls(urls, geolocation, zoom);
      }
    }

    if (urls.size > MAX_TILES) {
      console.warn(`Map tiles prefetch needs ${urls.size} tiles, only the first ${MAX_TILES} will be downloaded`);
    }
    return [...urls].slice(0, MAX_TILES);
  }

  private addTileUrls(urls: Set<string>, { latitude, longitude }, zoom: number) {
    const latitudeDelta = RADIUS_METERS / METERS_PER_DEGREE;
    const longitudeDelta = latitudeDelta / Math.max(Math.cos(latitude * Math.PI / 180), 0.01);

    const maxIndex = 2 ** zoom - 1;
    const clamp = (value) => Math.min(Math.max(value, 0), maxIndex);
    const west = clamp(this.toTileX(longitude - longitudeDelta, zoom));
    const east = clamp(this.toTileX(longitude + longitudeDelta, zoom));
    const north = clamp(this.toTileY(latitude + latitudeDelta, zoom));
    const south = clamp(this.toTileY(latitude - latitudeDelta, zoom));

    for (let x = west; x <= east; x++) {
      for (let y = north; y <= south; y++) {
        urls.add(MAP_TILES_URL.replace('{z}', `${zoom}`).replace('{x}', `${x}`).replace('{y}', `${y}`));
      }
    }
  }

  private toTileX(longitude: number, zoom: number) {
    return Math.floor((longitude + 180) / 360 * 2 ** zoom);
  }

  private toTileY(latitude: number, zoom: number) {
    const radians = latitude * Math.PI / 180;
    return Math.floor((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * 2 ** zoom);
  }

  private async getUncachedUrls(urls: string[]) {
    const cache = await window.caches.open(CACHE_NAME);
    const uncached: string[] = [];
    for (const url of urls) {
      if (!await cache.match(url)) {
        uncached.push(url);
      }
    }
    return uncached;
  }

  private async downloadAll(urls: string[]) {
    let index = 0;
    let downloaded = 0;
    let consecutiveFailures = 0;
    let aborted = false;

    const worker = async () => {
      while (index < urls.length && !aborted) {
        const url = urls[index++];
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch tile: ${response.status}`);
          }
          await response.body?.cancel(); // the service worker already stored its clone
          downloaded++;
          consecutiveFailures = 0;
        } catch {
          // individual failures are expected on flaky connections; repeated ones mean we (probably) went offline
          if (++consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            aborted = true;
          }
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    return { downloaded, aborted };
  }
}
