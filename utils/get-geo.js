const { default: turfBbox } = require('@turf/bbox');
const turfBuffer = require('@turf/buffer');
const turfLinestring = require('turf-linestring');
const turfPoint = require('turf-point');

const SQL = require('../queries/geo');

async function getProjectsGeo(dbClient, filterId, projectIds) {
  const projectsCenters = await dbClient.any(SQL.centers, [projectIds]);
  const bounds = getBounds(projectsCenters);
  const tiles = getTileTemplate(filterId, projectIds);

  return {
    projectsCenters,
    bounds,
    tiles,
  };
}

function getBounds(projectCenters) {
  const centers = projectCenters.map(projectCenter => projectCenter.center);

  // add padding before generating a bbox for a single point
  if (centers.length === 1) {
    const [minX, minY, maxX, maxY] = turfBbox(turfBuffer(turfPoint(centers[0]), 0.4));
    return [[minX, minY], [maxX, maxY]];
  }

  const [minX, minY, maxX, maxY] = turfBbox(turfLinestring(centers));
  return [[minX, minY], [maxX, maxY]];
}

function getTileTemplate(filterId, projectIds) {
  return [`${process.env.HOST}/projects/tiles/${filterId}/{z}/{x}/{y}.mvt`];
}

async function getProjectsDownloadGeo(dbClient, projectIds) {
  return dbClient.any(SQL.bbl_multipolygons, [projectIds]).then((features) => {
    return makeFeatureCollection(features);
  })
}

async function getProjectGeo(dbClient, projectId) {
  const feature = await dbClient.one(SQL.bbl_multipolygon, projectId);
  const bblFeatureCollection = makeFeatureCollection([feature]);
  return {
    bblMultipolygon: feature.bbl_multipolygon,
    bblFeatureCollection,
  };
}

function makeFeatureCollection(features) {
  return {
    type: 'FeatureCollection',
    features: features.map((feature) => {
      const { geom } = feature;
      delete feature.geom;

      return {
        type: 'Feature',
        geometry: JSON.parse(geom),
        properties: feature,        
      };
    }),
  };
}

async function getRadiusBoundedProjects(dbClient, query) {
  const METERS_TO_FEET_MULT = 3.28084;
  const point = query.distance_from_point || [];
  const distance = query.radius_from_point || 10;

  if(point.length && distance) {
    const distanceFeet = distance * METERS_TO_FEET_MULT;
    const projectIds = await dbClient.any(SQL.radius_search, [...point, distanceFeet]);
    return projectIds.map(projectId => projectId.projectid).slice(0, 10);
  } 

  return [];
}

module.exports = {
  getProjectsGeo,
  getProjectsDownloadGeo,
  getProjectGeo,
  getRadiusBoundedProjects,
};
