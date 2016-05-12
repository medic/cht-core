## Sentinel Monitor
Monitors the Sentinel. Ha.
Emails if specific events are found in the sentinel logs.
Runs every 5 minutes.
Looks for config file in same dir. Outputs log file sentinel_monitor.log in same dir.

# Run
1. Edit the sentinel_monitor_config.json : instanceName, events to monitor, email of sender/receiver, etc.
2. Copy the whole sentinel_monitor dir to the prod machine. Ssh into prod machine.
3. Add node and npm in path.
`sudo find /srv/software -name node`
`export PATH=$PATH:<node path>`
4. Go to the `sentinel_monitor` dir you just created and run `npm install`.
5. Run monitor : `node sentinel_monitor_launcher.js &`
6. Check logs are being output all right, and emails are being sent.
You can fiddle with config, with frequency in sentinel_monitor_launcher.js, and use dryrun to avoid email if necessary.


# Stop
You need to stop the launcher process. If you only stop the monitor, the launcher will continue running the monitor periodically.
Kill script : `./kill_sentinel_monitor.sh`

# Troubleshooting
None. It never makes trouble. Hopefully.
Each run of the monitor should log "End of run" at the end. If not, then it got interrupted by something.
