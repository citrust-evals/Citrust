#!/bin/bash
mkdir -p /tmp/mongodb
mongod --dbpath /tmp/mongodb --fork --logpath /tmp/mongodb.log
sleep 3
