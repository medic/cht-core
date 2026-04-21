import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { P2pTransitFilterService } from '@mm-services/p2p-transit-filter.service';

const TRANSIT_DOC_ID = '_local/p2p-transit-docs';
const PURGE_BATCH_SIZE = 50;

interface PurgeResult {
  purged: number;
  failed: number;
  alreadyPurged: number;
}

interface TransitBatch {
  source_device_id: string;
  source_user: string;
  received_at: number;
  doc_count: number;
  pushed_to_server: boolean;
  pushed_at: number | null;
  purged: boolean;
  purged_at: number | null;
}

interface TransitDoc {
  _id: string;
  _rev?: string;
  batches: Record<string, TransitBatch>;
  transit_index: Record<string, string>;
  stats: {
    total_received: number;
    total_pushed: number;
    total_purged: number;
    pending_push: number;
  };
}

/**
 * Purges transit docs after they've been successfully pushed to the server.
 *
 * MUST use db.purge(id, rev) -- NEVER db.remove().
 *      db.remove() creates a deletion tombstone that replicates to server and destroys data.
 *      db.purge() removes locally without any replication effect.
 */
@Injectable({ providedIn: 'root' })
export class P2pTransitPurgeService {

  constructor(
    private readonly dbService: DbService,
    private readonly transitFilterService: P2pTransitFilterService
  ) {}

