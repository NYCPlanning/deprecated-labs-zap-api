const express = require('express');

const router = express.Router();

const { projectXML } = require('../queries/project-xmls');


/**
 * Creates a Recommendation.
 * Expects a JSON API-like POST request.
 * Returns status of either "success" or "failure".
 * If failure, passes along Internal Server Error in "error" property.
 */
router.post('/', async (req, res) => {

  const {
    app: { crmClient },
    body
  } = req;

  try {

    const clientResp = await crmClient.doPost(`dcp_communityboarddispositions?`, body, false);

    if(clientResp.success){
      res.status(201).send({
        status: 'success'
      });
    } else {
      res.status(500).send({
        status: 'failure',
        error: clientResp.error
      })
    }

  }  catch (e) {
    console.log(e); // eslint-disable-line
    res.status(500).send({ error: e.toString() });
  }
 

});

module.exports = router;
