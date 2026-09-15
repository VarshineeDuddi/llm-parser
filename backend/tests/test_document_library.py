import uuid


def _upload(client, headers, filename: str, content: bytes = b"hello world"):
    response = client.post(
        "/documents/upload",
        files={"file": (filename, content, "text/plain")},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()


# --- Task 1.1: documents listed, newest first, paginated, scoped ---


def test_list_documents_returns_newest_first(client, auth_headers):
    first = _upload(client, auth_headers, "a.txt")
    second = _upload(client, auth_headers, "b.txt")

    response = client.get("/documents", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    ids_in_order = [item["id"] for item in body["items"]]
    assert ids_in_order == [second["id"], first["id"]]
    assert body["total"] == 2


def test_list_documents_is_paginated(client, auth_headers):
    for i in range(3):
        _upload(client, auth_headers, f"doc{i}.txt")

    first_page = client.get("/documents", params={"limit": 2, "offset": 0}, headers=auth_headers).json()
    assert len(first_page["items"]) == 2
    assert first_page["total"] == 3

    second_page = client.get("/documents", params={"limit": 2, "offset": 2}, headers=auth_headers).json()
    assert len(second_page["items"]) == 1
    assert second_page["total"] == 3


def test_list_documents_excludes_another_users_documents(client, register_user):
    user_a = register_user("LibraryUserA")
    user_b = register_user("LibraryUserB")
    headers_a = {"Authorization": f"Bearer {user_a['api_key']}"}
    headers_b = {"Authorization": f"Bearer {user_b['api_key']}"}

    doc_a = _upload(client, headers_a, "a.txt")
    _upload(client, headers_b, "b.txt")

    response_a = client.get("/documents", headers=headers_a)
    body_a = response_a.json()
    ids_a = {item["id"] for item in body_a["items"]}
    assert ids_a == {doc_a["id"]}
    assert body_a["total"] == 1


def test_list_documents_includes_expected_fields(client, auth_headers):
    _upload(client, auth_headers, "sample.txt")

    response = client.get("/documents", headers=auth_headers)
    item = response.json()["items"][0]

    for field in (
        "id",
        "original_filename",
        "format",
        "size_bytes",
        "created_at",
        "status",
        "extraction_status",
        "duplicate_of_id",
    ):
        assert field in item


# --- Task 1.2: empty result, not an error ---


def test_list_documents_empty_when_none_uploaded(client, auth_headers):
    response = client.get("/documents", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 0


# --- Task 1.3: unauthenticated request rejected ---


def test_list_documents_requires_authentication(client):
    response = client.get("/documents")
    assert response.status_code == 401
