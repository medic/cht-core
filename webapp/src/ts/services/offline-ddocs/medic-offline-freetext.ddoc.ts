import { DesignDoc, packageView } from './design-doc';

import * as contactByFreetext from '../../../js/offline-ddocs/medic-offline-freetext/contacts_by_freetext.js';

export default <DesignDoc>{
  _id: '_design/medic-offline-freetext',
  views: {
    contacts_by_freetext: packageView(contactByFreetext),
  }
};
