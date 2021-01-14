import * as LineageFactory from '@medic/lineage';
import {Injectable} from '@angular/core';

import { DbService } from '@mm-services/db.service';

@Injectable({
  providedIn: 'root'
})
export class LineageModelGeneratorService {
  lineageLib;
  constructor(private dbService:DbService) {
    this.lineageLib = LineageFactory(Promise, this.dbService.get());
  }

  private get(id) {
    return this.lineageLib
      .fetchLineageById(id)
      .then((docs) => {
        if (!docs.length) {
          const err = new LineageError(`Document not found: ${id}`, 404);
          throw err;
        }
        return docs;
      });
  }

  private hydrate(lineageArray) {
    return this.lineageLib
      .fetchContacts(lineageArray)
      .then((contacts) => {
        this.lineageLib.fillContactsInDocs(lineageArray, contacts);
        return lineageArray;
      });
  }

  /**
   * Fetch a contact and its lineage by the given uuid. Returns a
   * contact model, or if merge is true the doc with the
   * lineage inline.
   */
  contact(id, { merge=false }={}) {
    return this
      .get(id)
      .then((docs) => this.hydrate(docs))
      .then((docs) => {
        // the first row is the contact
        const doc = docs.shift();
        // everything else is the lineage
        const result = {
          _id: id,
          lineage: docs,
          doc: undefined
        };
        if (merge) {
          result.doc = this.lineageLib.fillParentsInDocs(doc, docs);

          // The lineage should also be hydrated when merge is true
          const deepCopy = obj => JSON.parse(JSON.stringify(obj));
          for (let i = result.lineage.length - 2; i >= 0; i--) {
            if (!result.lineage[i] || !result.lineage[i+1]) {
              continue;
            }
            result.lineage[i].parent = deepCopy(result.lineage[i+1]);
          }
        } else {
          result.doc = doc;
        }
        return result;
      });
  }

  /**
   * Fetch a contact and its lineage by the given uuid. Returns a
   * report model.
   */
  report(id) {
    return this.lineageLib
      .fetchHydratedDoc(id, { throwWhenMissingLineage: true })
      .then((hydrated) => {
        return {
          _id: id,
          doc: hydrated,
          contact: hydrated.contact,
        };
      });
  }

  reportSubjects(ids) {
    return this.lineageLib
      .fetchLineageByIds(ids)
      .then((docsList) => {
        return docsList.map((docs) => {
          return {
            _id: docs[0]._id,
            doc: docs.shift(),
            lineage: docs
          };
        });
      });
  }
}


class LineageError extends Error {
  code;
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
