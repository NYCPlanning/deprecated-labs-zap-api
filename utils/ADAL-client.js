const { AuthenticationContext } = require('adal-node');
const validateConfig = require('./validate-config');

const DEFAULT_TOKEN_EXPIRATION_BUFFER_MSEC = 15 * 60 * 1000; // 15 minutes
const TOKEN_EXPIRATION_BUFFER_MSEC = process.env.TOKEN_EXPIRATION_BUFFER_MSEC || DEFAULT_TOKEN_EXPIRATION_BUFFER_MSEC;

const ADAL_CONFIG = validateConfig({
  CRM_HOST: process.env.CRM_HOST,
  CRM_URL_PATH: process.env.CRM_URL_PATH,
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  TENANT_ID: process.env.TENANT_ID,
  AUTHORITY_HOST_URL: process.env.AUTHORITY_HOST_URL,
  TOKEN_PATH: process.env.TOKEN_PATH,
});

class ADALClient {
  constructor() {
    const {
      AUTHORITY_HOST_URL,
      TENANT_ID,
      TOKEN_PATH,
      CRM_HOST,
      CLIENT_ID,
      CLIENT_SECRET,
    } = ADAL_CONFIG;
    this.authorityUrl = `${AUTHORITY_HOST_URL}/${TENANT_ID}${TOKEN_PATH}`;
    this.crmHost = CRM_HOST;
    this.clientId = CLIENT_ID;
    this.clientSecret = CLIENT_SECRET;
    this.token = null;
    this.expiresOn = null;
  }

  /**
   * Returns a token for connecting to the CRM.
   * If a valid token exists, returns that. Otherwise, retrieves a new token via ADAL
   * (Azure Active Direction Authentication) libraries using the provided config.
   */
  async acquireToken() {
    return new Promise((resolve, reject) => {
      // Return existing token if it is valid
      if (this.tokenIsValid()) {
        resolve(this.token);
        return;
      }

      // Else, acquire a new token
      const context = new AuthenticationContext(this.authorityUrl);
      const that = this;
      context.acquireTokenWithClientCredentials(
        this.crmHost, this.clientId, this.clientSecret, (err, tokenResponse) => {
          if (err) {
            console.log(err); // eslint-disable-line
            reject(new Error('ADALClient failed to acquire access token'));
          }
          that.token = tokenResponse.accessToken;
          that.expiresOn = tokenResponse.expiresOn;
          resolve(that.token);
        },
      );
    });
  }

  /**
   * Checks that token exists and is still valid, with TOKEN_EXPIRATION_BUFFER
   * subtracted from expiresOn (recommended by CRM consultants)
   */
  tokenIsValid() {
    if (this.token && this.expiresOn) {
      const expiresOnBuffered = new Date(this.expiresOn.getTime() - TOKEN_EXPIRATION_BUFFER_MSEC);
      const now = new Date();
      return now <= expiresOnBuffered;
    }

    return false;
  }
}

module.exports = ADALClient;
