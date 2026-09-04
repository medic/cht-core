# CHT-COUCHDB

Modified version of CouchDB Docker Image.
The image supports clustering with 1 replica and 12 shards across 3 nodes (akin to a RAID 0 configuration) and single node deployments.

## Requirements

Below is a list of required environment variables that must be set for the CouchDB to work appropriately. For production deployments, please export variables before launching any docker-compose templates that contain CouchDB declarations, otherwise default admin credentials will be used.

### Environment Variables

#### COUCHDB_USER

This sets the main admin user username. This is a mandatory field.

#### COUCHDB_PASSWORD

This sets the admin user password. This is a mandatory field.

#### COUCHDB_SECRET

This field sets the secret that is used by the CouchDB peers to communicate with each other. This field is mandatory if you are running this image in clustered mode and should be consistent across all nodes in a cluster. The secret is used in calculating and evaluating cookie and proxy authentication and should be set consistently to avoid unnecessary repeated session cookie requests.

#### COUCHDB_UUID

This field identifies each CouchDB instance. If you are adding a new node to a cluster, you need to set this field to the same value as this is what identified your node to be part of a cluster. The UUID is used in identifying the cluster when replicating. If this value is not consistent across all nodes in the cluster, replications may be forced to rewind the changes feed to zero, leading to excessive memory, CPU and network use.

#### COUCHDB_DATA

Used for single node deployments. This field is optional and can be left blank. If set, it should point to a volume or directory where CouchDB will store its data.

#### DB1_DATA, DB2_DATA, DB3_DATA

Used for clustered deployments. These fields are optional and can be left blank. If set, they should point to volumes or directories where CouchDB will store its data for each respective node.

### COUCHDB_LOG_LEVEL

Sets the CouchDB log level. Valid values are: `debug`, `info`, `warn`, `error`, `fatal`. Default value is `info`. 
**Warning: Setting log level to `debug` can generate a large amount of logs and may impact performance, even cause Out Of Memory issues.**

#### SVC_NAME

This is an identifier by which other nodes can access this node. This value should contain either the node's IP address or the [FQDN](https://en.wikipedia.org/wiki/Fully_qualified_domain_name) of the node. 

#### CLUSTER_PEER_IPS

This field should only be set on the cluster set up coordination node aka `setup-coordination-node`. In other clustered database systems this is known as the main node, however in CouchDB any node can be main. This field should contain a comma-separated list of IP addresses or FQDNs. If you are deploying a clustered setup on a basic docker network, please ensure there is a (.) in your service names, to validate the FQDN requirements for Erlang.

```yaml
CLUSTER_PEER_IPS="couchdb.2,couchdb.3"
```

#### COUCHDB_SYNC_ADMINS_NODE

This field ensures that the hash that CouchDB generates during bootup for saving your admin password syncs across nodes in the cluster. This sync of the hashed password is required for user session cookies to work across nodes. We omit this field from our setup-coordination-node, which is commonly couchdb.1. This is a required field for the other nodes in your cluster.


## Contributing configuration and testing automatic cluster setup

After making your config changes, please run tests to make sure clustering setup and entrypoints are stable. For local use, tag your image and change your docker-compose template declarations to reflect your tag. 

To test that your configuration changes don't impact entrypoint and clustering setup, please run:

```bash
cd couchdb/tests
make test
```

To create more tests, add them `couchdb/tests/`. 
