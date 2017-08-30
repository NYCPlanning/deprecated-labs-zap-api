# labs-lucats-proxy
An express.js api that scrapes data from LUCATS in real-time and serves JSON.

## Development Environment

1. Clone this repo & install dependencies
  ```
  git clone https://github.com/NYCPlanning/labs-lucats-proxy.git
  npm install
  ```

2. Start the server
  ```
  npm run devstart
  ```

## Routes

- `/urlurp/cd/:boroname/:cd.json` - gets a combined list of active and completed projects for a given borough and cd.

`boroname` - one of `manhattan`, `bronx`, `brooklyn`, `queens`, `statenisland`
`cd` - the community district number without leading zeroes

## Example response

A `GET` to `/urlurp/cd/brooklyn/11.json` will result in the following response:

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
