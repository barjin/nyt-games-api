# nyt-games-api

Unofficial API for New York Times Games.

## Supported endpoints

|endpoint|today's game|older games|
|--------|-------------|-----------|
|`/wordle` | ✅          | ✅        |
|`/pips`   | ✅          | ✅        |
|`/connections` | ✅     | ✅        |
|`/mini`   | ✅          | ✅        |
|`/spelling-bee` | ✅    | limited (only 2 weeks) |
|`/letterboxed` | ✅     | ❌        |

To access the historical data for these games, you can use the `date` parameter in the URL, formatted as `YYYY-MM-DD`. For example:

- `https://jindrich-bar--nyt-games-api.apify.actor/wordle/2025-12-31?token=[YOUR_APIFY_TOKEN]` for the Wordle game on December 31, 2022
- `https://jindrich-bar--nyt-games-api.apify.actor/pips/2025-10-25?token=[YOUR_APIFY_TOKEN]` for the Pips game on October 25, 2022

Alternatively, you can use the Input tab to specify the game and date you want to query. Once run, the Actor will fetch the data from the appropriate endpoint and store it in the Run dataset.

## Running locally

To run the server locally, clone the GitHub repository and run the following command:

```bash
yarn start:server
# npm run start:server works too
```
