# labs-zap-api
An express.js api that serves project data from the Zoning Application Portal (ZAP).

## Requirements

You'll need [git](https://git-scm.com/downloads) and [node.js](https://nodejs.org/en/) installed on your development machine.

## Local development

Clone this repository `git clone https://github.com/NYCPlanning/labs-zap-api.git`

Navigate to the repo and install dependencies: `cd labs-zap-api && npm install`

Start the development server.  `npm run devstart`

### Environment Variables
You'll need to create a `.env` file in the root of the repo, with the following environment variables:

`DATABASE_CONNECTION_STRING` - postgreSQL connection string

`HOST` - used to build out vector tile URLS, set it to 'http://localhost:3000' if developing locally

`RECAPTCHA_SITE_KEY` - Used for validating human-ness before feedback submission

`RECAPTCHA_SECRET_KEY` - Used for validating human-ness before feedback submission

`GITHUB_ACCESS_TOKEN` - An access token that allows for creating new issues in a github repo

`SLACK_VERIFICATION_TOKEN` - a token for verifying POST requests from a custom slack slash command

## Architecture

The api connects to a postgis database, and uses MapPLUTO hosted in Carto to retrieve tax lot geometries.  
We are also able to serve vector tiles directly from postGIS using `st_asmvt()`, so no extra vector tile processing is required in node.

### Routes

`GET /projects` - Get a paginated filtered list of projects

Use query Parameters for filtering:



`page` *default '1'* - page offset

`itemsPerPage` *default 30* - the number of projects to return with each request

`community-districts[]` - array of community district codes (mn01, bx02)

`action-types[]` - array of action types

`boroughs[]` - array of borough names, including 'Citywide'

`dcp_ceqrtype[]` - array of CEQR types

`dcp_ulurp_nonulurp[]` - array of 'ULURP' or 'Non-ULURP'

`dcp_femafloodzonev` *default false* - flood zone boolean

`dcp_femafloodzonecoastala` *default false* - flood zone boolean

`dcp_femafloodzonea` *default false* - flood zone boolean

`dcp_femafloodzoneshadedx` *default false* - flood zone boolean

`dcp_publicstatus[] ` *default ['Complete', 'Filed', 'In Public Review', 'Unknown']* - the project's public status

`dcp_certifiedreferred[]` - array of unix epoch timestamps to filter for date range

`project_applicant_text` - string for text match filtering against the project name, project brief, and applicant name

`ulurp_ceqr_text` - string for text match filtering against a project's ULURP numbers and CEQR number

`block` - string for text match filtering against the tax blocks associated with a project


`GET /projects/:projectid` - Get one project

Used by the frontend to get JSON data for a single project.  Example:`/projects/2018K0356`

`GET /zap/:zapAcronym` - Get projects for a community district

Used by the [Community Profiles](https://communityprofiles.planning.nyc.gov/) site to list ZAP projects for a given community distric.

`GET /projects/tiles/:tileid/:z/:x/:y.mvt` - Get a vector tile for the  

## Deployment

This api is easily deployed with dokku.

Create a new remote: `git remote add dokku dokku@{host}:zap-api`
Deploy with a git push `git push dokku master` or alias another branch to master `git push dokku {other-branch}:master`

## Contact us

You can find us on Twitter at [@nycplanninglabs](https://twitter.com/nycplanninglabs), or comment on issues and we'll follow up as soon as we can. If you'd like to send an email, use [labs_dl@planning.nyc.gov](mailto:labs_dl@planning.nyc.gov)
