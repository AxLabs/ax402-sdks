from ..http import HttpTransport


class CardPaymentsResource:
    """Seller Stripe connection (link/unlink require a recently issued JWT)."""

    def __init__(self, http: HttpTransport) -> None:
        self._http = http

    def connection(self) -> dict:
        return self._http.request("GET", "/payment-accounts/stripe")

    def connect(self) -> dict:
        return self._http.request("POST", "/payment-accounts/stripe/connect")

    def complete(self, code: str, state: str) -> dict:
        return self._http.request("POST", "/payment-accounts/stripe/complete", json_body={"code": code, "state": state})

    def disconnect(self, connection_id: str) -> None:
        self._http.request("DELETE", "/payment-accounts/stripe", json_body={"connection_id": connection_id})

    def list(self) -> list[dict]:
        return self._http.request("GET", "/card-payments")
