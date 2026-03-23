#!/bin/bash
# Install PyMongo/Motor mock
cat << 'PY_EOF' > app/tests/conftest.py
import pytest
import mongomock

@pytest.fixture(autouse=True)
def patch_mongodb(monkeypatch):
    client = mongomock.MongoClient()
    # Mock whatever is needed so we can run tests without real DB
PY_EOF
