#!/usr/bin/env python3
import asyncio
import os
from typing import List

import httpx

from logger import log

couchdb_servers: List[str] = os.environ["COUCHDB_SERVERS"].split(",")
# Example: COUCHDB_SERVERS="couchdb.1,couchdb.2,couchdb.3"
username: str = os.environ["COUCHDB_USER"]
password: str = os.environ["COUCHDB_PASSWORD"]


def get_membership_endpoint(couchdb_url: str) -> str:
    return f"http://{username}:{password}@{couchdb_url}:5984/_membership"


def _send_down_response(writer: asyncio.StreamWriter) -> None:
    _send_and_close(writer, b"down\n")


def _send_up_response(writer: asyncio.StreamWriter) -> None:
    _send_and_close(writer, b"up\n")


def _send_and_close(writer: asyncio.StreamWriter, message: bytes) -> None:
    log.info("Response: %r", message)
    writer.write(message)
    log.info("Closing connection")
    writer.close()


async def is_healthy() -> bool:
    """
    Checks that all couchdb servers are part of the cluster
    """
    try:
        first_couchdb_server: str = couchdb_servers[0]
        async with httpx.AsyncClient() as client:
            r = await client.get(
                get_membership_endpoint(first_couchdb_server), timeout=1
            )
        data: dict = r.json()
        log.debug("Response data: %r", data)

        all_nodes: List[str] = sorted(data["all_nodes"])
        cluster_nodes: List[str] = sorted(data["cluster_nodes"])

        if len(all_nodes) != len(couchdb_servers):
            log.warning("Nodes starting up")
            log.warning(
                f"Details: all_nodes: {all_nodes}. couchdb_servers: {couchdb_servers}"
            )
            return False
        elif all_nodes != cluster_nodes:
            log.warning("_membership shows not all nodes are part of Cluster")
            log.warning(
                f"Details: all_nodes: {all_nodes}. cluster_nodes: {cluster_nodes}"
            )
            return False

        return True

    except Exception as e:
        print("Exception when checking health:", e)
        return False


async def handle_healthcheck(
    _: asyncio.StreamReader, writer: asyncio.StreamWriter
) -> None:
    if await is_healthy():
        _send_up_response(writer)
    else:
        _send_down_response(writer)


async def main() -> None:
    server: asyncio.Server = await asyncio.start_server(
        handle_healthcheck, "0.0.0.0", 5555
    )

    addrs: str = ", ".join(str(sock.getsockname()) for sock in server.sockets)
    log.info(f"Serving on {addrs}")

    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
