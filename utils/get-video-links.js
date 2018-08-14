const fetch = require('node-fetch');

const api_key = process.env.AIRTABLE_API_KEY;

const getVideoLookup = (rows) => {
  const promises = rows.map((row) => {
    const id = row.hearing_video[0];
    const api_call = `https://api.airtable.com/v0/app5fwvDYGjqdMv3B/hearing%20videos/${id}?api_key=${api_key}`;
    return fetch(api_call)
      .then(d => d.json())
      .then((d) => {
        const {
          youtube_link,
          date,
          hearing_type,
        } = d.fields;

        return {
          youtube_link,
          date,
          hearing_type,
        };
      });
  });

  return Promise.all(promises);
};

const getVideoLinks = projectid => new Promise(async (resolve, reject) => {
  const api_call = `https://api.airtable.com/v0/app5fwvDYGjqdMv3B/project%20timestamps?maxRecords=10&view=Grid%20view&filterByFormula=(projectid = '${projectid}')&api_key=${api_key}`;

  const rows = await fetch(api_call)
    .then(d => d.json())
    .then(({ records }) => records.map((record) => {
      const { fields } = record;
      const { hearing_video, video_timestamp } = fields;

      return {
        hearing_video,
        video_timestamp,
      };
    }));

  const video_lookup = await getVideoLookup(rows);

  const combined = rows.map(({ video_timestamp }, i) => {
    const lookup = video_lookup[i];
    return {
      video_timestamp,
      ...lookup,
    };
  });

  resolve(combined);
});

module.exports = getVideoLinks;

// https://api.airtable.com/v0/app5fwvDYGjqdMv3B/project%20timestamps?maxRecords=10&view=Grid%20view&filterByFormula=(projectid = 'P2013X0187')&api_key=key76Ljv28U2j8srw
