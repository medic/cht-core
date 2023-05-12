import { DbService } from '../db.service';

export abstract class Migration {
  abstract name:string;
  abstract run():Promise<any>;

  DOC_FLAG_PREFIX = '_local/migration-';

  private getFlagDocId() {
    return `${this.DOC_FLAG_PREFIX}${this.name}`;
  }

  async hasRun(dbService:DbService) {
    try {
      await dbService.get().get(this.getFlagDocId());
      return true;
    } catch (err:any) {
      if (err?.status === 404) {
        return false;
      }
      throw err;
    }
  }

  async setHasRun(dbService:DbService) {
    const doc = {
      _id: this.getFlagDocId(),
      date: Date.now(),
    };
    await dbService.get().put(doc);
  }

}
