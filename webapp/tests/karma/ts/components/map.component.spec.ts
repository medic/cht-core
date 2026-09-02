import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { expect } from 'chai';
import sinon from 'sinon';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { MapComponent } from '@mm-components/map/map.component';

describe('MapComponent', () => {
  let fixture;
  let style;

  const getElement = (cssSelector) => {
    return fixture.debugElement.query(By.css(cssSelector))?.nativeElement;
  };

  const getElements = (cssSelector) => {
    return fixture.debugElement.queryAll(By.css(cssSelector)).map(element => element.nativeElement);
  };

  const render = async (inputs) => {
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    // no stylesheets are loaded in tests, and Leaflet needs a sized container to compute zoom and bounds
    style = document.createElement('style');
    style.textContent = '.map-container .map { width: 400px; height: 400px; }';
    document.head.appendChild(style);

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        MapComponent,
      ],
    });
    fixture = TestBed.createComponent(MapComponent);
  });

  afterEach(() => {
    fixture.destroy();
    style.remove();
    sinon.restore();
  });

  describe('single geolocation', () => {
    it('should render nothing when no geolocation', async () => {
      await render({ geolocation: undefined });
      expect(getElement('.map-container')).to.equal(undefined);
    });

    it('should render nothing when geolocation is invalid', async () => {
      await render({ geolocation: { latitude: 'a', longitude: 20 } });
      expect(getElement('.map-container')).to.equal(undefined);
    });

    it('should render a leaflet map centered on the geolocation with a marker', async () => {
      await render({ geolocation: { latitude: -1.2921, longitude: 36.8219, accuracy: 10 } });

      const map = getElement('.map-container .map');
      expect(map.classList.contains('leaflet-container')).to.equal(true);

      const center = fixture.componentInstance.map.getCenter();
      expect(center.lat).to.be.closeTo(-1.2921, 0.0001);
      expect(center.lng).to.be.closeTo(36.8219, 0.0001);
      expect(fixture.componentInstance.map.getZoom()).to.equal(17);

      // vector tiles are rendered onto canvas elements
      const tiles = map.querySelectorAll('.leaflet-tile-pane canvas.leaflet-tile');
      expect(tiles.length).to.be.greaterThan(0);

      const marker = map.querySelector('.leaflet-marker-icon.map-marker');
      expect(marker.querySelector('i.fa.fa-map-marker')).to.not.equal(null);

      const link = getElement('.map-container a.map-link');
      expect(link.getAttribute('target')).to.equal('_blank');
      expect(link.getAttribute('rel')).to.equal('noopener noreferrer');
      expect(link.innerText).to.equal('geolocation.map.open');
      const href = new URL(link.getAttribute('href'));
      expect(href.origin).to.equal('https://www.openstreetmap.org');
      expect(href.searchParams.get('mlat')).to.equal('-1.2921');
      expect(href.searchParams.get('mlon')).to.equal('36.8219');
      expect(href.hash).to.equal('#map=17/-1.2921/36.8219');
    });

    it('should remove the map when destroyed', async () => {
      await render({ geolocation: { latitude: 0, longitude: 0 } });

      const map = getElement('.map-container .map');
      expect(map.querySelector('.leaflet-map-pane')).to.not.equal(null);

      fixture.destroy();
      expect(map.querySelector('.leaflet-map-pane')).to.equal(null);
    });
  });

  describe('markers', () => {
    const markers = [
      { geolocation: { latitude: -1.29, longitude: 36.82 }, label: 'Jane - Visit', className: 'overdue', data: 'a' },
      { geolocation: { latitude: -1.298, longitude: 36.828 }, label: 'John - Follow up', data: 'b' },
      { geolocation: { latitude: 'nope', longitude: 36.828 }, label: 'invalid', data: 'c' },
    ];

    it('should render nothing when no marker is valid', async () => {
      await render({ markers: [markers[2]] });
      expect(getElement('.map-container')).to.equal(undefined);
    });

    it('should render a marker for every valid marker and fit the map around them', async () => {
      await render({ markers });

      const markerElements = getElements('.leaflet-marker-icon.map-marker');
      expect(markerElements.length).to.equal(2);
      expect(markerElements.filter(element => element.classList.contains('overdue')).length).to.equal(1);

      const bounds = fixture.componentInstance.map.getBounds();
      expect(bounds.contains([-1.29, 36.82])).to.equal(true);
      expect(bounds.contains([-1.298, 36.828])).to.equal(true);
      expect(fixture.componentInstance.map.getZoom()).to.be.lessThan(17);

      expect(getElement('.map-container a.map-link')).to.equal(undefined);
    });

    it('should emit the marker when clicked', async () => {
      await render({ markers });
      const emitted: any[] = [];
      fixture.componentInstance.markerClick.subscribe(marker => emitted.push(marker));

      getElements('.leaflet-marker-icon.map-marker')[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(emitted).to.deep.equal([markers[1]]);
    });

    it('should render badges under the markers, escaped', async () => {
      await render({ markers: [
        { ...markers[0], badge: '315 m' },
        { ...markers[1], badge: '<b>x</b>' },
      ] });

      const badges = getElements('.map-marker .map-marker-badge');
      expect(badges.map(badge => badge.innerText)).to.deep.equal(['315 m', '<b>x</b>']);
      expect(badges[1].querySelector('b')).to.equal(null);
    });
  });

  describe('user location', () => {
    const markers = [{ geolocation: { latitude: -1.29, longitude: 36.82 }, data: 'a' }];

    it('should draw the user location with its accuracy and fit the map around everything', async () => {
      await render({ markers, userLocation: { latitude: -1.298, longitude: 36.828, accuracy: 25 } });

      const userMarker = getElement('.leaflet-marker-icon.user-location');
      expect(userMarker).to.not.equal(undefined);
      expect(userMarker.classList.contains('leaflet-interactive')).to.equal(false);
      expect(getElements('.leaflet-overlay-pane path').length).to.equal(1); // the accuracy circle

      const bounds = fixture.componentInstance.map.getBounds();
      expect(bounds.contains([-1.29, 36.82])).to.equal(true);
      expect(bounds.contains([-1.298, 36.828])).to.equal(true);
      expect(fixture.componentInstance.map.getZoom()).to.be.lessThan(17);
      expect(getElements('.leaflet-marker-icon.map-marker').length).to.equal(1);
      expect(getElement('.map-container a.map-link')).to.not.equal(undefined); // still a single task marker
    });

    it('should not draw an accuracy circle without a usable accuracy', async () => {
      await render({ markers, userLocation: { latitude: -1.298, longitude: 36.828 } });

      expect(getElement('.leaflet-marker-icon.user-location')).to.not.equal(undefined);
      expect(getElements('.leaflet-overlay-pane path').length).to.equal(0);
    });

    it('should ignore an invalid user location', async () => {
      await render({ markers, userLocation: { code: 1, message: 'denied' } });

      expect(getElement('.leaflet-marker-icon.user-location')).to.equal(undefined);
      expect(fixture.componentInstance.map.getZoom()).to.equal(17);
    });

    it('should not render a map for a user location alone', async () => {
      await render({ markers: [], userLocation: { latitude: -1.298, longitude: 36.828 } });
      expect(getElement('.map-container')).to.equal(undefined);
    });

    it('should not emit clicks for the user location', async () => {
      await render({ markers, userLocation: { latitude: -1.298, longitude: 36.828 } });
      const emitted: any[] = [];
      fixture.componentInstance.markerClick.subscribe(marker => emitted.push(marker));

      getElement('.leaflet-marker-icon.user-location').dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(emitted).to.deep.equal([]);
    });

    it('should add the user location when it arrives later', async () => {
      await render({ markers });
      expect(getElement('.leaflet-marker-icon.user-location')).to.equal(undefined);
      expect(fixture.componentInstance.map.getZoom()).to.equal(17);

      await render({ userLocation: { latitude: -1.298, longitude: 36.828 } });
      expect(getElement('.leaflet-marker-icon.user-location')).to.not.equal(undefined);
      expect(fixture.componentInstance.map.getZoom()).to.be.lessThan(17);
    });
  });

  describe('container resizing', () => {
    const markers = [
      { geolocation: { latitude: -1.29, longitude: 36.82 }, data: 'a' },
      { geolocation: { latitude: -1.298, longitude: 36.828 }, data: 'b' },
    ];

    const setContainerSize = async (width, height) => {
      style.textContent = `.map-container .map { width: ${width}px; height: ${height}px; }`;
      // ResizeObserver callbacks are delivered after layout, not synchronously
      for (let i = 0; i < 50 && fixture.componentInstance.containerSize?.height !== height; i++) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    };

    it('should recover when the map was created before its container was laid out', async () => {
      style.textContent = '.map-container .map { width: 400px; height: 2px; }';
      await render({ markers });
      const map = fixture.componentInstance.map;
      expect(map.getSize().y).to.equal(2);
      const bounds = map.getBounds();
      expect(bounds.contains([-1.29, 36.82]) && bounds.contains([-1.298, 36.828])).to.equal(false);

      await setContainerSize(400, 400);

      expect(map.getSize().y).to.equal(400);
      expect(map.getBounds().contains([-1.29, 36.82])).to.equal(true);
      expect(map.getBounds().contains([-1.298, 36.828])).to.equal(true);
      expect(map.getZoom()).to.be.lessThan(17);
    });

    it('should not fit the view while the container has no size', async () => {
      style.textContent = '.map-container .map { width: 400px; height: 0; }';
      await render({ markers });
      const map = fixture.componentInstance.map;
      expect(map.getContainer().clientHeight).to.equal(0);
      expect(map.getZoom()).to.equal(undefined); // no view was set

      await setContainerSize(400, 400);

      expect(map.getBounds().contains([-1.29, 36.82])).to.equal(true);
      expect(map.getBounds().contains([-1.298, 36.828])).to.equal(true);
    });

    it('should keep the view the user chose when the container resizes', async () => {
      await render({ markers });
      const map = fixture.componentInstance.map;

      map.setView([0, 0], 15, { animate: false }); // the user panned and zoomed away
      expect(map.getZoom()).to.equal(15);

      await setContainerSize(400, 600);

      expect(map.getSize().y).to.equal(600);
      expect(map.getZoom()).to.equal(15);
      expect(map.getCenter().lat).to.be.closeTo(0, 0.001);
      expect(map.getCenter().lng).to.be.closeTo(0, 0.001);
    });

    it('should stop observing when the map is removed', async () => {
      await render({ markers });
      const disconnect = sinon.spy(fixture.componentInstance.resizeObserver, 'disconnect');

      await render({ markers: [] });

      expect(disconnect.callCount).to.equal(1);
      expect(fixture.componentInstance.resizeObserver).to.equal(undefined);
    });
  });

  describe('marker updates', () => {
    const markers = [
      { geolocation: { latitude: -1.29, longitude: 36.82 }, label: 'Jane - Visit', className: 'overdue', data: 'a' },
      { geolocation: { latitude: -1.298, longitude: 36.828 }, label: 'John - Follow up', data: 'b' },
    ];

    it('should update the markers when the input changes', async () => {
      await render({ markers });
      expect(getElements('.leaflet-marker-icon.map-marker').length).to.equal(2);
      const map = fixture.componentInstance.map;

      await render({ markers: [markers[0]] });
      expect(getElements('.leaflet-marker-icon.map-marker').length).to.equal(1);
      expect(fixture.componentInstance.map).to.equal(map); // the map is reused
      expect(map.getZoom()).to.equal(17);
      expect(getElement('.map-container a.map-link')).to.not.equal(undefined);

      await render({ markers: [] });
      expect(getElement('.map-container')).to.equal(undefined);
      expect(map.getContainer().querySelector('.leaflet-map-pane')).to.equal(null); // the map was removed
      expect(fixture.componentInstance.map).to.equal(undefined);

      await render({ markers: [markers[1]] });
      expect(getElements('.leaflet-marker-icon.map-marker').length).to.equal(1);
      expect(fixture.componentInstance.map).to.not.equal(map); // a new map is created for the new container
    });
  });
});
