const nock = require('nock');

const getVideoLinks = require('../../utils/get-video-links');

describe('get-video-links', () => {
  beforeEach(() => {
    const scope = nock('https://api.airtable.com')
      .get('/v0/app5fwvDYGjqdMv3B/project%20timestamps')
      .query(true)
      .reply(200, {
        records: [
          {
            id: 'recnGyvxPmhAq2w9U',
            fields: {
              hearing_video: [
                'recOjKgtoDDdrSH5P',
              ],
              projectid: 'P2013X0187',
              video_timestamp: '2:39:28',
            },
            createdTime: '2018-08-13T19:13:44.000Z',
          },
        ],
      });

    scope
      .get('/v0/app5fwvDYGjqdMv3B/hearing%20videos/recOjKgtoDDdrSH5P')
      .query(true)
      .reply(200, {
        id: 'recOjKgtoDDdrSH5P',
        fields: {
          projectid: 'August 8 Public Hearing',
          date: '2018-08-08',
          youtube_link: 'https://www.youtube.com/watch?v=0n732Sy0IlY',
          'project timestamps':
        ['recnGyvxPmhAq2w9U',
          'recKxXmWqN2FYyHc4',
          'recPv502aSXG8kUw2',
          'recQPZFIBHw4Ln9Mm',
          'recGPbQmrW7vLoRBP',
          'recn34kaq9Gsqw5nr',
          'recHQ8EEhieC0Wvzd'],
          hearing_type: 'CPC Public Hearing',
        },
        createdTime: '2018-08-13T19:27:46.000Z',
      });
  });

  it('should pass the correct hearing type and date to the response', async () => {
    try {
      const videoLinks = await getVideoLinks('12345');
      videoLinks.length.should.equal(1);

      const [videoLink] = videoLinks;

      videoLink.date.should.equal('2018-08-08');
      videoLink.hearing_type.should.equal('CPC Public Hearing');
    } catch (e) {
      throw new Error(e);
    }
  });

  it('should build a youtube link from a video url and hh:mm:ss timestamp', async () => {
    try {
      const videoLinks = await getVideoLinks('12345');
      videoLinks.length.should.equal(1);

      const [videoLink] = videoLinks;

      videoLink.video_link.should.equal('https://www.youtube.com/watch?v=0n732Sy0IlY&t=9568s');
    } catch (e) {
      throw new Error(e);
    }
  });
});
