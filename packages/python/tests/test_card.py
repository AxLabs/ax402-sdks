import httpx
import pytest
from launa_sdk import CardCheckout


def test_token_preserved_and_redirect_not_followed():
    calls = []
    def handle(request):
        calls.append(request)
        if request.headers['Launa-Payment'] == 'resume':
            return httpx.Response(302, headers={'Location': 'https://other.example'})
        return httpx.Response(202, json={'status': 'pending', 'checkout_url': 'https://checkout.stripe.com/test'})
    with httpx.Client(transport=httpx.MockTransport(handle), follow_redirects=True) as http:
        c = CardCheckout('https://gateway.example/data', client=http)
        c.start(); c.status()
        assert c.resume().status_code == 302
        assert [r.headers['Launa-Payment'] for r in calls] == ['checkout', 'status', 'resume']
        assert all(r.headers['Launa-Payment-Token'] == c.token for r in calls)


def test_invalid_checkout_url():
    with httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(202, json={'status': 'pending', 'checkout_url': 'https://attacker.example'}))) as http:
        c = CardCheckout('https://gateway.example/data', client=http)
        with pytest.raises(ValueError): c.start()


def test_unsafe_url_and_mixed_payment():
    with pytest.raises(ValueError): CardCheckout('http://gateway.example')
    with pytest.raises(ValueError): CardCheckout('https://gateway.example', headers={'X-PAYMENT': 'x'})
