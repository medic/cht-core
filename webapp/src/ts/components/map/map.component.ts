import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { isValidGeolocation } from '@mm-services/contact-geolocation.service';

const L = require('leaflet');
const enketoConfig = require('../../../js/enketo/config');

const OSM_URL = 'https://www.openstreetmap.org';
const ZOOM = 17;
const MAX_ZOOM = 19;
const MARKER_SIZE = 32;
// same tile server the enketo geopoint widget uses, so the CSP img-src rules already cover it
const [ tileConfig ] = enketoConfig.maps;

@Component({
  selector: 'mm-map',
  templateUrl: './map.component.html',
  imports: [
    TranslatePipe,
  ],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @Input() geolocation;
  @ViewChild('map') private mapElement?: ElementRef;

  private map;

  get isValid() {
    return isValidGeolocation(this.geolocation);
  }

  get linkUrl() {
    const { latitude, longitude } = this.geolocation;
    return `${OSM_URL}/?mlat=${latitude}&mlon=${longitude}#map=${ZOOM}/${latitude}/${longitude}`;
  }

  ngAfterViewInit() {
    if (!this.isValid || !this.mapElement) {
      return;
    }

    const position = [this.geolocation.latitude, this.geolocation.longitude];
    this.map = L.map(this.mapElement.nativeElement, { scrollWheelZoom: false }).setView(position, ZOOM);
    L.tileLayer(tileConfig.tiles[0], {
      attribution: tileConfig.attribution,
      maxZoom: MAX_ZOOM,
      // CORS responses are cacheable by the service worker for offline use; opaque ones are not (see
      // api/src/generate-service-worker.js)
      crossOrigin: true,
    }).addTo(this.map);
    L.marker(position, {
      icon: L.divIcon({
        className: 'map-marker',
        html: '<i class="fa fa-map-marker"></i>',
        iconSize: [MARKER_SIZE, MARKER_SIZE],
        iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE],
      }),
    }).addTo(this.map);
  }

  ngOnDestroy() {
    this.map?.remove();
  }
}
