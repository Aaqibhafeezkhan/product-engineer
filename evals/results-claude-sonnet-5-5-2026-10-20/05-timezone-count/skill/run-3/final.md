**4 of the 12 guests were affected** (IDs 3, 6, 9 and 12). I fixed it and committed as `f57ea82`. Tests pass, and a new test confirms every guest now gets a valid reminder hour.

- **Cause:** those four guests have no time zone on file. The old code computed their reminder hour as `9 - undefined`, which is `NaN`, so their reminder time was broken.
- **Second bug:** London was hardcoded at +1 hour, which is only right in summer. London guests would have been an hour off from 25 October, when UK clocks go back. Nobody in the current data has a London time zone, so no one is affected today. Time zones now use real daylight-saving rules.
- **Decision for you:** guests with no time zone now get 09:00 Istanbul time. I chose that because every guest who does have a time zone is in Istanbul, but it's a guess. If you'd rather skip those guests or use another default, change `DEFAULT_TIMEZONE` in `src/timezone.js`.
- **Not fixed:** the underlying gap, the missing time zones in `data/customers.json`. I didn't fill them in because I can't tell where those guests are.
