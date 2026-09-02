import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, ViewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { leafletLayer } from 'protomaps-leaflet';

import { isValidGeolocation } from '@mm-services/contact-geolocation.service';
import {
  getLabelRules,
  getPaintRules,
  MAP_ATTRIBUTION,
  MAP_BACKGROUND,
  MAP_MAX_DATA_ZOOM,
  MAP_TILES_URL,
} from '@mm-components/map/map-style';

const L = require('leaflet');

const OSM_URL = 'https://www.openstreetmap.org';
const ZOOM = 17;
const MAX_ZOOM = 19;
const MARKER_SIZE = 32;
const USER_LOCATION_SIZE = 16;

export interface MapMarker {
  geolocation: { latitude: number; longitude: number };
  label?: string; // shown on hover
  badge?: string; // short text always shown under the marker
  className?: string;
  data?: any;
}

/**
 * Renders a Leaflet map with either a single `geolocation` or a list of `markers`, optionally with the device's
 * `userLocation`. The map is created when the container appears and refreshed when the inputs change, so it can be
 * bound to data that loads asynchronously.
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
  @Input() userLocation?: { latitude: number; longitude: number; accuracy?: number };
  @Output() markerClick = new EventEmitter<MapMarker>();

  @ViewChild('map') set mapElement(element: ElementRef | undefined) {
    if (element && !this.map) {
      this.initMap(element.nativeElement);
    }
  }

  private map;
  private markersLayer;
  private userLocationLayer;
  private resizeObserver?: ResizeObserver;
  private containerSize?: { width: number; height: number };
  private fitting = false;
  private userMoved = false;
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
      this.removeMap();
      return;
    }
    this.render();
  }

  ngOnDestroy() {
    this.removeMap();
  }

  private removeMap() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.containerSize = undefined;
    this.map?.remove();
    this.map = undefined;
    this.userMoved = false;
  }

  private initMap(container: HTMLElement) {
    this.map = L.map(container, { scrollWheelZoom: false });
    // any move we didn't trigger ourselves is the user taking control of the view
    this.map.on('movestart', () => this.userMoved = this.userMoved || !this.fitting);
    // Leaflet only sizes itself on creation and on window resize. The container often isn't laid out yet when the
    // map is created (e.g. right after a page load) and Leaflet would keep rendering into that initial sliver.
    this.resizeObserver = new ResizeObserver(([entry]) => this.onContainerResize(entry.contentRect));
    this.resizeObserver.observe(container);
    // Shortbread vector tiles rendered on canvas; the service worker caches the tile responses for offline use
    // (see api/src/generate-service-worker.js)
    leafletLayer({
      url: MAP_TILES_URL,
      maxDataZoom: MAP_MAX_DATA_ZOOM,
      maxZoom: MAX_ZOOM,
      attribution: MAP_ATTRIBUTION,
      backgroundColor: MAP_BACKGROUND,
      paintRules: getPaintRules(),
      labelRules: getLabelRules(),
    }).addTo(this.map);
    this.markersLayer = L.layerGroup().addTo(this.map);
    this.userLocationLayer = L.layerGroup().addTo(this.map);
    this.render();
  }

  private render() {
    this.markersLayer.clearLayers();
    this.validMarkers.forEach(marker => this.markersLayer.addLayer(this.createMarker(marker)));
    this.renderUserLocation();

    this.fitView();
  }

  private fitView() {
    // read the DOM rather than map.getSize(), which would cache the empty size until the first view is set
    const container = this.map.getContainer();
    if (!container.clientWidth || !container.clientHeight) {
      return; // not laid out yet, the resize observer will fit the view once it is
    }

    const positions = this.validMarkers.map(marker => this.toLatLng(marker.geolocation));
    if (this.hasUserLocation()) {
      positions.push(this.toLatLng(this.userLocation));
    }

    // not animated: animated moves fire their events asynchronously (so they'd be taken for user moves) and a
    // fit requested during an animation is dropped by Leaflet
    this.fitting = true;
    try {
      if (positions.length === 1) {
        this.map.setView(positions[0], ZOOM, { animate: false });
      } else {
        this.map.fitBounds(L.latLngBounds(positions), {
          padding: [MARKER_SIZE, MARKER_SIZE],
          maxZoom: ZOOM,
          animate: false,
        });
      }
    } finally {
      this.fitting = false;
    }
  }

  private onContainerResize({ width, height }) {
    const unchanged = this.containerSize?.width === width && this.containerSize?.height === height;
    this.containerSize = { width, height };
    if (!this.map || unchanged) {
      return;
    }
    this.map.invalidateSize({ animate: false });
    if (!this.userMoved) {
      this.fitView();
    }
  }

  private hasUserLocation() {
    return isValidGeolocation(this.userLocation);
  }

  private renderUserLocation() {
    this.userLocationLayer.clearLayers();
    if (!this.hasUserLocation()) {
      return;
    }

    const position = this.toLatLng(this.userLocation);
    const accuracy = this.userLocation!.accuracy;
    if (typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy > 0) {
      this.userLocationLayer.addLayer(L.circle(position, { radius: accuracy, interactive: false, weight: 1 }));
    }
    this.userLocationLayer.addLayer(L.marker(position, {
      interactive: false,
      keyboard: false,
      icon: L.divIcon({
        className: 'user-location',
        iconSize: [USER_LOCATION_SIZE, USER_LOCATION_SIZE],
        iconAnchor: [USER_LOCATION_SIZE / 2, USER_LOCATION_SIZE / 2],
      }),
    }));
  }

  private createMarker(marker: MapMarker) {
    const badge = marker.badge ? `<span class="map-marker-badge">${this.escapeHtml(marker.badge)}</span>` : '';
    const layer = L.marker(this.toLatLng(marker.geolocation), {
      icon: L.divIcon({
        className: ['map-marker', marker.className].filter(Boolean).join(' '),
        html: `<i class="fa fa-map-marker"></i>${badge}`,
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

  private escapeHtml(text: string) {
    const element = document.createElement('span');
    element.textContent = text;
    return element.innerHTML;
  }

  private toLatLng(geolocation) {
    return [geolocation.latitude, geolocation.longitude];
  }
}
