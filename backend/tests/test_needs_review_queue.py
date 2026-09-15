import json
import uuid

from app import llm_extraction

TXT_BYTES = b"hello world, this is plain text"


def _upload(client, headers, monkeypatch, filename: str, raw_response: str, content: bytes = TXT_BYTES) -> dict:
    monkeypatch.setattr(llm_extraction.anthropic_client, "extract", lambda text: raw_response)
    response = client.post(
        "/documents/upload",
        files={"file": (filename, content, "text/plain")},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()


def _fields_response(flagged_field_name: str, flagged_value: str, confidence: float) -> str:
    return json.dumps(
        {
            "fields": [
                {
                    "field_name": "_document_type",
                    "value": "note",
                    "source_quote": "hello",
                    "confidence": 0.9,
                },
                {
                    "field_name": flagged_field_name,
                    "value": flagged_value,
                    "source_quote": "hello",
                    "confidence": confidence,
                },
            ]
        }
    )


# --- Task 1.1: flagged fields listed across documents ---


def test_needs_review_queue_lists_flagged_fields_across_documents(client, auth_headers, monkeypatch):
    doc_a = _upload(
        client, auth_headers, monkeypatch, "a.txt",
        _fields_response("low_conf_a", "unsure a", 0.2),
    )
    doc_b = _upload(
        client, auth_headers, monkeypatch, "b.txt",
        _fields_response("low_conf_b", "unsure b", 0.1),
    )

    response = client.get("/needs-review", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    document_ids = {item["document_id"] for item in body["items"]}
    field_names = {item["field_name"] for item in body["items"]}
    assert document_ids == {doc_a["id"], doc_b["id"]}
    assert field_names == {"low_conf_a", "low_conf_b"}
    assert all(item["needs_review"] is True for item in body["items"])
    assert body["total"] == 2


# --- Task 1.2: empty result when nothing is flagged ---


def test_needs_review_queue_empty_when_nothing_flagged(client, auth_headers, monkeypatch):
    _upload(
        client, auth_headers, monkeypatch, "a.txt",
        _fields_response("high_conf", "confident value", 0.9),
    )

    response = client.get("/needs-review", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 0


# --- Task 1.3: another user's flagged fields are excluded ---


def test_needs_review_queue_excludes_another_users_flagged_fields(client, register_user, monkeypatch):
    user_a = register_user("QueueUserA")
    user_b = register_user("QueueUserB")
    headers_a = {"Authorization": f"Bearer {user_a['api_key']}"}
    headers_b = {"Authorization": f"Bearer {user_b['api_key']}"}

    _upload(client, headers_a, monkeypatch, "a.txt", _fields_response("field_a", "value a", 0.2))
    _upload(client, headers_b, monkeypatch, "b.txt", _fields_response("field_b", "value b", 0.2))

    response_a = client.get("/needs-review", headers=headers_a)
    body_a = response_a.json()
    field_names_a = {item["field_name"] for item in body_a["items"]}
    assert field_names_a == {"field_a"}
    assert body_a["total"] == 1


# --- Task 1.4: pagination ---


def test_needs_review_queue_paginated(client, auth_headers, monkeypatch):
    for i in range(3):
        _upload(
            client, auth_headers, monkeypatch, f"doc{i}.txt",
            _fields_response(f"flagged_{uuid.uuid4().hex[:8]}", f"value{i}", 0.2),
        )

    first_page = client.get("/needs-review", params={"limit": 2, "offset": 0}, headers=auth_headers).json()
    assert len(first_page["items"]) == 2
    assert first_page["total"] == 3

    second_page = client.get("/needs-review", params={"limit": 2, "offset": 2}, headers=auth_headers).json()
    assert len(second_page["items"]) == 1
    assert second_page["total"] == 3


# --- Task 1.5: unauthenticated request rejected ---


def test_needs_review_queue_requires_authentication(client):
    response = client.get("/needs-review")
    assert response.status_code == 401
