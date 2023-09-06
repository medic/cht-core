#!/usr/bin/env python3
import asyncio
import os

import httpx

couchdb_servers = os.environ["COUCHDB_SERVERS"].split(",")
# Example: COUCHDB_SERVERS="couchdb.1,couchdb.2,couchdb.3"
username = os.environ["COUCHDB_USER"]
password = os.environ["COUCHDB_PASSWORD"]


def get_membership_endpoint(couchdb_url: str):
    return f"http://{username}:{password}@{couchdb_url}:5984/_membership"


def _send_down_response(writer: asyncio.StreamWriter):
    _send_and_close(writer, b"down\n")


def _send_up_response(writer: asyncio.StreamWriter):
    _send_and_close(writer, b"up\n")


def _send_and_close(writer: asyncio.StreamWriter, message: bytes):
    print(f"Response: {message!r}")
    writer.write(message)
    print("Closing connection")
    writer.close()


async def is_healthy():
    """
    Checks that all couchdb servers are part of the cluster
    """
    try:
        first_couchdb_server = couchdb_servers[0]
        async with httpx.AsyncClient() as client:
            r = await client.get(
                get_membership_endpoint(first_couchdb_server), timeout=1
            )
        data = r.json()
        all_nodes = sorted(data["all_nodes"])
        cluster_nodes = sorted(data["cluster_nodes"])

        if len(all_nodes) != len(couchdb_servers):
            print("Nodes starting up")
            print(
                f"Details: all_nodes: {all_nodes}. couchdb_servers: {couchdb_servers}"
            )
            return False
        elif all_nodes != cluster_nodes:
            print("_membership shows not all nodes are part of Cluster")
            print(f"Details: all_nodes: {all_nodes}. cluster_nodes: {cluster_nodes}")
            return False
        else:
            return True

    except Exception as e:
        print("Exception when checking health:", e)
        return False


async def handle_healthcheck(_: asyncio.StreamReader, writer: asyncio.StreamWriter):
    if await is_healthy():
        _send_up_response(writer)
    else:
        _send_down_response(writer)


async def main():
    server = await asyncio.start_server(handle_healthcheck, "0.0.0.0", 5555)

    addrs = ", ".join(str(sock.getsockname()) for sock in server.sockets)
    print(f"Serving on {addrs}")

    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
