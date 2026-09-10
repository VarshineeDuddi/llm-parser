def test_put_and_get_round_trip(s3):
    s3.put("documents/some-key", b"hello world")
    assert s3.get("documents/some-key") == b"hello world"
