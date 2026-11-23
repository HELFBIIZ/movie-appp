# Wire connection verification

`GET /api/payments/wire/readiness` checks the existing server configuration without creating a PaymentIntent, checkout session, invoice or charge. It uses Wire's documented read-only endpoints:

- `GET /v1/routing/preview?amount=5900`: verify that an active operator is eligible for the representative monthly-plan amount.
- `GET /v1/bank_accounts`: verify that a default, selectable settlement account exists.

Only aggregate booleans, a status and the check timestamp are returned. Bank names, account digits, holder details, operator IDs, credentials and upstream error bodies are omitted. Requests share one pending check and cache results for 60 seconds (15 seconds after an error). The public route is rate-limited.

`available` means routing and settlement configuration were found for the diagnostic amount. `paidTransactionVerified` remains `false`: a real settlement, webhook delivery and paid customer's complete watch flow require an actual authorized customer transaction. Checkout still looks up the selected plan's price on the server; the diagnostic amount does not change billing.

References: [routing preview](https://docs.wire.mn/docs/api/routing/v1/routing/preview/get), [bank accounts](https://docs.wire.mn/docs/api/bankaccounts/v1/bank_accounts/get).
