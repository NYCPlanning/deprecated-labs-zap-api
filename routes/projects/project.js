const express = require('express');
const camelcase = require('camelcase');

const { flattenProjectRows } = require('../../utils/project/flatten-rows');
const { makeFeatureCollection } = require('../../utils/make-feature-collection');
const { projectXML } = require('../../queries/xml/project');
const { projectGeomsSQL } = require('../../queries/sql/project-geoms');
const getVideoLinks = require('../../utils/project/get-video-links');
const injectSupportingDocumentURLs = require('../../utils/project/inject-supporting-document-urls');

const router = express.Router({ mergeParams: true });

/**
 * Returns a single project entity, with child entities and geodata added.
 *
 * A project resource returned by this route is defined in `/response-templates/project.js`
 */
router.get('/', async (req, res) => {
  const {
    app: { dbClient, crmClient },
    params: { id },
  } = req;

  try {
    // Fetch project with child entities
    const { value: projectRows } = await crmClient.doGet(`dcp_projects?fetchXml=${projectXML(id)}`);

    if (!projectRows) {
      console.log(`Project ${id} not found`); // eslint-disable-line
      res.status(404).send({ error: `Project ${id} not found` });
      return;
    }

    // Compose project object from project rows
    const project = flattenProjectRows(projectRows);

    // Get geo and add to project
    const geo = await getProjectGeo(dbClient, project.dcp_name);
    project.bbl_multipolygon = geo.bblMultipolygon;
    project.bbl_featurecollection = geo.bblFeatureCollection;

    // inject external links
    await injectSupportingDocumentURLs(project);
    project.video_links = await getVideoLinks(project.dcp_name);

    res.send({
      data: {
        type: 'projects',
        id,
        attributes: project,
        relationships: {
          actions: {
            data: project.actions.map((action, idx) => ({
              type: 'action',
              id: `${project.dcp_ceqrnumber}-${idx}`,
            })),
          },
        },
      },
      included: project.actions
        .map((action, idx) => ({
          type: 'action',
          id: `${project.dcp_ceqrnumber}-${idx}`,
          attributes: Object.keys(action)
            .reduce((acc, curr) => { acc[camelcase(curr)] = action[curr]; return acc; }, {}),
        })),
    });
  } catch (error) {
    console.log(`Error retrieving project (id: ${id})`, error); // eslint-disable-line
    res.status(500).send({ error: 'Unable to retrieve project' });
  }
});

async function getProjectGeo(dbClient, projectIds) {
  return dbClient.one(projectGeomsSQL, [projectIds])
    .then(geom => ({
      bblMultipolygon: JSON.parse(geom.multipolygon),
      bblFeatureCollection: makeFeatureCollection([{ geom: geom.multipolygon }]),
      center: geom.center,
    }))
    .catch((e) => {
      console.log(`Failed to fetch geos for projects:`, e); // eslint-disable-line
      return {};
    });
}

module.exports = router;
