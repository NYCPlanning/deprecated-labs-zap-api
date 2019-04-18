const express = require('express');
const { parse: json2csv } = require('json2csv');
const ogr2ogr = require('ogr2ogr');

const buildProjectsSQL = require('../../utils/build-projects-sql');
const transformActions = require('../../utils/transform-actions');

// queries db and returns a FeatureCollection of the results
const getProjectsFeatureCollection = async (app, SQL) => {
  const projects = await app.db.any(SQL);
  // rebuild as geojson FeatureCollection
  return {
    type: 'FeatureCollection',
    features: projects.map((project) => {
      const { geom } = project;
      const properties = { ...project };
      delete properties.geom;

      return {
        type: 'Feature',
        geometry: JSON.parse(geom),
        properties,
      };
    }),
  };
};

const createShapefile = FeatureCollection => ogr2ogr(FeatureCollection)
  .format('ESRI Shapefile')
  .skipfailures()
  .timeout(60000)
  .options(['-nln', 'projects']) // sets name of individual files in shapefile
  .stream();


const router = express.Router({ mergeParams: true });

/* GET /projects/download.:filetype */
/* Downloads a file of projects that match the current query params and filetype */
router.get('/', async (req, res) => {
  const { app, query, params } = req;
  const { filetype } = params;

  try {
    if (filetype === 'csv') {
      const SQL = buildProjectsSQL(query, 'csv_download');
      const data = await app.db.any(SQL);
      res.setHeader('Content-type', 'text/csv');

      if (data.length) {
        data.map(row => transformActions(row));
        const csv = json2csv(data, { highWaterMark: 16384, encoding: 'utf-8' });
        res.send(csv);
      } else {
        res.status(204).send();
      }
    } else { // spatial download
      const SQL = buildProjectsSQL(query, 'spatial_download');
      const FeatureCollection = await getProjectsFeatureCollection(app, SQL);
      if (filetype === 'shp') { // zipped shapefile
        res.setHeader('Content-disposition', 'attachment; filename=projects.zip');
        res.setHeader('Content-Type', 'application/zip');

        createShapefile(FeatureCollection).pipe(res);
      }
      if (filetype === 'geojson') { // geojson
        res.setHeader('Content-disposition', 'attachment; filename=projects.geojson');
        res.json(FeatureCollection);
      }
    }
  } catch (error) {
    res.status(500).json({ error });
  }
});

module.exports = router;
