import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.pop("MONGO_URL", None)
from fastapi.testclient import TestClient  # noqa: E402

from server import app  # noqa: E402


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def auth(client, role="owner"):
    return {"Authorization": "Bearer " + client.post(f"/api/auth/demo/{role}").json()["token"]}
