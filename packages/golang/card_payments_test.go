package launa

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
)

type cardControlTransport func(*http.Request) (*http.Response, error)

func (f cardControlTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestDisconnectStripeBindsConnection(t *testing.T) {
	calls := 0
	c := NewClient("https://control.example", Credentials{}, WithEnvironment("development"), WithHTTPClient(&http.Client{Transport: cardControlTransport(func(r *http.Request) (*http.Response, error) {
		calls++
		var body map[string]string
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}
		if r.Method != "DELETE" || body["connection_id"] != "connection_sandbox" || r.Header.Get("X-Launa-Environment") != "development" {
			t.Fatal("unbound disconnect request")
		}
		return &http.Response{StatusCode: 204, Body: http.NoBody, Header: make(http.Header)}, nil
	})}))
	if err := c.DisconnectStripe(context.Background(), "connection_sandbox"); err != nil {
		t.Fatal(err)
	}
	if calls != 1 {
		t.Fatal("disconnect not sent")
	}
}
