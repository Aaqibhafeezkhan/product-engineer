Done! Here's what I found and fixed:

**Affected Guests: 4**
- Guest IDs 3, 6, 9, and 12 had `timezone: null`, causing their reminder hour to calculate as `NaN`

**The Issue:**
When a guest had no timezone specified, the offset lookup returned `undefined`, and `9 - undefined` produced `NaN`, resulting in a broken reminder time.

**The Fix:**
Changed the offset calculation to use the nullish coalescing operator (`??`) to default to offset 0 (UTC) when timezone is missing or unmapped. This ensures guests without a specified timezone get their reminder at 9 AM UTC.

Committed as: `861c06f`
