#!/usr/bin/env bash

curl "http://router-api.discoverd:5000/routes?parent_ref=controller/apps/$FLYNN_APP_ID" > appInfo.json
