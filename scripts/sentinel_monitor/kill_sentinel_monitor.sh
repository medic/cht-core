#!/bin/sh
ps ax | grep sentinel_monitor_launcher | grep -v grep | awk '{print $1}' | xargs kill
