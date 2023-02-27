import { DbService } from '../db.service';

export abstract class Migration {
  abstract name:string;
  dbService:DbService;
  abstract run():Promise<any>;

  DOC_FLAG_PREFIX = '_local/migration-';

  private getFlagDocId() {
    return `${this.DOC_FLAG_PREFIX}${this.name}`;
  }

  async hasRun() {
    try {
      await this.dbService.get().get(this.getFlagDocId());
      return true;
    } catch (err:any) {
      if (err?.code === 404) {
        return false;
      }
      throw err;
    }
  }

  async setHasRun() {
    const doc = {
      _id: this.getFlagDocId(),
      date: Date.now(),
    };
    await this.dbService.get().put(doc);
  }

}
