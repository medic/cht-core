import { Injectable } from '@angular/core';
import { DbService } from '@admin-tool-services/db.service';

const FREETEXT_DDOC_ID = '_design/medic-offline-freetext';

/**
 * Ensures the medic-offline-freetext design document exists in CouchDB.
 * This design doc contains the contacts_by_type_freetext view used for
 * contact search in the UserFormComponent Select2 dropdowns.
 *
 * Created automatically on app startup if not present.
 */
@Injectable({
  providedIn: 'root',
})
export class FreetextDesignDocService {
  constructor(private db: DbService) {}

  async ensureDesignDoc(): Promise<void> {
    try {
      await this.db.get().get(FREETEXT_DDOC_ID);
      // Already exists — nothing to do
    } catch (err: any) {
      if (err?.status === 404) {
        await this.createDesignDoc();
      } else {
        console.error('Error checking freetext design doc', err);
      }
    }
  }

  private async createDesignDoc(): Promise<void> {
    try {
      await this.db.get().put({
        _id: FREETEXT_DDOC_ID,
        views: {
          contacts_by_type_freetext: {
            map: `function(doc) {
              var skip = ['_id', '_rev', 'type', 'refid', 'geolocation'];
              var keyShouldBeSkipped = function(key) {
                return skip.indexOf(key) !== -1 || /_date$/.test(key);
              };
              var usedKeys = [];
              var emitMaybe = function(type, key, value) {
                if (usedKeys.indexOf(key) === -1 && key.length > 2) {
                  usedKeys.push(key);
                  emit([type, key], value);
                }
              };
              var emitField = function(type, key, value, order) {
                if (!key || !value) return;
                var lowerKey = key.toLowerCase();
                if (keyShouldBeSkipped(lowerKey)) return;
                if (typeof value === 'string') {
                  var lowerValue = value.toLowerCase();
                  lowerValue.split(/\\s+/).forEach(function(word) {
                    emitMaybe(type, word, order);
                  });
                  emitMaybe(type, lowerKey + ':' + lowerValue, order);
                } else if (typeof value === 'number') {
                  emitMaybe(type, lowerKey + ':' + value, order);
                }
              };
              var getType = function() {
                return doc.type !== 'contact' ? doc.type : doc.contact_type;
              };
              var getTypeIndex = function(type) {
                var types = ['district_hospital', 'health_center', 'clinic', 'person'];
                var typeIndex = types.indexOf(type);
                return (typeIndex === -1 && doc.type === 'contact') ? type : typeIndex;
              };
              var type = getType();
              var idx = getTypeIndex(type);
              if (idx === -1) return;
              var dead = !!doc.date_of_death;
              var muted = !!doc.muted;
              var order = dead + ' ' + muted + ' ' + idx + ' ' + (doc.name ? doc.name.toLowerCase() : '');
              Object.keys(doc).forEach(function(key) {
                emitField(type, key, doc[key], order);
              });
            }`,
          },
        },
      });
      console.info('Created medic-offline-freetext design doc');
    } catch (err) {
      console.error('Error creating freetext design doc', err);
    }
  }
}
