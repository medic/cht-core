import {
  CenteredTextSymbolizer,
  exp,
  LineLabelSymbolizer,
  LineSymbolizer,
  PolygonSymbolizer,
} from 'protomaps-leaflet';

/**
 * Rendering rules for the OSMF Shortbread vector tiles (https://shortbread-tiles.org/schemas/1.0/), a deliberately
 * plain basemap: the map exists to give task and contact markers context, not to compete with them.
 */

export const MAP_TILES_URL = 'https://vector.openstreetmap.org/shortbread_v1/{z}/{x}/{y}.mvt';
// the tile set stops at zoom 14; the renderer overzooms the vector data beyond that
export const MAP_MAX_DATA_ZOOM = 14;
export const MAP_ATTRIBUTION = 'Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
export const MAP_BACKGROUND = '#f4f1ea';

const COLORS = {
  water: '#a6c9e0',
  vegetation: '#dfe8d3',
  builtUp: '#eae6df',
  sand: '#f3ecc8',
  building: '#d9d0c9',
  majorRoad: '#f5c26b',
  mediumRoad: '#fbe7a3',
  minorRoad: '#ffffff',
  pathway: '#c9b8a6',
  rail: '#9b9b9b',
  boundary: '#b48ec4',
  label: '#3d3d3d',
  mutedLabel: '#5c5c5c',
  waterLabel: '#43708c',
  halo: '#ffffff',
};

const VEGETATION_KINDS = [
  'forest', 'wood', 'grass', 'grassland', 'meadow', 'park', 'garden', 'village_green', 'recreation_ground',
  'playground', 'golf_course', 'miniature_golf', 'cemetery', 'grave_yard', 'allotments', 'orchard', 'vineyard',
  'scrub', 'heath', 'farmland', 'farmyard', 'greenfield', 'swamp', 'marsh', 'bog', 'wet_meadow',
];
const BUILT_UP_KINDS = [
  'residential', 'industrial', 'commercial', 'retail', 'railway', 'landfill', 'quarry', 'brownfield', 'construction',
  'garages',
];
const SAND_KINDS = ['beach', 'sand', 'shingle', 'scree', 'bare_rock'];
const MAJOR_ROAD_KINDS = ['motorway', 'trunk', 'motorway_link', 'trunk_link'];
const MEDIUM_ROAD_KINDS = [
  'primary', 'secondary', 'tertiary', 'primary_link', 'secondary_link', 'tertiary_link',
];
const MINOR_ROAD_KINDS = ['residential', 'unclassified', 'living_street', 'service', 'pedestrian', 'busway'];
const PATHWAY_KINDS = ['footway', 'path', 'track', 'cycleway', 'steps', 'bridleway'];
const RAIL_KINDS = ['rail', 'light_rail', 'tram', 'subway', 'narrow_gauge', 'funicular', 'monorail'];

const kindIn = (kinds: string[]) => (zoom, feature) => kinds.includes(feature.props.kind);

export const getPaintRules = () => [
  {
    dataLayer: 'land',
    symbolizer: new PolygonSymbolizer({ fill: COLORS.vegetation }),
    filter: kindIn(VEGETATION_KINDS),
  },
  { dataLayer: 'land', symbolizer: new PolygonSymbolizer({ fill: COLORS.builtUp }), filter: kindIn(BUILT_UP_KINDS) },
  { dataLayer: 'land', symbolizer: new PolygonSymbolizer({ fill: COLORS.sand }), filter: kindIn(SAND_KINDS) },
  { dataLayer: 'sites', symbolizer: new PolygonSymbolizer({ fill: COLORS.builtUp }) },
  { dataLayer: 'ocean', symbolizer: new PolygonSymbolizer({ fill: COLORS.water }) },
  { dataLayer: 'water_polygons', symbolizer: new PolygonSymbolizer({ fill: COLORS.water }) },
  {
    dataLayer: 'water_lines',
    symbolizer: new LineSymbolizer({ color: COLORS.water, width: exp(1.4, [[10, 0.8], [14, 2], [19, 6]]) }),
  },
  { dataLayer: 'buildings', symbolizer: new PolygonSymbolizer({ fill: COLORS.building }), minzoom: 14 },
  { dataLayer: 'street_polygons', symbolizer: new PolygonSymbolizer({ fill: COLORS.minorRoad }) },
  {
    dataLayer: 'streets',
    symbolizer: new LineSymbolizer({ color: COLORS.pathway, width: 1, dash: [2, 2] }),
    filter: kindIn(PATHWAY_KINDS),
    minzoom: 15,
  },
  {
    dataLayer: 'streets',
    symbolizer: new LineSymbolizer({ color: COLORS.minorRoad, width: exp(1.4, [[13, 0.8], [15, 2.5], [19, 10]]) }),
    filter: kindIn(MINOR_ROAD_KINDS),
  },
  {
    dataLayer: 'streets',
    symbolizer: new LineSymbolizer({ color: COLORS.mediumRoad, width: exp(1.4, [[11, 1], [15, 4], [19, 14]]) }),
    filter: kindIn(MEDIUM_ROAD_KINDS),
  },
  {
    dataLayer: 'streets',
    symbolizer: new LineSymbolizer({ color: COLORS.majorRoad, width: exp(1.4, [[8, 1], [15, 5], [19, 16]]) }),
    filter: kindIn(MAJOR_ROAD_KINDS),
  },
  {
    dataLayer: 'streets',
    symbolizer: new LineSymbolizer({ color: COLORS.rail, width: 1.2, dash: [5, 4] }),
    filter: kindIn(RAIL_KINDS),
  },
  {
    dataLayer: 'boundaries',
    symbolizer: new LineSymbolizer({ color: COLORS.boundary, width: 1.2, dash: [4, 3], opacity: 0.6 }),
  },
];

export const getLabelRules = () => [
  {
    dataLayer: 'place_labels',
    symbolizer: new CenteredTextSymbolizer({
      font: '600 15px sans-serif',
      fill: COLORS.label,
      stroke: COLORS.halo,
      width: 2,
    }),
    filter: kindIn(['city', 'capital', 'state_capital']),
  },
  {
    dataLayer: 'place_labels',
    symbolizer: new CenteredTextSymbolizer({
      font: '600 13px sans-serif',
      fill: COLORS.label,
      stroke: COLORS.halo,
      width: 2,
    }),
    filter: kindIn(['town']),
    minzoom: 9,
  },
  {
    dataLayer: 'place_labels',
    symbolizer: new CenteredTextSymbolizer({
      font: '400 12px sans-serif',
      fill: COLORS.mutedLabel,
      stroke: COLORS.halo,
      width: 2,
    }),
    filter: kindIn(['village', 'suburb', 'quarter', 'neighbourhood', 'hamlet', 'isolated_dwelling', 'locality']),
    minzoom: 12,
  },
  {
    dataLayer: 'water_polygons_labels',
    symbolizer: new CenteredTextSymbolizer({
      font: 'italic 400 12px sans-serif',
      fill: COLORS.waterLabel,
      stroke: COLORS.halo,
      width: 2,
    }),
    minzoom: 13,
  },
  {
    dataLayer: 'street_labels',
    symbolizer: new LineLabelSymbolizer({
      font: '400 11px sans-serif',
      fill: COLORS.mutedLabel,
      stroke: COLORS.halo,
      width: 2,
    }),
    minzoom: 16,
  },
];
