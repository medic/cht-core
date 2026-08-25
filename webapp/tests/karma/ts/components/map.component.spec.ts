import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { MapComponent } from '@mm-components/map/map.component';

describe('MapComponent', () => {
  let fixture;

  const getElement = (cssSelector) => {
    return fixture.debugElement.query(By.css(cssSelector))?.nativeElement;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        MapComponent,
      ],
    });
    fixture = TestBed.createComponent(MapComponent);
  });

  afterEach(() => fixture.destroy());

  it('should render nothing when no geolocation', async () => {
    fixture.componentInstance.geolocation = undefined;

    fixture.detectChanges();
    await fixture.whenStable();

    expect(getElement('.map-container')).to.equal(undefined);
  });

  it('should render nothing when geolocation is invalid', async () => {
    fixture.componentInstance.geolocation = { latitude: 'a', longitude: 20 };

    fixture.detectChanges();
    await fixture.whenStable();

    expect(getElement('.map-container')).to.equal(undefined);
  });

  it('should render a leaflet map centered on the geolocation with a marker', async () => {
    fixture.componentInstance.geolocation = { latitude: -1.2921, longitude: 36.8219, accuracy: 10 };

    fixture.detectChanges();
    await fixture.whenStable();

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
    fixture.componentInstance.geolocation = { latitude: 0, longitude: 0 };

    fixture.detectChanges();
    await fixture.whenStable();

    const map = getElement('.map-container .map');
    expect(map.querySelector('.leaflet-map-pane')).to.not.equal(null);

    fixture.destroy();
    expect(map.querySelector('.leaflet-map-pane')).to.equal(null);
  });
});
