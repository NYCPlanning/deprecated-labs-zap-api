/*eslint-disable */

module.exports = () => (req, res, next) => {

    //allow access to our API with these urls
    let allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
    ];

    let origin = req.headers.origin;

    //check if the origin is a part of the allowedOrigins array
    //if it is, set the header and allow access.
    if(allowedOrigins.indexOf(origin) > -1){
        res.header('Access-Control-Allow-Origin', origin);
    }

    //Request methods you wish to allow
    res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS, PUT, PATCH, DELETE'
    );

    //Request headers you wish to allow
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );

    //run controller logic
    next();
};