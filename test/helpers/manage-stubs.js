const nock = require('nock');
const fs = require('fs');

// conditionally re-record or load existing stubs
// through nock
module.exports = function manageStubs() {
  before(function () {
    // grab the current test file based on the context
    // and use it to determine name of fixture data
    const targetJSONFile = this.test.file.split('/').reverse()[0].replace('.js', '.json');
    const fullPath = `test/fixtures/integration/${targetJSONFile}`;

    if (JSON.parse(process.env.REFRESH_STUBS || 'false')) {
      console.log('REFRESHING STUBS...');
      console.log('MAKING REAL NETWORK REQUESTS...');
      // increase test timeout in case requests are long-running
      this.timeout(20000);

      // begin recording all network requests
      nock.recorder.rec({
        dont_print: true,
        output_objects: true,
      });

      after(() => {
        // play back and write fixtures to the target file name after the test runs
        const nockCalls = nock.recorder.play();
        fs.writeFileSync(fullPath, JSON.stringify(nockCalls), 'utf8');
      });

      // escape the function
      return;
    }

    try {
      nock.load(fullPath);
    } catch (e) {
      console.log(`Something went wrong loading stubs. See error: ${e}`);
      console.log('Try re-running this test with REFRESH_STUBS=true');
    }
  });
};
