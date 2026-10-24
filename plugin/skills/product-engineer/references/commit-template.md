# The "For the customer" block

Put it at the end of every commit message and every pull request description.

```
For the customer:
What changed: <what they can now do, or no longer suffer>
Why it matters: <the benefit, in their terms>
Automation effect: <only when a manual step disappeared or the system handles more alone>
```

Rules: no jargon; no invented effects; a pure refactor gets one line under What changed;
a bug fix says what the customer saw before and sees now.

## Before / after

**1. A notification fix**

Before:

    fix(notifications): classify IsSystem events as idempotent and skip the badge increment

After:

    fix(notifications): classify IsSystem events as idempotent and skip the badge increment

    For the customer:
    What changed: Things the system handles on its own no longer light up the phone or the menu badge; only items that need a person do.
    Why it matters: The badge count means "something needs you" again, so people stop ignoring it.
    Automation effect: Automatic housekeeping events are now fully handled without anyone looking at them.

**2. A migration**

Before:

    chore: add composite index on (tenant_id, created_at) to bookings

After:

    chore: add composite index on (tenant_id, created_at) to bookings

    For the customer:
    What changed: The bookings list for large hotels opens in under a second instead of several.
    Why it matters: Reception staff open that list dozens of times a shift.

**3. A refactor with no customer-visible change**

    refactor: split the pricing module into rules and calculator

    For the customer:
    What changed: Nothing visible; this makes the next pricing change safer to ship.
