import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, ViewChild } from '@angular/core';
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

export interface MapMarker {
  geolocation: { latitude: number; longitude: number };
  label?: string;
  className?: string;
  data?: any;
}

/**
 * Renders a Leaflet map with either a single `geolocation` or a list of `markers`. The map is created when the
 * container appears and refreshed when the inputs change, so it can be bound to data that loads asynchronously.
 */
@Component({
  selector: 'mm-map',
  templateUrl: './map.component.html',
  imports: [
    TranslatePipe,
  ],
})
export class MapComponent implements OnChanges, OnDestroy {
  @Input() geolocation;
  @Input() markers?: MapMarker[];
  @Output() markerClick = new EventEmitter<MapMarker>();

  @ViewChild('map') set mapElement(element: ElementRef | undefined) {
    if (element && !this.map) {
      this.initMap(element.nativeElement);
    }
  }

  private map;
  private markersLayer;
  validMarkers: MapMarker[] = [];

  get isValid() {
    return this.validMarkers.length > 0;
  }

  get linkUrl() {
    if (this.validMarkers.length !== 1) {
      return undefined;
    }
    const { latitude, longitude } = this.validMarkers[0].geolocation;
    return `${OSM_URL}/?mlat=${latitude}&mlon=${longitude}#map=${ZOOM}/${latitude}/${longitude}`;
  }

  ngOnChanges() {
    const markers = this.markers || [{ geolocation: this.geolocation }];
    this.validMarkers = markers.filter(marker => isValidGeolocation(marker?.geolocation));

    if (!this.map) {
      return;
    }
    if (!this.isValid) {
      // the container is removed from the template along with the map
      this.map.remove();
      this.map = undefined;
      return;
    }
    this.renderMarkers();
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  private initMap(container: HTMLElement) {
    this.map = L.map(container, { scrollWheelZoom: false });
    L.tileLayer(tileConfig.tiles[0], {
      attribution: tileConfig.attribution,
      maxZoom: MAX_ZOOM,
      // CORS responses are cacheable by the service worker for offline use; opaque ones are not (see
      // api/src/generate-service-worker.js)
      crossOrigin: true,
    }).addTo(this.map);
    this.markersLayer = L.layerGroup().addTo(this.map);
    this.renderMarkers();
  }

  private renderMarkers() {
    this.markersLayer.clearLayers();
    this.validMarkers.forEach(marker => this.markersLayer.addLayer(this.createMarker(marker)));

    const positions = this.validMarkers.map(marker => this.toLatLng(marker));
    if (positions.length === 1) {
      this.map.setView(positions[0], ZOOM);
      return;
    }
    this.map.fitBounds(L.latLngBounds(positions), { padding: [MARKER_SIZE, MARKER_SIZE], maxZoom: ZOOM });
  }

  private createMarker(marker: MapMarker) {
    const layer = L.marker(this.toLatLng(marker), {
      icon: L.divIcon({
        className: ['map-marker', marker.className].filter(Boolean).join(' '),
        html: '<i class="fa fa-map-marker"></i>',
        iconSize: [MARKER_SIZE, MARKER_SIZE],
        iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE],
      }),
    });
    if (marker.label) {
      layer.bindTooltip(marker.label);
    }
    layer.on('click', () => this.markerClick.emit(marker));
    return layer;
  }

  private toLatLng(marker: MapMarker) {
    return [marker.geolocation.latitude, marker.geolocation.longitude];
  }
}
