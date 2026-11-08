"""A dependency-free, typed-friendly RelayMCP API client."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterator, List, Mapping, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


class RelayError(Exception):
    """Base exception for RelayMCP client errors."""


class RelayApiError(RelayError):
    """An HTTP error returned by the RelayMCP API."""

    def __init__(self, status: int, body: Mapping[str, Any]) -> None:
        self.status = status
        self.body = dict(body)
        super().__init__(self.body.get("error", f"Relay request failed ({status})"))


@dataclass(frozen=True)
class OtpArtifact:
    found: bool
    ambiguous: bool
    code: Optional[str]
    confidence: str


@dataclass(frozen=True)
class AuthArtifacts:
    otp: OtpArtifact
    links: List[str]


class RelayClient:
    """Client for account-scoped RelayMCP inbox operations.

    The implementation uses only Python's standard library. It works in
    server processes, test suites, automation jobs, and virtual environments
    without adding a runtime dependency.
    """

    def __init__(self, api_key: str, base_url: str = "https://www.relaymcp.net/api/v1", timeout: float = 20.0) -> None:
        if not api_key or not api_key.strip():
            raise ValueError("api_key is required")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    @staticmethod
    def _part(value: str) -> str:
        return quote(str(value), safe="")

    def _call(self, path: str, method: str = "GET", body: Optional[Mapping[str, Any]] = None) -> Any:
        payload = json.dumps(body).encode("utf-8") if body is not None else None
        request = Request(
            self.base_url + path,
            data=payload,
            method=method,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Accept": "application/json",
                "User-Agent": "relaymcp-client/0.1.0",
                **({"Content-Type": "application/json"} if payload is not None else {}),
            },
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                raw = response.read()
                return json.loads(raw.decode("utf-8")) if raw else {}
        except HTTPError as error:
            try:
                raw = error.read()
                body_data = json.loads(raw.decode("utf-8")) if raw else {}
            except (ValueError, UnicodeDecodeError):
                body_data = {}
            raise RelayApiError(error.code, body_data) from error
        except URLError as error:
            raise RelayError(f"Relay request could not be completed: {error.reason}") from error

    def list_domains(self) -> Any:
        return self._call("/domains")

    def list_inboxes(self, cursor: Optional[str] = None) -> Any:
        query = urlencode({"cursor": cursor}) if cursor else ""
        return self._call("/inboxes" + (f"?{query}" if query else ""))

    def create_inbox(self, name: Optional[str] = None, domain: Optional[str] = None) -> Any:
        return self._call("/inboxes", "POST", {k: v for k, v in {"name": name, "domain": domain}.items() if v is not None})

    def get_inbox(self, inbox_id: str) -> Any:
        return self._call(f"/inboxes/{self._part(inbox_id)}")

    def list_messages(self, inbox_id: str, limit: Optional[int] = None, cursor: Optional[str] = None) -> Any:
        params: Dict[str, Any] = {}
        if limit is not None:
            params["limit"] = limit
        if cursor:
            params["cursor"] = cursor
        query = urlencode(params)
        return self._call(f"/inboxes/{self._part(inbox_id)}/messages" + (f"?{query}" if query else ""))

    def read_message(self, inbox_id: str, message_id: str) -> Any:
        return self._call(f"/inboxes/{self._part(inbox_id)}/messages/{self._part(message_id)}")

    def delete_message(self, inbox_id: str, message_id: str) -> Any:
        return self._call(f"/inboxes/{self._part(inbox_id)}/messages/{self._part(message_id)}", "DELETE")

    def extract_otp(self, inbox_id: str, message_id: str) -> Any:
        return self._call(f"/inboxes/{self._part(inbox_id)}/messages/{self._part(message_id)}/otp")

    def extract_auth(self, inbox_id: str, message_id: str) -> Any:
        return self._call(f"/inboxes/{self._part(inbox_id)}/messages/{self._part(message_id)}/auth")

    def list_webhooks(self) -> Any:
        return self._call("/webhooks")

    def create_webhook(self, url: str, events: Optional[List[str]] = None) -> Any:
        return self._call("/webhooks", "POST", {"url": url, "events": events or []})

    def list_webhook_deliveries(self, webhook_id: str) -> Any:
        return self._call(f"/webhooks/{self._part(webhook_id)}")

    def delete_webhook(self, webhook_id: str) -> Any:
        return self._call(f"/webhooks/{self._part(webhook_id)}", "DELETE")

    def stream_events(self, on_event: Callable[[Dict[str, Any]], None], after: int = 0) -> None:
        """Consume the SSE event stream until the server closes the connection."""
        request = Request(
            f"{self.base_url}/events?after={after}",
            headers={"Authorization": f"Bearer {self.api_key}", "Accept": "text/event-stream", "User-Agent": "relaymcp-client/0.1.0"},
        )
        try:
            with urlopen(request, timeout=None) as response:
                event: Dict[str, Any] = {}
                for raw_line in response:
                    line = raw_line.decode("utf-8").rstrip("\r\n")
                    if not line:
                        if event.get("data") is not None:
                            event["data"] = json.loads(event["data"])
                            on_event(event)
                        event = {}
                    elif line.startswith("id: "):
                        event["id"] = int(line[4:])
                    elif line.startswith("event: "):
                        event["type"] = line[7:]
                    elif line.startswith("data: "):
                        event["data"] = line[6:]
        except HTTPError as error:
            raise RelayApiError(error.code, {}) from error
