import { Injectable } from '@angular/core';

import { ChangesService } from '@mm-services/changes.service';
import { DbService } from '@mm-services/db.service';

@Injectable({
  providedIn: 'root'
})
export class ZScoreService {
  private tables;
  private readonly CONFIGURATION_DOC_ID = 'zscore-charts';
  private readonly MINIMUM_Z_SCORE = -4;
  private readonly MAXIMUM_Z_SCORE = 4;

  constructor(
    private changesService:ChangesService,
    private dbService:DbService,
  ) {
    this.changesService.subscribe({
      key: 'zscore-service',
      filter: (change) => change.id === this.CONFIGURATION_DOC_ID,
      callback: () => this.init(),
    });
  }

  private findTable(id) {
    for (let i = 0; i < this.tables.length; i++) {
      if (this.tables[i].id === id) {
        return this.tables[i];
      }
    }
  }

  private findClosestDataSet(data, key) {
    if (key < data[0].key || key > data[data.length - 1].key) {
      // the key isn't covered by the configured data points
      return;
    }
    const current:any = { diff: Infinity };
    data.forEach((datum) => {
      const diff = Math.abs(datum.key - key);
      if (diff < current.diff) {
        current.diff = diff;
        current.points = datum.points;
      }
    });
    return current.points;
  }

  private findZScore(data, key) {
    let lowerIndex = -1;
    data.forEach((datum, i) => {
      if (datum <= key) {
        lowerIndex = i;
      }
    });
    if (lowerIndex === -1) {
      // given key is less than the minimum standard deviation
      return this.MINIMUM_Z_SCORE;
    }
    if (lowerIndex >= data.length - 1) {
      // given key is above the maximum standard deviation
      return this.MAXIMUM_Z_SCORE;
    }
    const upperIndex = lowerIndex + 1;
    const lowerValue = data[lowerIndex];
    const upperValue = data[upperIndex];
    const ratio = (key - lowerValue) / (upperValue - lowerValue);
    return lowerIndex + this.MINIMUM_Z_SCORE + ratio;
  }

  private calculate(data, x, y) {
    const xAxisData = this.findClosestDataSet(data, x);
    if (!xAxisData) {
      // the key lies outside of the lookup table range
      return;
    }
    return this.findZScore(xAxisData, y);
  }

  private init() {
    // use allDocs instead of get so a 404 doesn't report an error
    return this.dbService
      .get()
      .allDocs({ key: this.CONFIGURATION_DOC_ID, include_docs: true })
      .then((result) => {
        this.tables = result.rows.length && result.rows[0].doc.charts;
      });
  }

  getScoreUtil() {
    return this.init().then(() => {
      return (tableId, sex, x, y) => {
        if (!this.tables) {
          // log an error if the z-score utility is used but not configured
          console.error('Doc "' + this.CONFIGURATION_DOC_ID + '" not found');
          return;
        }
        if (!sex || x === null || x === undefined || y === null || y === undefined) {
          // the form may not have been filled out yet
          return;
        }
        const table = this.findTable(tableId);
        if (!table) {
          // log an error if the z-score utility is used but not configured
          console.error('Requested z-score table not found', tableId);
          return;
        }
        const data = table.data[sex];
        if (!data) {
          console.error('The ' + tableId + ' z-score table is not configured for ' + sex + ' children');
          // no data for the given sex
          return;
        }
        return this.calculate(data, x, y);
      };
    });
  }
}
