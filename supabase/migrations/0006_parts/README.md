# 0006 split into paste-sized parts

The Supabase SQL editor silently truncates a large paste. `0006_economy_rebuild.sql`
is ~10 KB, and a truncated paste cuts mid-function, leaving an unterminated `$$`
block — which reports as:

```
ERROR: 42601: unterminated dollar-quoted string
```

Nothing is applied when that happens, because Postgres parses the whole batch
before running any of it.

These are the identical statements, split at function boundaries so each part is
small enough to paste whole. Run them **in order**, as separate queries.

| Part | Contains |
|---|---|
| `part1_ledger_and_tree_helpers.sql` | `coin_award_ledger` table + RLS, `compute_tree_stage`, `add_tree_xp` |
| `part2_award_coins_once.sql` | `award_coins_once`, `has_been_awarded` |
| `part3_harden_existing_rpcs.sql` | Caller checks and row locking on `award_coins` / `spend_coins` |

Every statement is idempotent, so re-running any part is safe. The parts are a
convenience copy — `0006_economy_rebuild.sql` remains the migration of record,
and the two must be kept in step if either changes.
