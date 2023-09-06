import os
from types import ModuleType
from typing import List
from unittest.mock import patch

import httpx
import pytest


def import_check(couchdb_servers: List[str]) -> ModuleType:
    "Sets required environment variables and imports check"

    os.environ["COUCHDB_SERVERS"] = ",".join(COUCHDB_SERVERS)
    os.environ["COUCHDB_USER"] = "_"
    os.environ["COUCHDB_PASSWORD"] = "_"

    import check  # noqa: E402 # isort:skip

    return check


COUCHDB_SERVERS = ["127.0.1.1", "127.0.1.2", "127.0.1.3"]
check = import_check(COUCHDB_SERVERS)


@pytest.fixture
def mock_couchdb(data=None):
    pass


@patch(
    "httpx.AsyncClient.get",
    return_value=httpx.Response(200, json={"unexpected": "response"}),
)
@pytest.mark.asyncio
async def test_get_unexpected_json(httpx_mock):
    assert await check.is_healthy() is False


@patch(
    "httpx.AsyncClient.get",
    return_value=httpx.Response(
        200, json={"all_nodes": COUCHDB_SERVERS, "cluster_nodes": COUCHDB_SERVERS}
    ),
)
@pytest.mark.asyncio
async def test_healthcheck_when_all_up(httpx_mock):
    assert await check.is_healthy() is True


@patch(
    "httpx.AsyncClient.get",
    return_value=httpx.Response(
        200,
        json={
            "all_nodes": COUCHDB_SERVERS[0:2],
            "cluster_nodes": COUCHDB_SERVERS[0:2],
        },
    ),
)
@pytest.mark.asyncio
async def test_healthcheck_when_missing_one(httpx_mock):
    assert await check.is_healthy() is False


@patch(
    "httpx.AsyncClient.get",
    return_value=httpx.Response(
        200,
        json={
            "all_nodes": COUCHDB_SERVERS,
            "cluster_nodes": COUCHDB_SERVERS[0:2] + ["unexpected"],
        },
    ),
)
@pytest.mark.asyncio
async def test_healthcheck_when_servers_dont_match(httpx_mock):
    assert await check.is_healthy() is False
