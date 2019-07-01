/*eslint-disable */

const adal_node = require('adal-node');

export class ADAL_SERVICES{
    static ADAL_CONFIG = {
        CRMUrl: process.env.CRMUrl,
        webAPIurl: process.env.webAPIurl,
        clientId: process.env.clientId,
        clientSecret: process.env.clientSecret,
        tenantId: process.env.tenantId,
        authorityHostUrl: process.env.authorityHostUrl,
        tokenPath: process.env.tokenPath
    };

    static async acquireToken () {
        return new Promise((resolve, reject) => {
            if(ADAL_SERVICES.expirationDate){
                const tokenLimit = new Date(ADAL_SERVICES.expirationDate.getTime() - (30*60*1000));
                if(tokenLimit <= new Date()){
                    resolve(ADAL_SERVICES.token);
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
                ADAL_SERVICES.token = tokenResponse.accessToken;
                ADAL_SERVICES.expirationDate = tokenResponse.expiresOn;
                resolve(tokenResponse.accessToken);
            });
        })
    }

    static token = '';
    static expirationDate = null;
}
