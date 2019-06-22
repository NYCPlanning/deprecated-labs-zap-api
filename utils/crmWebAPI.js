/*eslint-disable */

const zlib = require('zlib');
const request = require('request');
const ADALService = require('./ADALServices');

const crmWebAPI = { };
    crmWebAPI.get = async (query, maxPageSize, headers) => await sendGetRequest(query, maxPageSize, headers);
    crmWebAPI.update = async (entitySetName, guid, data, headers) => await sendUpdateRequest(entitySetName, guid, data, headers);


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
    const fixLongODataAnnotations = function (dataObj) {  //return dataObj;
    const newObj = {};
    for (let name in dataObj) {
        const formattedValuePrefix = name.indexOf("@OData.Community.Display.V1.FormattedValue");
        const logicalNamePrefix = name.indexOf("@Microsoft.Dynamics.CRM.lookuplogicalname");
        const navigationPropertyPrefix = name.indexOf("@Microsoft.Dynamics.CRM.associatednavigationproperty");

        if (formattedValuePrefix >= 0) {
            const newName = name.substring(0, formattedValuePrefix);
            // if (newName && !(newName in hardcode)) changedKeys[newName] = dataObj[name];
            if(newName) newObj[`${newName}_formatted`] = dataObj[name];
        }
        else if (logicalNamePrefix >= 0) {
            const newName = name.substring(0, logicalNamePrefix);
            // if (newName && !(newName in hardcode)) changedKeys[newName] = dataObj[name];
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
                if (!error && response.statusCode === 200) {
                    // If response is gzip, unzip first
                    const encoding = response.headers['content-encoding'];
                    if (encoding && encoding.indexOf('gzip') >= 0) {
                        zlib.gunzip(body, (err, dezipped) => {
                            const json_string = dezipped.toString('utf-8');

                            var result = JSON.parse(json_string, dateReviver);
                            if (result["@odata.context"].indexOf("/$entity") >= 0) {
                                // retrieve single
                                result = fixLongODataAnnotations(result);
                            }
                            else if (result.value ) {       //&& $.isArray(result.value)
                                // retrieve multiple
                                var array = [];
                                for (var i = 0; i < result.value.length; i++) {
                                    array.push(fixLongODataAnnotations(result.value[i]));
                                }
                                result.value = array;
                            }
                            resolve(result);
                        });
                    } else {
                        // Bug: sometimes CRM returns 'object reference' error
                        // Fix: if we retry error will not show again
                        const json_string = dezipped.toString('utf-8');
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
                    }
                }
            });
        });
    };
    const sendUpdateRequest = function (entitySetName, guid, data, headers) {
    var reqErr = null;
    var query = entitySetName + "(" + guid + ")";
    return sendPatchRequest(query, data, headers, function () {
        // no return data - do nothing
    }, function (err) {
        reqErr = new Error(err);
    }, false);
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
            request.patch(options, (error) => {
                if(error){
                    reject(error);
                }
            })
        });
    };

    /////////////////////////////////////////////////////////////////////////////////////////////////////
    const trimGuid = function (guid) {
        return guid.replace(/-/g,"");
    };
    const sendPostRequest = function (query, data, headers, successCallback, errorCallback, async) {
        var req = new XMLHttpRequest();
        req.open("POST", webApiUrl() + query, async);
        req.setRequestHeader("OData-MaxVersion", "4.0");
        req.setRequestHeader("OData-Version", "4.0");
        req.setRequestHeader("Accept", "application/json");
        req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        req.setRequestHeader("Prefer", "odata.include-annotations=\"*\"");
        if (headers) {
            $.each(headers, function (name, header) {
                req.setRequestHeader(name, header);
            });
        }
        req.onreadystatechange = function () {
            if (this.readyState === 4) {
                req.onreadystatechange = null;
                if (this.status === 200) {
                    var result = crmkit.isNull(this.response) ? null : JSON.parse(this.response, dateReviver);
                    successCallback(result);
                }
                else if (this.status === 204 || this.status === 1223) {
                    var uri = this.getResponseHeader("OData-EntityId");
                    if (uri) {
                        // create request - server sends new id
                        var regExp = /\(([^)]+)\)/;
                        var matches = regExp.exec(uri);
                        var newEntityId = matches[1];
                        successCallback(newEntityId);
                    }
                    else {
                        // other type of request - no response
                        successCallback();
                    }
                } else {
                    errorCallback(parseErrorMessage(this));
                }
            }
        };
        req.send(crmkit.isNull(data) ? null : JSON.stringify(data));
    };
    const sendDeleteRequest = function (query, headers, successCallback, errorCallback, async) {
        var req = new XMLHttpRequest();
        req.open("DELETE", webApiUrl() + query, async);
        req.setRequestHeader("Accept", "application/json");
        req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        req.setRequestHeader("OData-MaxVersion", "4.0");
        req.setRequestHeader("OData-Version", "4.0");
        if (headers) {
            $.each(headers, function (name, header) {
                req.setRequestHeader(name, header);
            });
        }
        req.onreadystatechange = function () {
            if (this.readyState === 4) {
                req.onreadystatechange = null;
                if (this.status === 204 || this.status === 1223) {
                    successCallback();
                } else {
                    errorCallback(parseErrorMessage(this));
                }
            }
        };
        req.send();
    };
    const executeAction = function (actionName, data, entitySetName, guid, headers) {
        var reqRes = null;
        var reqErr = null;
        var query = "";
        if (crmkit.isEmpty(entitySetName)) query = actionName;
        else query = entitySetName + "(" + crmkit.trimGuid(guid) + ")/Microsoft.Dynamics.CRM." + actionName;
        sendPostRequest(query, data, headers, function (result) {
            reqRes = result;
        }, function (err) {
            reqErr = new Error(err);
        }, false);
        if (reqErr) throw reqErr;
        return reqRes;
    };
    const executeActionAsync = function (actionName, data, entitySetName, guid, headers) {
        var deferred = $.Deferred();
        var query = "";
        if (crmkit.isEmpty(entitySetName)) query = actionName;
        else query = entitySetName + "(" + crmkit.trimGuid(guid) + ")/Microsoft.Dynamics.CRM." + actionName;
        sendPostRequest(query, data, headers, deferred.resolve, deferred.reject, true);
        return deferred.promise();
    };
    const get = function (query, maxPageSize, headers) {
        var reqRes = null;
        var reqErr = null;
        sendGetRequest(query, maxPageSize, headers, function (result) {
            reqRes = result;
        }, function (err) {
            reqErr = new Error(err);
        }, false);
        if (reqErr) throw reqErr;
        return reqRes;
    };
    const getAsync = function (query, maxPageSize, headers) {
        var deferred = $.Deferred();
        sendGetRequest(query, maxPageSize, headers, deferred.resolve, deferred.reject, true);						// return promise
        return deferred.promise();
    };
    const updateAsync = function (entitySetName, guid, data, headers) {
        var deferred = $.Deferred();
        var query = entitySetName + "(" + crmkit.trimGuid(guid) + ")";
        sendPatchRequest(query, data, headers, deferred.resolve, deferred.reject, true);
        return deferred.promise();
    };
    const create = function (entitySetName, data, headers) {
        var reqRes = null;
        var reqErr = null;
        sendPostRequest(entitySetName, data, headers, function (newId) {
            reqRes = newId;
        }, function (err) {
            reqErr = new Error(err);
        }, false);
        if (reqErr) throw reqErr;
        return reqRes;
    };
    const createAsync = function (entitySetName, data, headers) {
        var deferred = $.Deferred();
        sendPostRequest(entitySetName, data, headers, deferred.resolve, deferred.reject, true);
        return deferred.promise();
    };
    const delete_ = function (entitySetName, guid, headers) {
        var reqErr = null;
        var query = entitySetName + "(" + crmkit.trimGuid(guid) + ")";
        sendDeleteRequest(query, headers, function () {
            // no return data - do nothing
        }, function (err) {
            reqErr = new Error(err);
        }, false);
        if (reqErr) throw reqErr;
    };
    const deleteAsync = function (entitySetName, guid, headers) {
        var deferred = $.Deferred();
        var query = entitySetName + "(" + crmkit.trimGuid(guid) + ")";
        sendDeleteRequest(query, headers, deferred.resolve, deferred.reject, true);
        return deferred.promise();
    };
    const associate = function (relationshipName, entitySetName1, guid1, entitySetName2, guid2, headers) {
        var reqErr = null;
        var query = entitySetName1 + "(" + crmkit.trimGuid(guid1) + ")/" + relationshipName + "/$ref";
        var data = {
            "@odata.id": webApiUrl() + entitySetName2 + "(" + crmkit.trimGuid(guid2) + ")"
        };
        sendPostRequest(query, data, headers, function () {
            // no return data - do nothing
        }, function (err) {
            reqErr = new Error(err);
        }, false);
        if (reqErr) throw reqErr;
    };
    const associateAsync = function (relationshipName, entitySetName1, guid1, entitySetName2, guid2, headers) {
        var deferred = $.Deferred();
        var query = entitySetName1 + "(" + crmkit.trimGuid(guid1) + ")/" + relationshipName + "/$ref";
        var data = {
            "@odata.id": webApiUrl() + entitySetName2 + "(" + crmkit.trimGuid(guid2) + ")"
        };
        sendPostRequest(query, data, headers, deferred.resolve, deferred.reject, true);
        return deferred.promise();
    };
    const disassociate = function (relationshipName, entitySetName1, guid1, guid2, headers) {
        var reqErr = null;
        var query = entitySetName1 + "(" + crmkit.trimGuid(guid1) + ")/" + relationshipName + "(" + crmkit.trimGuid(guid2) + ")/$ref";
        sendDeleteRequest(query, headers, function () {
            // no return data - do nothing
        }, function (err) {
            reqErr = new Error(err);
        }, false);
        if (reqErr) throw reqErr;
    };
    const disassociateAsync = function (relationshipName, entitySetName1, guid1, guid2, headers) {
        var deferred = $.Deferred();
        var query = entitySetName1 + "(" + crmkit.trimGuid(guid1) + ")/" + relationshipName + "(" + crmkit.trimGuid(guid2) + ")/$ref";
        sendDeleteRequest(query, headers, deferred.resolve, deferred.reject, true);
        return deferred.promise();
    };
    const escape = function (str) {
        if (!crmkit.isEmpty(str)) {
            return encodeURIComponent(String(str)).replace(/'/g, "''");
        }
        return str;
    };
    const getOptionSet = function (entityName, attrName) {
        var entityRes = crmkit.webapi.get("EntityDefinitions?$select=MetadataId&$filter=LogicalName eq '" + entityName.toLowerCase() + "'", 1);
        if (entityRes.value.length > 0) {
            var metadataId = entityRes.value[0].MetadataId;
            var attrRes = crmkit.webapi.get("EntityDefinitions(" + metadataId + ")/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=MetadataId&$expand=OptionSet,GlobalOptionSet&$filter=LogicalName eq '" + attrName.toLowerCase() + "'", 1);

            if (attrRes.value.length > 0) {
                var picklistMetadata = attrRes.value[0];
                var optionSet = picklistMetadata.GlobalOptionSet || picklistMetadata.OptionSet;

                if (optionSet) {
                    var options = [];
                    for (var i = 0; i < optionSet.Options.length; i++) {
                        options.push({
                            label: optionSet.Options[i].Label.UserLocalizedLabel.Label,
                            value: optionSet.Options[i].Value
                        });
                    }
                    return options;
                }
                else {
                    throw new Error("OptionSet metadata not found for attribute '" + attrName + "' in entity '" + entityName + "'.");
                }
            }
            else {
                throw new Error("Attribute metadata not found for attribute '" + attrName + "' in entity '" + entityName + "'.");
            }
        }
        else {
            throw new Error("Entity metadata not found for entity '" + entityName + "'.");
        }
    };
    const getOptionSetAsync = function (entityName, attrName) {
        var deferred = $.Deferred();
        crmkit.webapi.getAsync("EntityDefinitions?$select=MetadataId&$filter=LogicalName eq '" + entityName.toLowerCase() + "'", 1).then(function (result) {
            if (result.value.length > 0) {
                var metadataId = result.value[0].MetadataId;
                return crmkit.webapi.getAsync("EntityDefinitions(" + metadataId + ")/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=MetadataId&$expand=OptionSet,GlobalOptionSet&$filter=LogicalName eq '" + attrName.toLowerCase() + "'", 1);
            }
            else {
                deferred.reject("Entity metadata not found for entity '" + entityName + "'.");
            }
        }).then(function (result) {
            if (result.value.length > 0) {
                var picklistMetadata = result.value[0];
                var optionSet = picklistMetadata.GlobalOptionSet || picklistMetadata.OptionSet;

                if (optionSet) {
                    var options = [];
                    for (var i = 0; i < optionSet.Options.length; i++) {
                        options.push({
                            label: optionSet.Options[i].Label.UserLocalizedLabel.Label,
                            value: optionSet.Options[i].Value
                        });
                    }
                    deferred.resolve(options);
                }
                else {
                    deferred.reject("OptionSet metadata not found for attribute '" + attrName + "' in entity '" + entityName + "'.");
                }
            }
            else {
                deferred.reject("Attribute metadata not found for attribute '" + attrName + "' in entity '" + entityName + "'.");
            }
        }).catch(deferred.reject);
        return deferred.promise();
    };

module.exports = crmWebAPI;
