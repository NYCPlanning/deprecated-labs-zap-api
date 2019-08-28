[![CircleCI](https://circleci.com/gh/NYCPlanning/labs-zap-api/tree/develop.svg?style=svg)](https://circleci.com/gh/NYCPlanning/labs-zap-api/tree/develop)

# labs-zap-api
An express.js api that serves project data from the Zoning Application Portal (ZAP).

## Requirements

You'll need [git](https://git-scm.com/downloads) and [node.js](https://nodejs.org/en/) installed on your development machine.

## Local development

Clone this repository `git clone https://github.com/NYCPlanning/labs-zap-api.git`

Navigate to the repo and install dependencies: `cd labs-zap-api && npm install`

Create `.env` with all the required environment variables.  

Make sure you have Docker open and running, then start the development server:  `npm run devstart`

### Local Database

- To start a local PostGIS instance, run `docker run --name zap-development -p 5432:5432 -e POSTGRES_PASSWORD=password -d mdillon/postgis`
- Update `.env` to include DATABASE_URL `DATABASE_URL=postgres://postgres:password@0.0.0.0:5432/postgres`
- ssh onto the server and create a dump file of the PostgreSQL database `docker exec {containername} pg_dump -U postgres postgres > {filename}`
- Transfer the file back to local machine `scp {username}@{host}:{path-to-file} {localfilename}`
- Restore database on your local machine `cat {localfilename} | docker exec -i zap-development psql -U postgres`

### Environment Variables
You'll need to create a `.env` file in the root of the repo, with the following environment variables:

`DATABASE_URL` - postgreSQL connection string

`HOST` - used to build out vector tile URLS, set it to 'http://localhost:3000' if developing locally

`RECAPTCHA_SITE_KEY` - Used for validating human-ness before feedback submission

`RECAPTCHA_SECRET_KEY` - Used for validating human-ness before feedback submission

`GITHUB_ACCESS_TOKEN` - An access token that allows for creating new issues in a github repo

`SLACK_VERIFICATION_TOKEN` - a token for verifying POST requests from a custom slack slash command

`SLACK_WEBHOOK_URL` - url for POSTing messages in a slack channel

`AIRTABLE_API_KEY` - api key for accessing the airtable with youtube video references

### GDAL Dependency

The shapefile download endpoint requires the gdal `ogr2ogr` command to be available in the environment.  

For local development on a Mac, use `brew install gdal` and make sure the command `ogr2ogr` works in your terminal.

You can also use docker to run the api on port 3000 in development:

`docker run -it -v $PWD:/zap-api -p 3000:3000 -w /zap-api geodatagouv/node-gdal npm run devstart`

This mounts your code in the docker container, and will use nodemon to restart when you save changes.

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


`GET /projects.{filetype}` - Start a download of projects data

    Available filetypes:
        - `csv` - tabular data only
        - `shp` - tabular data with polygon geometries
        - `geojson` - tabular data with polygon geometries

`GET /projects/:projectid` - Get one project

Used by the frontend to get JSON data for a single project.  Example:`/projects/2018K0356`

`GET /projects/tiles/:tileid/:z/:x/:y.mvt` - Get a vector tile for the

`GET /projects/:ceqrnumber` - A redirect query to make predictable URLs for zap projects using only a ceqr number.  if the ceqr number matches a project, returns a 301 redirect to the project page.  If the ceqr number cannot be found, returns a 301 redirect to the project filter page.

`GET /projects/:ulurpnumber` - A redirect query to make predictable URLs for zap projects using only a ulurp number.  if the ulurp number matches a project, returns a 301 redirect to the project page.  If the ulurp number cannot be found, returns a 301 redirect to the project filter page.


`GET /zap/:zapAcronym` - Get projects for a community district

Used by the [Community Profiles](https://communityprofiles.planning.nyc.gov/) site to list ZAP projects for a given community district.

## Deployment

This api is easily deployed with dokku.

Create a new remote: `git remote add dokku dokku@{host}:zap-api`
Deploy with a git push `git push dokku master` or alias another branch to master `git push dokku {other-branch}:master`

### Dockerfile Deployment
  This repo includes a `Dockerfile` which dokku will use to run the API.  See dokku's [Dockerfile Deployment](http://dokku.viewdocs.io/dokku/deployment/methods/dockerfiles/) docs for more info.

## Worker

This api includes a worker process (see `./Procfile`) that connects to the database and refreshes the materialized view `normalized_projects` every 30 minutes.  It will send slack messages to the #labs-bots channel to notify us of its status

The worker process will not run automatically.  It must be scaled using `dokku ps:scale {appname } worker=1`.

## Airtable
The `/projects/:projectid` endpoint uses `get-video-links` util to append an array of video links to a project's response.  The util does multiple calls to [this airtable](https://airtable.com/tblV8rUQQVwUoR2AI/) which links project ids with videos and timestamps.


## Contact us

You can find us on Twitter at [@nycplanninglabs](https://twitter.com/nycplanninglabs), or comment on issues and we'll follow up as soon as we can. If you'd like to send an email, use [labs_dl@planning.nyc.gov](mailto:labs_dl@planning.nyc.gov)
