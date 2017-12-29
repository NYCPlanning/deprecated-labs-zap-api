# labs-lucats-proxy
An express.js api that scrapes data from [LUCATS](http://a030-lucats.nyc.gov/lucats/welcome.aspx) in real-time for a given community district and serves it up as JSON.

## Requirements

You will need the following things properly installed on your computer.

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (with NPM)

## Local development

- Clone this repo `git clone https://github.com/NYCPlanning/labs-lucats-proxy.git`
- Install Dependencies `npm install`
- Start the server `npm run devstart`
- Try an API call at `localhost:3000/ulurp/cd/brooklyn/1.json`

## Architecture
This is a simple express.js app.  When a request comes in for a community district, it fetches the corresponding page on LUCATS and scrapes it, pulling out bits of data for each project.  These are assembled into an array of objects, and sent out as a JSON response.

### Routes

- `https://lucats.planninglabs.nyc/urlurp/cd/:boroname/:cd.json` - gets a combined list of active and completed projects for a given borough and cd.

`boroname` - one of `manhattan`, `bronx`, `brooklyn`, `queens`, `statenisland`
`cd` - the community district number without leading zeroes

### Example response

A `GET` to `/ulurp/cd/brooklyn/11.json` will result in the following response:

```
[
  {
    landUseAll: "N 180044 ZCK",
    landUseId: "180044",
    landUseReceivedDate: "08/08/2017",
    ceqrNumber: "18DCP022K",
    ceqrReceivedDate: "",
    lastMilestone: "Application Under Review",
    lastMilestoneDate: "08/08/2017",
    projectName: "Toys "R" Us Waterfront Cert.",
    location: "1684 Shore Parkway",
    cd: "K11",
    status: "active"
  },
  {
    landUseAll: "N 170399 ZCK",
    landUseId: "170399",
    landUseReceivedDate: "05/08/2017",
    ceqrNumber: "17DCP174K",
    ceqrReceivedDate: "",
    lastMilestone: "",
    lastMilestoneDate: "",
    projectName: "8750 17th Ave (How Chair Cert.)",
    location: "8750 17th Avenue",
    cd: "K11",
    status: "active"
  },
  {
    landUseAll: "N 150364 ZAK",
    landUseId: "150364",
    landUseReceivedDate: "05/08/2015",
    ceqrNumber: "77DCP",
    ceqrReceivedDate: "",
    lastMilestone: "Revised Plan Received",
    lastMilestoneDate: "04/24/2017",
    projectName: "Caeser's Bay Shopping Center",
    location: "8973/8995 Bay Parkway",
    cd: "K11",
    status: "active"
  },
  {
    landUseAll: "N 180044 ZCK",
    landUseId: "180044",
    landUseReceivedDate: "08/08/2017",
    ceqrNumber: "18DCP022K",
    ceqrReceivedDate: "",
    lastMilestone: "Application Under Review",
    lastMilestoneDate: "08/08/2017",
    projectName: "Toys "R" Us Waterfront Cert.",
    location: "1684 Shore Parkway",
    cd: "K11",
    status: "completed"
  },
  {
    landUseAll: "N 170399 ZCK",
    landUseId: "170399",
    landUseReceivedDate: "05/08/2017",
    ceqrNumber: "17DCP174K",
    ceqrReceivedDate: "",
    lastMilestone: "",
    lastMilestoneDate: "",
    projectName: "8750 17th Ave (How Chair Cert.)",
    location: "8750 17th Avenue",
    cd: "K11",
    status: "completed"
  },
  {
    landUseAll: "N 150364 ZAK",
    landUseId: "150364",
    landUseReceivedDate: "05/08/2015",
    ceqrNumber: "77DCP",
    ceqrReceivedDate: "",
    lastMilestone: "Revised Plan Received",
    lastMilestoneDate: "04/24/2017",
    projectName: "Caeser's Bay Shopping Center",
    location: "8973/8995 Bay Parkway",
    cd: "K11",
    status: "completed"
  }
]
```

## Backend services

- **[LUCATS]((http://a030-lucats.nyc.gov/lucats/welcome.aspx)** -  A DCP web application for searching land use applications.

## Testing and checks

- **ESLint** - We use ESLint with Airbnb's rules for JavaScript projects
  - Add an ESLint plugin to your text editor to highlight broken rules while you code
  - You can also run `eslint` at the command line with the `--fix` flag to automatically fix some errors.

## Deployment

Create dokku remote: `git remote add dokku dokku@{dokkudomain}:lucats`
Deploy: `git push dokku master`

## Contact us

You can find us on Twitter at [@nycplanninglabs](https://twitter.com/nycplanninglabs), or comment on issues and we'll follow up as soon as we can. If you'd like to send an email, use [labs_dl@planning.nyc.gov](mailto:labs_dl@planning.nyc.gov)
