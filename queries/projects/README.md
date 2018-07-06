Database Notes

## normalized_projects (materialized view)
The filter queries served at `/projects` depend on a materialized view called `normalized_projects`.  The SQL for this materialized view is maintained in `./normalized]-projects.sql`, but there is no automated way of updating it in the database when this sql is modified.  

### Updating the materialized view
`DROP MATERIALIZED VIEW normalized_projects`, then run the command to CREATE it again using the sql in `./normalized-projects.sql`

### Refreshing the materialized view
The data from zap are updated once an hour, so the materialized view is set up with a cron job to run on the hour.

The host machine should have an environment variable `DATABASE_CONNECTION_STRING`.  

The cron job runs an ephemeral docker container that links to the postgis container: `docker run -it --rm --link zap-postgis:postgres postgres psql $DATABASE_CONNECTION_STRING -c "REFRESH MATERIALIZED VIEW normalized_projects"`
