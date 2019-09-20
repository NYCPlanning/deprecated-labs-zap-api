const express = require('express');
const camelcase = require('camelcase');
const getQueryFile = require('../../utils/get-query-file');
const getVideoLinks = require('../../utils/get-video-links');
const normalizeSupportDocs = require('../../utils/inject-supporting-document-urls');

const router = express.Router({ mergeParams: true });

// import sql query templates
const findProjectQuery = getQueryFile('/projects/show.sql');

/* GET /projects/:id */
/* Retreive a single project */
router.get('/', async (req, res) => {
  const { app, params } = req;
  const { id } = params;

  try {
    const project = await app.db.one(findProjectQuery, { id });
    project.bbl_featurecollection = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: JSON.parse(project.bbl_multipolygon),
      }],
    };

    await normalizeSupportDocs(project);
    project.video_links = await getVideoLinks(project.dcp_name);

    /**
     * Memo for getting last ID in a sequence of milestones.
     * Logic is extracted from FE. TODO: Refactor this.
    */
    let lastZapId = '';

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
          milestones: {
            data: project.milestones.map((milestone, idx) => ({
              type: 'milestone',
              id: `m-${project.dcp_ceqrnumber}-${idx}`,
            })),
          },
          dispositions: {
            data: (project.lup_dispositions || []).map((disposition, idx) => ({
              type: 'disposition',
              id: `d-${project.dcp_ceqrnumber}-${idx}`,
            })),
          },
        },
      },
      included: [
        ...project.actions
          .map((action, idx) => ({
            type: 'action',
            id: `${project.dcp_ceqrnumber}-${idx}`,
            attributes: Object.keys(action)
              .reduce((acc, curr) => {
                const cleanedKey = curr.replace('dcp_', '');
                acc[camelcase(cleanedKey)] = action[curr];

                return acc;
              }, {}),
          })),
        ...project.milestones
          .map((milestone, idx) => {
            if (
              milestone.dcp_milestone === lastZapId
              && (
                milestone.dcp_milestone === '663beec4-dad0-e711-8116-1458d04e2fb8' // "Land Use Application Filed"
                || milestone.dcp_milestone === '783beec4-dad0-e711-8116-1458d04e2fb8' // "Environmental Assessment Statement Filed"
              )
            ) {
              milestone.isRevised = true;
            } else {
              milestone.isRevised = false;
            }

            lastZapId = milestone.dcp_milestone;

            return {
              type: 'milestone',
              id: `m-${project.dcp_ceqrnumber}-${idx}`,
              attributes: Object.keys(milestone)
                .reduce((acc, curr) => {
                  const cleanedKey = curr.replace('dcp_', '');
                  acc[camelcase(cleanedKey)] = milestone[curr];

                  return acc;
                }, {}),
            };
          }),
        ...(project.lup_dispositions || [])
          .map((disposition, idx) => {
            const dispositionId = `d-${project.dcp_ceqrnumber}-${idx}`;

            return {
              type: 'disposition',
              id: dispositionId,
              attributes: Object.keys(disposition)
                .reduce((acc, curr) => {
                  const cleanedKey = curr.replace('dcp_', '');
                  acc[camelcase(cleanedKey)] = disposition[curr];

                  return acc;
                }, {}),
              relationships: {
                action: {
                  data: {
                    id: dispositionId,
                    type: 'actions',
                  },
                },
              },
            };
          }),
      ],
    });
  } catch (error) {
    console.log(`Error retrieving project (id: ${id})`, error); // eslint-disable-line
    res.status(404).send({ error: 'Unable to retrieve project' });
  }
});


module.exports = router;
