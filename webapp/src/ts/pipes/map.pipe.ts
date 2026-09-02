import { Injectable, Pipe, PipeTransform } from '@angular/core';

import { isValidGeolocation } from '@mm-services/contact-geolocation.service';

/**
 * Contact summary `filter: 'map'`. Unlike the other filters this doesn't produce HTML: it only validates the
 * geolocation so the templates can hand it to `mm-map`, which renders the Leaflet map.
 */
@Pipe({
  name: 'map'
})
@Injectable({
  providedIn: 'root'
})
export class MapPipe implements PipeTransform {
  transform(geolocation) {
    if (!isValidGeolocation(geolocation)) {
      return;
    }
    return geolocation;
  }
}
