# Applicant Maps API

An Express API for creating, reading, and updating DCP Applicant Maps.  Uses a mongodb database to store documents for an applicant mapping project.

Works with the [labs-applicantmaps](https://github.com/nycplanning/labs-applicantmaps) frontend app.

## Endpoints

`GET /projects/:id`
- Get a project's config by id

`POST /projects`
- Create a new project

`POST /projects/:id`
- Update an existing project by id.  This results in incrementing the `__v` attribute in mongodb.

## Schema

Schema is defined in `models/projects.js`.  On creation of a new project, `shortid` is used to generate a unique hash that is stored in the `_id property`

```
{
  _id: {
    type: String,
    required: true,
    default: shortid.generate(),
  },
  meta: {
    type: Object,
    required: true,
  },
  maps: {
    type: Array,
    required: true,
  },
}
```
