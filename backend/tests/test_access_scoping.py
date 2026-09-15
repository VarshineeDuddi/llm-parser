import json
import uuid

from app import llm_extraction
from app.auth import generate_api_key, hash_api_key
from app.models import Document, User

TXT_BYTES = b"hello world, this is plain text"


def _upload(client, headers, monkeypatch, filename: str, content: bytes, raw_response: str) -> dict:
    monkeypatch.setattr(llm_extraction.anthropic_client, "extract", lambda text: raw_response)
    response = client.post(
        "/documents/upload",
        files={"file": (filename, content, "text/plain")},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()


def _fields_response(document_type: str, extra_fields: list[dict]) -> str:
    fields = [
        {
            "field_name": "_document_type",
            "value": document_type,
            "source_quote": document_type,
            "confidence": 0.9,
        },
        *extra_fields,
    ]
    return json.dumps({"fields": fields})


# --- Task 1.2: key generation and hashing ---


def test_generated_key_hashes_consistently():
    raw_key = generate_api_key()
    assert hash_api_key(raw_key) == hash_api_key(raw_key)


def test_wrong_key_hash_never_matches_stored_hash():
    raw_key = generate_api_key()
    other_key = generate_api_key()
    assert raw_key != other_key
    assert hash_api_key(raw_key) != hash_api_key(other_key)


def test_generated_keys_are_unique():
    assert generate_api_key() != generate_api_key()


# --- Task 1.3: registration issues a raw key exactly once ---


def test_register_user_returns_key_and_no_hash(client):
    response = client.post("/users", json={"name": "Alice"})
    assert response.status_code == 201
    body = response.json()
    assert "api_key" in body and body["api_key"]
    assert "id" in body
    assert body["name"] == "Alice"
    # The hash itself is never in the response -- only fields that exist on
    # UserRegisterOut (id, name, api_key) can leak, and none of them is the
    # stored hash.
    assert "api_key_hash" not in body


def test_register_user_persists_hash_not_raw_key(client, db_session):
    response = client.post("/users", json={"name": "Bob"})
    body = response.json()

    user = db_session.get(User, uuid.UUID(body["id"]))
    assert user is not None
    assert user.api_key_hash == hash_api_key(body["api_key"])
    assert user.api_key_hash != body["api_key"]


# --- Task 1.4: raw key is never retrievable again ---


def test_raw_key_not_present_in_authenticated_or_failed_requests(client, auth_headers):
    ok_response = client.get(f"/documents/{uuid.uuid4()}", headers=auth_headers)
    assert "api_key" not in ok_response.text

    failed_response = client.get(f"/documents/{uuid.uuid4()}", headers={"Authorization": "Bearer wrong"})
    assert failed_response.status_code == 401
    assert "api_key" not in failed_response.text


# --- Task 3.1: get_current_user dependency behavior ---


def test_valid_key_resolves_correct_user(client, register_user):
    user = register_user("Carol")
    response = client.get(
        f"/documents/{uuid.uuid4()}", headers={"Authorization": f"Bearer {user['api_key']}"}
    )
    # Not-found for a nonexistent document, not 401 -- proves the key
    # resolved successfully and the request proceeded past authentication.
    assert response.status_code == 404


def test_missing_authorization_header_rejected(client):
    response = client.get(f"/documents/{uuid.uuid4()}")
    assert response.status_code == 401


def test_invalid_key_rejected(client):
    response = client.get(
        f"/documents/{uuid.uuid4()}", headers={"Authorization": "Bearer not-a-real-key"}
    )
    assert response.status_code == 401


# --- Task 3.2: every retrofitted endpoint rejects an unauthenticated request ---


def test_all_six_endpoints_reject_unauthenticated_requests(client, auth_headers, monkeypatch):
    doc = _upload(
        client, auth_headers, monkeypatch, "a.txt", TXT_BYTES, _fields_response("note", [])
    )
    document_id = doc["id"]

    unauthenticated_cases = [
        ("post", "/documents/upload"),
        ("get", f"/documents/{document_id}"),
        ("get", f"/documents/{document_id}/extraction"),
        ("get", f"/documents/{document_id}/fields"),
        ("get", "/fields/_document_type"),
        ("get", "/document-types/note/documents"),
    ]
    for method, path in unauthenticated_cases:
        response = getattr(client, method)(path)
        assert response.status_code == 401, f"{method.upper()} {path} did not require auth"


# --- Task 4.1: uploaded document is owned by the uploader ---


def test_uploaded_document_owner_matches_authenticated_user(client, register_user, db_session):
    user = register_user("Dana")
    headers = {"Authorization": f"Bearer {user['api_key']}"}
    response = client.post(
        "/documents/upload",
        files={"file": ("a.txt", TXT_BYTES, "text/plain")},
        headers=headers,
    )
    assert response.status_code == 201
    document = db_session.get(Document, uuid.UUID(response.json()["id"]))
    assert str(document.owner_id) == user["id"]


# --- Task 4.2: single-document ownership scoping ---


def test_owner_can_access_own_document(client, register_user, monkeypatch):
    owner = register_user("Owner")
    headers = {"Authorization": f"Bearer {owner['api_key']}"}
    doc = _upload(client, headers, monkeypatch, "a.txt", TXT_BYTES, _fields_response("note", []))

    for path in (
        f"/documents/{doc['id']}",
        f"/documents/{doc['id']}/extraction",
        f"/documents/{doc['id']}/fields",
    ):
        response = client.get(path, headers=headers)
        assert response.status_code == 200


def test_non_owner_gets_not_found_for_another_users_document(client, register_user, monkeypatch):
    owner = register_user("Owner")
    other = register_user("Other")
    owner_headers = {"Authorization": f"Bearer {owner['api_key']}"}
    other_headers = {"Authorization": f"Bearer {other['api_key']}"}
    doc = _upload(
        client, owner_headers, monkeypatch, "a.txt", TXT_BYTES, _fields_response("note", [])
    )

    for path in (
        f"/documents/{doc['id']}",
        f"/documents/{doc['id']}/extraction",
        f"/documents/{doc['id']}/fields",
    ):
        response = client.get(path, headers=other_headers)
        assert response.status_code == 404


def test_null_owner_document_not_accessible_to_regular_user(client, register_user, db_session):
    document = Document(
        original_filename="legacy.txt",
        format="txt",
        size_bytes=10,
        storage_key="documents/legacy",
        status="received",
        owner_id=None,
    )
    db_session.add(document)
    db_session.commit()

    user = register_user("Regular")
    headers = {"Authorization": f"Bearer {user['api_key']}"}
    response = client.get(f"/documents/{document.id}", headers=headers)
    assert response.status_code == 404


# --- Task 5.1/5.2: cross-document query scoping ---


def test_field_occurrences_scoped_to_callers_own_documents(client, register_user, monkeypatch):
    field_name = f"total_{uuid.uuid4().hex[:8]}"
    user_a = register_user("UserA")
    user_b = register_user("UserB")
    headers_a = {"Authorization": f"Bearer {user_a['api_key']}"}
    headers_b = {"Authorization": f"Bearer {user_b['api_key']}"}

    _upload(
        client,
        headers_a,
        monkeypatch,
        "a.txt",
        TXT_BYTES,
        _fields_response(
            "note", [{"field_name": field_name, "value": "A", "source_quote": "hello", "confidence": 0.9}]
        ),
    )
    _upload(
        client,
        headers_b,
        monkeypatch,
        "b.txt",
        TXT_BYTES,
        _fields_response(
            "note", [{"field_name": field_name, "value": "B", "source_quote": "hello", "confidence": 0.9}]
        ),
    )

    response_a = client.get(f"/fields/{field_name}", headers=headers_a)
    assert response_a.status_code == 200
    values_a = {item["field_value"] for item in response_a.json()["items"]}
    assert values_a == {"A"}

    response_b = client.get(f"/fields/{field_name}", headers=headers_b)
    values_b = {item["field_value"] for item in response_b.json()["items"]}
    assert values_b == {"B"}


def test_documents_by_type_scoped_to_callers_own_documents(client, register_user, monkeypatch):
    doc_type = f"memo_{uuid.uuid4().hex[:8]}"
    doc_type_quote = f"DOCTYPE:{doc_type}"
    content = f"{doc_type_quote}\nSome memo text".encode()
    fields_response = json.dumps(
        {
            "fields": [
                {
                    "field_name": "_document_type",
                    "value": doc_type,
                    "source_quote": doc_type_quote,
                    "confidence": 0.9,
                }
            ]
        }
    )
    user_a = register_user("UserA2")
    user_b = register_user("UserB2")
    headers_a = {"Authorization": f"Bearer {user_a['api_key']}"}
    headers_b = {"Authorization": f"Bearer {user_b['api_key']}"}

    doc_a = _upload(client, headers_a, monkeypatch, "a.txt", content, fields_response)
    _upload(client, headers_b, monkeypatch, "b.txt", content, fields_response)

    response_a = client.get(f"/document-types/{doc_type}/documents", headers=headers_a)
    assert response_a.status_code == 200
    ids_a = {item["id"] for item in response_a.json()["items"]}
    assert ids_a == {doc_a["id"]}
