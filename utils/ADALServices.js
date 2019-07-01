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

const ADAL_Services = {
    token: null,
    expirationDate: null
};
    ADAL_Services.acquireToken = async () => {
        return new Promise((resolve, reject) => {
            if(ADAL_Services.expirationDate){
                const tokenLimit = new Date(ADAL_Services.expirationDate.getTime() - (15*60*1000));
                const now = new Date();
                if(now <= tokenLimit){
                    resolve(ADAL_Services.token);
                    return;
                }
            }
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
                ADAL_Services.token = tokenResponse.accessToken;
                ADAL_Services.expirationDate = tokenResponse.expiresOn;
                resolve(tokenResponse.accessToken);
            });
        })
    };


module.exports = ADAL_Services;
