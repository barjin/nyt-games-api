# nyt-games-api

Unofficial API for New York Times Games.

### Supported endpoints

|endpoint|today's game|older games|
|--------|-------------|-----------|
|`/wordle` | ✅          | ✅        |
|`/pips`   | ✅          | ✅        |
|`/connections` | ✅     | ✅        |
|`/mini`   | ✅          | ✅        |
|`/spelling-bee` | ✅    | limited (only 2 weeks) |
|`/letterboxed` | ✅     | ❌        |

To access the historical data for these games, you can use the `date` parameter in the URL, formatted as `YYYY-MM-DD`. For example:

- `/wordle/2022-12-31` for the Wordle game on December 31, 2025
- `/pips/2022-12-31` for the Pips game on December 31, 2025
