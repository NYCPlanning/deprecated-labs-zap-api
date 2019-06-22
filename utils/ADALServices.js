/*eslint-disable */

const adal_node = require('adal-node');

const ADAL_CONFIG = {
    CRMUrl: process.env.CRMUrl,
    webAPIurl: process.env.webAPIurl,
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    tenantId: process.env.tenantId,
    authorityHostUrl: process.env.authorityHostUrl,
    tokenPath: process.env.tokenPath
};

const ADAL_Services = {  };
    ADAL_Services.acquireToken = async () => {
        return new Promise((resolve, reject) => {
            //  server to server
            const { AuthenticationContext } = adal_node;

            const { authorityHostUrl, tenantId, tokenPath, clientId, clientSecret, CRMUrl } = ADAL_CONFIG;
            const authorityUrl = `${authorityHostUrl}/${tenantId}${tokenPath}`;
            const context = new AuthenticationContext(authorityUrl);

            context.acquireTokenWithClientCredentials(CRMUrl, clientId, clientSecret, (err, tokenResponse) => {
                if (err) {
                    console.log(`well that didn't work: ${err.stack}`);
                    reject(err);
                }
                resolve(tokenResponse.accessToken);
            });
        })
    };
    // ADAL_Services.refreshToken = async () => {}; // todo: add method


module.exports = ADAL_Services;