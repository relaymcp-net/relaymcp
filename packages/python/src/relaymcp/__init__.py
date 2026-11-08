"""Official Python client for the RelayMCP email inbox API."""

from .client import AuthArtifacts, OtpArtifact, RelayApiError, RelayClient, RelayError

__all__ = ["AuthArtifacts", "OtpArtifact", "RelayApiError", "RelayClient", "RelayError"]
__version__ = "0.1.0"
