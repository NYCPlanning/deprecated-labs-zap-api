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

- `/cdprojects/:boroname/:cd` - gets the first 20 active projects associated with a given community district.

`boroname` - one of `manhattan`, `bronx`, `brooklyn`, `queens`, `statenisland`
`cd` - the community district number without leading zeroes

## Example response

A `GET` to `/cdprojects/brooklyn/11` will result in the following response:

```
[
  {
    landUseId: "N 180044 ZCK",
    landUseReceivedDate: "08/08/2017",
    ceqrNumber: "18DCP022K",
    ceqrReceivedDate: "",
    lastMilestone: "APPLICATION UNDER REVIEW",
    lastMilestoneDate: "08/08/2017",
    projectName: "TOYS "R" US WATERFRONT CERT.",
    location: "1684 SHORE PARKWAY",
    cd: "K11"
  },
  {
    landUseId: "N 170399 ZCK",
    landUseReceivedDate: "05/08/2017",
    ceqrNumber: "17DCP174K",
    ceqrReceivedDate: "",
    lastMilestone: "",
    lastMilestoneDate: "",
    projectName: "8750 17TH AVE (HOW CHAIR CERT.)",
    location: "8750 17TH AVENUE",
    cd: "K11"
  },
  {
    landUseId: "N 150364 ZAK",
    landUseReceivedDate: "05/08/2015",
    ceqrNumber: "77DCP",
    ceqrReceivedDate: "",
    lastMilestone: "REVISED PLAN RECEIVED",
    lastMilestoneDate: "04/24/2017",
    projectName: "CAESER'S BAY SHOPPING CENTER",
    location: "8973/8995 BAY PARKWAY",
    cd: "K11"
  }
]
```
