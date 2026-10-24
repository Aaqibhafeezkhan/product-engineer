# Recording what you deliberately did not build

In the pull request, after the "For the customer" block:

```
Not shipped:
- <thing>: <why not now>; <what would make it worth doing>
```

Example:

```
Not shipped:
- Dead-letter queue for failed webhooks: three retries cover every failure we have seen in 90 days of logs; worth it when a single failure costs more than a morning of reconciliation.
- Admin UI for retry settings: nobody has asked; the values live in one config file.
```

The point is not the list. The point is that six months from now the person who asks
"why is there no queue" finds the answer next to the code, written when the decision
was cheap to explain.
