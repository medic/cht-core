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

      const tiles = map.querySelectorAll('.leaflet-tile-pane img');
      expect(tiles.length).to.be.greaterThan(0);
      expect(tiles[0].src).to.match(/^https:\/\/[abc]\.tile\.openstreetmap\.org\/17\/\d+\/\d+\.png$/);
      expect(tiles[0].getAttribute('crossorigin')).to.equal('');

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
      { geolocation: { latitude: -1.31, longitude: 36.79 }, label: 'John - Follow up', data: 'b' },
      { geolocation: { latitude: 'nope', longitude: 36.79 }, label: 'invalid', data: 'c' },
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
      expect(bounds.contains([-1.31, 36.79])).to.equal(true);
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
