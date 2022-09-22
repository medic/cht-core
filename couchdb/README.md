# CHT-COUCHDB

Clustered CouchDB 2.3.1 Docker Image which will support 3 replicas of data stored in 8 shards (per replica) across 3 servers. Our cht-couchdb docker images will auto-setup a CouchDB cluster with the above specifications. For more explanation, see the [Cluster Theory](https://docs.couchdb.org/en/stable/cluster/theory.html#cluster-theory) section of the CouchDB documentation.

## Deployment

- For testing architecture v3 clustered couchdb or development of related services, please launch prod.couchdb-cluster.yml
- How to deploy CouchDB in a production environment for CHT-Core? [placeholder](link-to-docs)
- Deploying multiple CouchDB clusters for a development or testing environment? [placeholder](link-to-docs)
- Migrating existing data from a single-node CouchDB deployment to the above clustered CouchDB setup? [placeholder](link-to-docs)

## Requirements

Below is a list of required enviroment variables that must be set for the CouchDB Cluster to work appropriately. For production deployments, please export variables before launching any docker-compose templates that contain CouchDB declarations, otherwise default admin credentials will be used.

### Environment Variables

#### COUCHDB_USER

This sets the main admin user username. This is a mandatory field.

#### COUCHDB_PASSWORD

This sets the admin user password. This is a mandatory field.

#### COUCHDB_SECRET

This field sets the secret that is used by the CouchDB peers to communicate with each other. This field is mandatory if you are running this image in clustered mode and should be consistent across all nodes in a cluster. The secret is used in calculating and evaluating cookie and proxy authentication and should be set consistently to avoid unnecessary repeated session cookie requests.

#### COUCHDB_UUID

This field identifies each CouchDB instance. If you are adding a new node to a cluster, you need to set this field to the same value as this is what identified your node to be part of a cluster. The UUID is used in identifying the cluster when replicating. If this value is not consistent across all nodes in the cluster, replications may be forced to rewind the changes feed to zero, leading to excessive memory, CPU and network use.

#### SVC_NAME

This is an identifier by which other nodes can access this node. This value should contain either the node's IP address or the [FQDN](https://en.wikipedia.org/wiki/Fully_qualified_domain_name) of the node. 

#### CLUSTER_PEER_IPS

This field should only be set on the cluster set up coordination node aka `setup-coordination-node` . In other clustered database systems this is known as the master/main node, however, CouchDB does not have the master/slave concept as any node can be master. This field should contain a comma-separated list of IP addresses or FQDNs. If you are deploying a clustered setup on a basic docker network, please ensure there is a (.) in your service names, to validate the FQDN requirements for Erlang. 

```yaml
CLUSTER_PEER_IPS=couchdb.2,couchdb.3"
```

#### COUCHDB_SYNC_ADMINS_NODE

This field ensures that the hash that CouchDB generates during bootup for saving your admin password syncs across nodes in the cluster. This sync of the hashed password is required for user session cookies to work across nodes. We omit this field from our setup-coordination-node, which is commonly couchdb.1. This is a required field for the other nodes in your cluster.


## Contributing configuration and testing automatic cluster setup

After making your config changes, please run tests to make sure clustering setup and entrypoints are stable. For local use, tag your image and change your docker-compose template declarations to reflect your tag. For publishing a production image, open a PR with your config changes and assign an SRE to review. Currently, we will manually build and publish the image to dockerhub. There is an open issue to handle this via CI.

To test that your configuration changes dont impact entrypoint and clustering setup, please run:


1. Run tests for the clustered couchdb nodes scenario

```bash
 docker-compose -f couchdb/test.couchdb-cluster.yml  build
 docker-compose -f couchdb/test.couchdb-cluster.yml  run  sut

```

2. Tear down test containers

```bash
 docker-compose -f couchdb/test.couchdb-cluster.yml down
```

To create more tests, add them couchdb/tests/tests.bats