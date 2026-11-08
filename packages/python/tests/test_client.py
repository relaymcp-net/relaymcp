import json
from unittest.mock import patch
from urllib.error import HTTPError
from io import BytesIO

from relaymcp import RelayApiError, RelayClient


class Response:
    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self):
        return json.dumps({"inboxes": [], "nextCursor": None}).encode()


def test_client_sends_bearer_header():
    with patch("relaymcp.client.urlopen", return_value=Response()) as request:
        result = RelayClient("rl_test").list_inboxes()
    assert result["inboxes"] == []
    assert request.call_args.args[0].headers["Authorization"] == "Bearer rl_test"


def test_api_errors_are_structured():
    error = HTTPError("https://relay.test", 403, "Forbidden", {}, BytesIO(b'{"error":"Denied","code":"FORBIDDEN"}'))
    with patch("relaymcp.client.urlopen", side_effect=error):
        try:
            RelayClient("rl_test").list_inboxes()
        except RelayApiError as caught:
            assert caught.status == 403
            assert caught.body["code"] == "FORBIDDEN"
        else:
            raise AssertionError("RelayApiError was not raised")