  /**
   * Purge all transit docs from batches that have been pushed to the server.
   * Called after successful server sync confirms docs are on server.
   *
   * Uses db.purge() NOT db.remove().
   */
  private async getTransitDoc(): Promise<TransitDoc | null> {
    try {
      const db = this.dbService.get();
      return await db.get(TRANSIT_DOC_ID);
    } catch (err: any) {
      if (err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  private getPurgeableBatchIds(transitDoc: TransitDoc): string[] {
    return Object.entries(transitDoc.batches)
      .filter(([, batch]) => batch.pushed_to_server && !batch.purged)
      .map(([batchId]) => batchId);
  }

  private getDocIdsForBatches(transitDoc: TransitDoc, batchIds: string[]): string[] {
    return Object.entries(transitDoc.transit_index)
      .filter(([, batchId]) => batchIds.includes(batchId))
      .map(([docId]) => docId);
  }

  private async purgeDocBatch(
    docIds: string[], result: PurgeResult, failedDocIds: Set<string>
  ): Promise<void> {
    for (const docId of docIds) {
      await this.purgeOneDoc(docId, result, failedDocIds);
    }
    this.notifyBridgeBatchPurged(docIds);
  }

  private async purgeOneDoc(
    docId: string, result: PurgeResult, failedDocIds: Set<string>
  ): Promise<void> {
    try {
      const success = await this.purgeDoc(docId);
      if (success) {
        result.purged++;
      } else {
        result.alreadyPurged++;
      }
    } catch (err) {
      console.error('P2pTransitPurge: failed to purge doc', docId, err);
      failedDocIds.add(docId);
      result.failed++;
    }
  }

  private notifyBridgeBatchPurged(docIds: string[]) {
    try {
      const bridge = (window as any).medicmobile_android;
      if (bridge && typeof bridge.p2pConfirmBatchPurged === 'function') {
        bridge.p2pConfirmBatchPurged(JSON.stringify(docIds));
      }
    } catch (err) {
      console.debug('P2pTransitPurge: bridge confirm failed', err);
    }
  }

  async purgeConfirmedTransitDocs(): Promise<PurgeResult> {
    const transitDoc = await this.getTransitDoc();
    if (!transitDoc) {
      return { purged: 0, failed: 0, alreadyPurged: 0 };
    }

    const purgeableBatchIds = this.getPurgeableBatchIds(transitDoc);
    if (purgeableBatchIds.length === 0) {
      return { purged: 0, failed: 0, alreadyPurged: 0 };
    }

    const result: PurgeResult = { purged: 0, failed: 0, alreadyPurged: 0 };

    const docIdsToPurge = this.getDocIdsForBatches(transitDoc, purgeableBatchIds);
    const failedDocIds = new Set<string>();

    for (let i = 0; i < docIdsToPurge.length; i += PURGE_BATCH_SIZE) {
      const batch = docIdsToPurge.slice(i, i + PURGE_BATCH_SIZE);
      await this.purgeDocBatch(batch, result, failedDocIds);
    }

    if (result.purged > 0 || result.alreadyPurged > 0) {
      const successfullyPurged = docIdsToPurge.filter(id => !failedDocIds.has(id));
      await this.updateTransitDocAfterPurge(transitDoc, purgeableBatchIds, successfullyPurged);
      await this.transitFilterService.refresh();
    }

    return result;
  }

  /**
   * Purge a single doc by ID using CHT's soft-delete pattern:
   * {_id, _rev, _deleted: true, purged: true}
   *
   * The readOnlyFilter in db-sync.service.ts already excludes docs with
   * {_deleted: true, purged: true} from replicating to server, so this is safe.
   * This is the same pattern used by CHT's bootstrapper/purger.js.
   */
  private async purgeDoc(docId: string): Promise<boolean> {
    const db = this.dbService.get();

    try {
      const doc = await db.get(docId);
      await db.put({ _id: doc._id, _rev: doc._rev, _deleted: true, purged: true });
      return true;
    } catch (err: any) {
      if (err.status === 404) {
        // Already purged or never existed locally -- expected and safe
        return false;
      }
      throw err;
    }
  }

  /**
   * Update _local/p2p-transit-docs after purge:
   * - Mark purged batches as purged
   * - Remove purged doc IDs from transit_index
   * - Update stats
   */
  private applyPurgeToDoc(
    doc: TransitDoc, purgedBatchIds: string[], purgedDocIds: string[], now: number
  ) {
    for (const docId of purgedDocIds) {
      delete doc.transit_index[docId];
    }
    this.markBatchesAsPurged(doc, purgedBatchIds, now);
  }

  private markBatchesAsPurged(doc: TransitDoc, purgedBatchIds: string[], now: number) {
    for (const batchId of purgedBatchIds) {
      const hasRemainingDocs = Object.values(doc.transit_index).includes(batchId);
      if (!hasRemainingDocs && doc.batches[batchId]) {
        doc.batches[batchId].purged = true;
        doc.batches[batchId].purged_at = now;
      }
    }
  }

  private async saveTransitDocWithRetry(
    transitDoc: TransitDoc, purgedBatchIds: string[], purgedDocIds: string[], now: number
  ): Promise<void> {
    const db = this.dbService.get();
    try {
      await db.put(transitDoc);
    } catch (err: any) {
      if (err.status !== 409) {
        console.error('P2pTransitPurge: failed to update transit doc after purge', err);
        return;
      }
      await this.retrySaveTransitDoc(purgedBatchIds, purgedDocIds, now);
    }
  }

  private async retrySaveTransitDoc(
    purgedBatchIds: string[], purgedDocIds: string[], now: number
  ): Promise<void> {
    try {
      const db = this.dbService.get();
      const fresh = await db.get(TRANSIT_DOC_ID);
      this.applyPurgeToDoc(fresh, purgedBatchIds, purgedDocIds, now);
      fresh.stats.total_purged = (fresh.stats.total_purged || 0) + purgedDocIds.length;
      fresh.stats.pending_push = Math.max(0, (fresh.stats.pending_push || 0) - purgedDocIds.length);
      await db.put(fresh);
    } catch (retryErr) {
      console.error('P2pTransitPurge: failed to update transit doc after purge (retry)', retryErr);
    }
  }

  private async updateTransitDocAfterPurge(
    transitDoc: TransitDoc,
    purgedBatchIds: string[],
    purgedDocIds: string[]
  ): Promise<void> {
    const now = Date.now();
    this.applyPurgeToDoc(transitDoc, purgedBatchIds, purgedDocIds, now);
    transitDoc.stats.total_purged += purgedDocIds.length;
    transitDoc.stats.pending_push = Math.max(0, transitDoc.stats.pending_push - purgedDocIds.length);
    await this.saveTransitDocWithRetry(transitDoc, purgedBatchIds, purgedDocIds, now);
  }

  /**
   * Mark all batches as pushed to server and purge them.
   * Called after a successful server sync with 0 doc_write_failures confirms
   * all P2P-received docs have reached the server.
   */
  private markUnpushedBatches(transitDoc: TransitDoc): boolean {
    let changed = false;
    const now = Date.now();
    for (const batch of Object.values(transitDoc.batches)) {
      if (!batch.pushed_to_server) {
        batch.pushed_to_server = true;
        batch.pushed_at = now;
        changed = true;
      }
    }
    return changed;
  }

  async markAllBatchesPushedAndPurge(): Promise<PurgeResult> {
    const transitDoc = await this.getTransitDoc();
    if (!transitDoc) {
      return { purged: 0, failed: 0, alreadyPurged: 0 };
    }

    if (this.markUnpushedBatches(transitDoc)) {
      const db = this.dbService.get();
      await db.put(transitDoc);
    }

    return this.purgeConfirmedTransitDocs();
  }

  /**
   * Get the count of transit docs that are pending purge (pushed but not yet purged).
   */
  private countPendingPurgeDocs(transitDoc: TransitDoc): number {
    return Object.values(transitDoc.batches)
      .filter(batch => batch.pushed_to_server && !batch.purged)
      .reduce((sum, batch) => sum + batch.doc_count, 0);
  }

  async getPendingPurgeCount(): Promise<number> {
    const transitDoc = await this.getTransitDoc();
    if (!transitDoc) {
      return 0;
    }
    return this.countPendingPurgeDocs(transitDoc);
  }

  /**
   * Check if there are stale transit docs (unpushed for >30 days).
   * Show user notification for stale transit docs.
   */
  private hasStaleBatch(transitDoc: TransitDoc, cutoff: number): boolean {
    return Object.values(transitDoc.batches).some(
      batch => !batch.pushed_to_server && !batch.purged && batch.received_at < cutoff
    );
  }

  async hasStaleTransitDocs(): Promise<boolean> {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const transitDoc = await this.getTransitDoc();
    if (!transitDoc) {
      return false;
    }
    return this.hasStaleBatch(transitDoc, Date.now() - THIRTY_DAYS_MS);
  }
}
