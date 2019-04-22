#!/bin/bash
if [ "$#" -ne 2 ]; then
    echo "Required script arguments missing!"
    echo "Usage: ./update_staging.sh pgpassword pghoststring"
    exit 1
fi

pg_pass="$1"
pg_host="$2"
pg_port=5433
pg_port_staging=5431

echo "going to overwrite the staging DB with data from prod. Are you sure you want to do this? (type 1 or 2)"
OPTS="yes no"
select yn in $OPTS; do
    if [ "$yn" = "no" ]; then
        exit 1;
    elif [ "$yn" = "yes" ]; then
        echo -e "This is going to take a while. > 10 min. Go do something else.\n\n\n"
        PGPASSWORD=$pg_pass pg_dump -U postgres -h $pg_host -p $pg_port -c | PGPASSWORD=$pg_pass psql -U postgres -h $pg_host -p $pg_port_staging
        echo -e "\n\n\ndone!"
    fi
done


PGPASSWORD=$pg_pass pg_dump -U postgres -h $pg_host -p $pg_port -c | PGPASSWORD=$pg_pass psql -U postgres -h $pg_host -p $pg_port_staging
echo "\n\n\ndone!"
