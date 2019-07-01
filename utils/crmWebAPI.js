/*eslint-disable */

const zlib = require('zlib');
const request = require('request');
const ADALService = require('./ADALServices');

const crmWebAPI = { };
    crmWebAPI.get = async (query, maxPageSize, headers) => sendGetRequest(query, maxPageSize, headers);
    crmWebAPI.update = async (entitySetName, guid, data, headers) => {
        var query = entitySetName + "(" + guid + ")";
        return sendPatchRequest(query, data, headers);
    };
    crmWebAPI.post = async (query, headers) => sendPostRequest(query, headers);
    crmWebAPI.create = async (entitySetName, data, headers) => create((entitySetName, data, headers));
    crmWebAPI.delete = async (entitySetName, guid, headers) => {
        const query = entitySetName + "(" + guid + ")";
        return sendDeleteRequest(query, headers);
    };
    crmWebAPI.associate = async (relationshipName, entitySetName1, guid1, entitySetName2, guid2, headers) => {
        const query = entitySetName1 + "(" + guid1 + ")/" + relationshipName + "/$ref";
        const data = {
            "@odata.id": webApiUrl() + entitySetName2 + "(" + guid2 + ")"
        };
        return sendPostRequest(query, data, headers);
    };
    crmWebAPI.disassociate = async (relationshipName, entitySetName1, guid1, guid2, headers) => {
        const query = entitySetName1 + "(" + guid1 + ")/" + relationshipName + "(" + guid2 + ")/$ref";
        return sendDeleteRequest(query, headers);
    };
    crmWebAPI.executeAction = async (actionName, data, entitySetName, guid, headers) => {
        let query = "";
        if (!entitySetName) query = actionName;
        else query = entitySetName + "(" + guid + ")/Microsoft.Dynamics.CRM." + actionName;
        return sendPostRequest(query, data, headers);
    };
    crmWebAPI.escape = (str) => {
        return str.replace(/'/g, "''");
    };


    const WEBAPIPATH = process.env.webAPIurl;
    const crmURL = process.env.CRMUrl;
    const webApiUrl = function () {
    return crmURL + WEBAPIPATH;
    };
    const dateReviver = function (key, value) {
    if (typeof value === 'string') {
        // YYYY-MM-DDTHH:mm:ss.sssZ => parsed as UTC
        // YYYY-MM-DD => parsed as local date

        if (value != "") {
            var a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
            if (a) {
                var s = parseInt(a[6]);
                var ms = Number(a[6]) * 1000 - s * 1000;
                return new Date(Date.UTC(parseInt(a[1]), parseInt(a[2]) - 1, parseInt(a[3]), parseInt(a[4]), parseInt(a[5]), s, ms));
            }
            var b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
            if (b) {
                return new Date(parseInt(b[1]), parseInt(b[2]) - 1, parseInt(b[3]), 0, 0, 0, 0);
            }
        }
    }
    return value;
    };
    const parseErrorMessage = function (json) {
    if (json && json.error) return json.error.message;
    return "Error";
    };
    const fixLongODataAnnotations = function (dataObj) {
    const newObj = {};
    for (let name in dataObj) {
        const formattedValuePrefix = name.indexOf("@OData.Community.Display.V1.FormattedValue");
        const logicalNamePrefix = name.indexOf("@Microsoft.Dynamics.CRM.lookuplogicalname");
        const navigationPropertyPrefix = name.indexOf("@Microsoft.Dynamics.CRM.associatednavigationproperty");

        if (formattedValuePrefix >= 0) {
            const newName = name.substring(0, formattedValuePrefix);
            if(newName) newObj[`${newName}_formatted`] = dataObj[name];
        }
        else if (logicalNamePrefix >= 0) {
            const newName = name.substring(0, logicalNamePrefix);
            if(newName) newObj[`${newName}_logical`] = dataObj[name];
        }
        else if (navigationPropertyPrefix >= 0) {
            const newName = name.substring(0, navigationPropertyPrefix);
            if (newName) newObj[`${newName}_navigationproperty`] = dataObj[name];
        }
        else {
            newObj[name] = dataObj[name];
        }
    }

    return newObj;
    };
    const sendGetRequest = async (query, maxPageSize, headers) => {
        //  get token
        const JWToken = await ADALService.acquireToken();
        const options = {
            url: `${webApiUrl() + query}`,
            headers: {
                'X-some-headers': 'Some headers',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json; charset=utf-8',
                Authorization: `Bearer ${JWToken}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                Accept: 'application/json',
                Prefer: 'odata.include-annotations="*"',
            },
            encoding: null,
        };

        return new Promise((resolve, reject) => {
            request.get(options, (error, response, body) => {
                const encoding = response.headers['content-encoding'];

                if (!error && response.statusCode === 200) {
                    // If response is gzip, unzip first

                    const parseResponse = jsonText => {
                        const json_string = jsonText.toString('utf-8');

                        var result = JSON.parse(json_string, dateReviver);
                        if (result["@odata.context"].indexOf("/$entity") >= 0) {
                            // retrieve single
                            result = fixLongODataAnnotations(result);
                        }
                        else if (result.value ) {
                            // retrieve multiple
                            var array = [];
                            for (var i = 0; i < result.value.length; i++) {
                                array.push(fixLongODataAnnotations(result.value[i]));
                            }
                            result.value = array;
                        }
                        resolve(result);
                    };

                    if (encoding && encoding.indexOf('gzip') >= 0) {
                        zlib.gunzip(body, (err, dezipped) => {
                            parseResponse(dezipped);
                        });
                    }
                    else{
                        parseResponse(body);
                    }

                }
                else {
                    const parseError = jsonText => {
                        // Bug: sometimes CRM returns 'object reference' error
                        // Fix: if we retry error will not show again
                        const json_string = jsonText.toString('utf-8');
                        var result = JSON.parse(json_string, dateReviver);
                        var err = parseErrorMessage(result);
                        if (err == "Object reference not set to an instance of an object.") {
                            sendGetRequest(query, maxPageSize, headers)
                              .then(
                                resolve, reject
                              );
                        }
                        else {
                            reject(err);
                        }
                    };
                    if (encoding && encoding.indexOf('gzip') >= 0) {
                        zlib.gunzip(body, (err, dezipped) => {
                            parseError(dezipped);
                        });
                    }
                    else{
                        parseError(body);

                    }

                }
            });
        });
    };
    const sendPatchRequest = async function (query, data, headers) {
        //  get token
        const JWToken = await ADALService.acquireToken();
        const options = {
            url: `${webApiUrl() + query }`,
            headers: {
                'X-some-headers': 'Some headers',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json; charset=utf-8',
                Authorization: `Bearer ${JWToken}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                Accept: 'application/json',
                Prefer: 'odata.include-annotations="*"',
            },
            body: JSON.stringify(data),
            encoding: null,
        };

        return new Promise((resolve, reject) => {
            request.patch(options, (error, response, body) => {
                if(error){
                    const parseError = jsonText => {
                        const json_string = jsonText.toString('utf-8');
                        var result = JSON.parse(json_string, dateReviver);
                        var err = parseErrorMessage(result);
                        reject(err);
                    };
                    if (encoding && encoding.indexOf('gzip') >= 0) {
                        zlib.gunzip(body, (err, dezipped) => {
                            parseError(dezipped);
                        });
                    }
                    else{
                        parseError(body);

                    }
                }
                else resolve();
            })
        });
    };
    const sendPostRequest = async function (query, data, headers) {
        //  get token
        const JWToken = await ADALService.acquireToken();
        const options = {
            url: `${webApiUrl() + query }`,
            headers: {
                'X-some-headers': 'Some headers',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json; charset=utf-8',
                Authorization: `Bearer ${JWToken}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                Accept: 'application/json',
                Prefer: 'odata.include-annotations="*"',
            },
            body: JSON.stringify(data),
            encoding: null,
        };

        return new Promise((resolve, reject) => {
            request.post(options, (error, response, body) => {
                if(error){
                    const parseError = jsonText => {
                        // Bug: sometimes CRM returns 'object reference' error
                        // Fix: if we retry error will not show again
                        const json_string = jsonText.toString('utf-8');
                        var result = JSON.parse(json_string, dateReviver);
                        var err = parseErrorMessage(result);
                        reject(err);
                    };
                    if (encoding && encoding.indexOf('gzip') >= 0) {
                        zlib.gunzip(body, (err, dezipped) => {
                            parseError(dezipped);
                        });
                    }
                    else{
                        parseError(body);

                    }
                }
                else if (response.status === 200) {
                    const parseResponse = jsonText => {
                        const json_string = jsonText.toString('utf-8');
                        var result = JSON.parse(json_string, dateReviver);
                        resolve(result);
                    };

                    if (encoding && encoding.indexOf('gzip') >= 0) {
                        zlib.gunzip(body, (err, dezipped) => {
                            parseResponse(dezipped);
                        });
                    }
                    else{
                        parseResponse(body);
                    }
                }
                else if(response.status === 204 || response.status === 1223){
                    const uri = response.headers.get("OData-EntityId");
                    if (uri) {
                        // create request - server sends new id
                        const regExp = /\(([^)]+)\)/;
                        const matches = regExp.exec(uri);
                        const newEntityId = matches[1];
                        resolve(newEntityId);
                    }
                    else {
                        // other type of request - no response
                        resolve();
                    }
                }
                else{
                    resolve();
                }
            });
        })
    };
    const sendDeleteRequest = async function (query, headers) {
    //  get token
    const JWToken = await ADALService.acquireToken();
    const options = {
        url: `${webApiUrl() + query }`,
        headers: {
            'X-some-headers': 'Some headers',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: `Bearer ${JWToken}`,
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
            Accept: 'application/json',
            Prefer: 'odata.include-annotations="*"',
        },
        encoding: null,
    };

    return new Promise((resolve, reject) => {
        request.patch(options, (error, response, body) => {
            if(error){
                const parseError = jsonText => {
                    const json_string = jsonText.toString('utf-8');
                    const result = JSON.parse(json_string, dateReviver);
                    const err = parseErrorMessage(result);
                    reject(err);
                };
                if (encoding && encoding.indexOf('gzip') >= 0) {
                    zlib.gunzip(body, (err, dezipped) => {
                        parseError(dezipped);
                    });
                }
                else{
                    parseError(body);

                }
            }
            else resolve();
        })
    });
};

    module.exports = crmWebAPI;
