import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { DbService } from '@mm-services/db.service';

@Injectable({
  providedIn: 'root'
})
export class VersionService {
  constructor(
    private dbService: DbService,
    private http: HttpClient,
  ) {}

  private formatRev(rev) {
    return rev.split('-')[0];
  }

  private getDeployVersion(buildInfo) {
    const version = buildInfo && buildInfo.version;
    if (!version) {
      return;
    }
    if (version === buildInfo.base_version || !buildInfo.base_version) {
      return version;
    }
    return `${version} (~${buildInfo.base_version})`;
  }

  getLocal () {
    return this.dbService.get()
      .get('_design/medic-client')
      .then(ddoc => {
        return {
          version: this.getDeployVersion(ddoc.build_info),
          rev: this.formatRev(ddoc._rev)
        };
      });
  }

  async getServiceWorker():Promise<{ version }> {
    const obs = this.http.get('/deploy-info.json');
    const response = await firstValueFrom(obs);
    return {
      version: this.getDeployVersion(response),
    };
  }

  getRemoteRev() {
    // changed from _all_docs to get doc because _all_docs without include_docs will need to get all allowed doc ids to
    // determine whether the doc is allowed or not.
    return this.dbService.get({ remote: true })
      .get('_design/medic-client')
      .then(ddoc => this.formatRev(ddoc._rev));
  }
}
