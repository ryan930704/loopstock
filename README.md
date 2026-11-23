# Loopstock

Loopstock helps campus event teams size a reusable cup pool before buying single-use backups. Enter service demand in waves, your starting stock, the share of cups you expect back, the return lag, and your washing capacity.

## Features

- Load a synthetic campus festival with 550 orders across six waves. At 240 starting cups, the expected plan needs 42 backups. The stress plan needs 149.
- Compare the same schedule under expected conditions and a fixed stress scenario with slower returns and lower washing capacity.
- Inspect returns, wash backlog, reusable serves, and single-use fallback by wave. Apply either scenario's minimum starting stock and rerun the plan.
- Download a CSV with the settings and per-wave results for both scenarios.

## Run locally

Requires Node.js 20 or newer. The app has no runtime dependencies.

```bash
cd app
npm run build
npm run preview
```

Open http://127.0.0.1:4173. Run `npm test` for the model tests. With Google Chrome installed, run `npm ci` followed by `npm run test:e2e` while the preview server is running. The browser test writes the three desktop screenshots to the contest folder.

For Cloudflare Pages, set the project root to `app`, the build command to `npm run build`, and the output directory to `dist`. Alternatively, directly upload the built `app/dist` directory. Serve the site over HTTP or HTTPS so the browser can load its JavaScript modules.

## Technology and model

The app uses HTML, CSS, and JavaScript modules. Node.js copies five static files into `dist`. Playwright runs the browser checks. All planning happens in the browser and requires no external API, sign-in, or server-side storage.

Each wave washes returned cups up to the capacity limit, carries any backlog forward, and serves from clean stock. Each wave's reusable serves generate a later return batch, rounded down to whole cups. The starting-stock search finds the smallest integer stock with no simulated fallback. The stress scenario reduces the return rate by 10 percentage points (minimum 0%), delays returns one extra wave, and caps washing at 75% of the entered capacity, rounded down.

The sample is synthetic. The model assumes a fixed return lag and rounded batch recovery. It estimates fallback for a set of assumptions. To measure impact, log the actual single-use cups issued per 100 drinks and any service interruptions at comparable events.

## AI disclosure

OpenAI Codex, an AI coding agent, wrote the code and copy under human direction. The app's planning engine is deterministic and uses no AI at runtime.

## License

MIT. See [LICENSE](../LICENSE).
