import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';

const TRANSIT_DOC_ID = '_local/p2p-transit-docs';

/**
 * Loads _local/p2p-transit-docs from PouchDB and provides transit doc filtering.
 *
 * Transit docs NEVER appear in UI (contacts, search, tasks, reports, targets).
 * Transit index load < 50ms.
 */
@Injectable({ providedIn: 'root' })
export class P2pTransitFilterService {
  private transitDocIds: Set<string> = new Set();
  private loaded = false;
  private loading: Promise<void> | null = null;

  constructor(private readonly dbService: DbService) {}

  /**
   * Load transit doc IDs from _local/p2p-transit-docs.
   * Tries native bridge first for real-time IDs, falls back to PouchDB.
   * Ensures only one load runs at a time.
   */
  async loadTransitIndex(): Promise<void> {
    if (this.loaded) {
      return;
    }
    if (this.loading) {
      return this.loading;
    }
    this.loading = this.doLoad();
    try {
      await this.loading;
    } finally {
      this.loading = null;
    }
  }

  private async doLoad(): Promise<void> {
    const bridgeIds = this.loadFromBridge();
    if (bridgeIds) {
      this.transitDocIds = bridgeIds;
      this.loaded = true;
      return;
    }

    this.transitDocIds = await this.loadFromPouchDb();
    this.loaded = true;
  }

  private loadFromBridge(): Set<string> | null {
    const bridge = (window as any).medicmobile_android;
    if (!bridge || typeof bridge.p2pGetTransitDocIds !== 'function') {
      return null;
    }
    try {
      const raw = bridge.p2pGetTransitDocIds();
      const parsed: string[] = JSON.parse(raw);
      return new Set(parsed);
    } catch (err) {
      console.debug('P2pTransitFilter: bridge call failed, falling back to PouchDB', err);
      return null;
    }
  }

  private async loadFromPouchDb(): Promise<Set<string>> {
    const ids = new Set<string>();
    try {
      const db = this.dbService.get();
      const doc = await db.get(TRANSIT_DOC_ID);
      const transitIndex: Record<string, string> = doc.transit_index || {};
      for (const docId of Object.keys(transitIndex)) {
        ids.add(docId);
      }
    } catch (err: any) {
      if (err.status !== 404) {
        console.error('P2pTransitFilter: failed to load transit index', err);
      }
      // 404 means no transit docs — expected for CHWs or fresh installs
    }
    return ids;
  }

  /**
   * Check if a doc ID is a transit doc (should be hidden from UI).
   * transit docs must never appear in contacts, search, tasks, reports, targets.
   */
  isTransitDoc(docId: string): boolean {
    return this.transitDocIds.has(docId);
  }

  /**
   * Filter transit docs from a list of results.
   * Used by contacts, reports, search results, etc.
   * Returns the original array unchanged if there are no transit docs (zero overhead).
   */
  filterTransitDocs<T extends { _id: string }>(docs: T[]): T[] {
    if (this.transitDocIds.size === 0) {
      return docs;
    }
    return docs.filter(doc => !this.transitDocIds.has(doc._id));
  }

  /**
   * Get count of transit docs currently tracked (for status display).
   */
  getTransitDocCount(): number {
    return this.transitDocIds.size;
  }

  /**
   * Get all transit doc IDs (for purge and diagnostics).
   */
  getTransitDocIds(): Set<string> {
    return new Set(this.transitDocIds);
  }

  /**
   * Refresh the transit index (called after sync or purge).
   */
  async refresh(): Promise<void> {
    this.loaded = false;
    await this.loadTransitIndex();
  }

  /**
   * Check if transit index has been loaded.
   */
  isLoaded(): boolean {
    return this.loaded;
  }
}
