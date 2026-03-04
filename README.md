# rss-feeds

Automatically generate RSS 2.0 feeds from any public webpage using a GitHub-hosted LLM — **no CSS selectors or extraction configuration required**.

GitHub Actions fetches the configured pages every 6 hours, sends the cleaned HTML to [GitHub Models](https://docs.github.com/en/github-models) (`gpt-4o-mini`), and publishes the resulting RSS feeds via GitHub Pages.

---

## How It Works

1. **Fetch** — each configured URL is fetched with retry logic
2. **Clean** — scripts, ads, navbars, and footers are removed; content is truncated to fit LLM token limits
3. **Extract** — the LLM analyzes the HTML and returns a structured JSON array of feed items (`title`, `link`, `description`, `pubDate`)
4. **Validate** — items are validated with a strict Zod schema; invalid entries are skipped
5. **Publish** — valid items are written to `_site/<feed-id>/rss.xml` and deployed to GitHub Pages via GitHub Actions

GitHub Actions uploads the `_site/` folder as a Pages artifact and deploys it directly — no files are committed back to the repo.

---

## Setup

### 1. Fork / clone this repository

```bash
git clone https://github.com/<your-username>/rss-feeds.git
cd rss-feeds
pnpm install
```

### 2. Required Secrets

**No extra secrets are needed.** The workflow uses the built-in `GITHUB_TOKEN` to authenticate with the GitHub Models inference API. This token is automatically provided by GitHub Actions — you don't need to create or configure anything.

> **Note:** If you run the generator locally, set `GITHUB_TOKEN` to a personal access token with `models:read` scope:
> ```bash
> export GITHUB_TOKEN=ghp_...
> pnpm run generate
> ```

### 3. Enable GitHub Pages

1. Go to your repository → **Settings** → **Pages**
2. Under **Build and deployment**, select **Source: GitHub Actions**
3. No folder selection needed — the workflow uploads `_site/` as the Pages artifact automatically

Your feeds will be live at:
```
https://<your-username>.github.io/rss-feeds/<feed-id>/rss.xml
```

For example:
```
https://<your-username>.github.io/rss-feeds/keycloak-release-notes/rss.xml
```

### 4. Trigger the First Run

After enabling Pages, trigger an initial feed generation:

- Go to **Actions** → **Generate RSS Feeds** → **Run workflow**

Subsequent runs happen automatically every 6 hours.

---

## Adding Feeds

Edit `feeds.yaml` — add an entry with just three fields:

```yaml
feeds:
  - id: keycloak-release-notes
    name: Keycloak Release Notes
    url: https://www.keycloak.org/docs/latest/release_notes/index.html

  - id: my-new-feed
    name: My New Feed
    url: https://example.com/news
```

| Field  | Description                                              |
|--------|----------------------------------------------------------|
| `id`   | URL-safe identifier, used as the output directory name   |
| `name` | Human-readable feed title                                |
| `url`  | Full URL of the public webpage to extract content from   |

**No selectors, no hints, no configuration beyond these three fields.**

---

## LLM Extraction Approach

The system sends cleaned HTML to `gpt-4o-mini` via the [GitHub Models inference endpoint](https://models.inference.ai.azure.com) with a deterministic, zero-temperature prompt:

- The model is instructed to find **repeating content blocks** (articles, releases, announcements, etc.)
- It extracts `title`, `link`, `description`, and optional `pubDate` for each item
- Temperature is set to `0` for consistent, reproducible results
- Output is validated against a strict Zod schema; invalid items are dropped

### Token Safety

HTML is preprocessed with [cheerio](https://cheerio.js.org/) to strip scripts, styles, navigation, and footers. The result is truncated to 12,000 characters before being sent to the model.

### Retry Logic

Both HTTP page fetches and LLM calls retry up to 3 times with exponential back-off.

---

## Cost Considerations

| Model        | Input (per 1M tokens) | Output (per 1M tokens) |
|-------------|----------------------|----------------------|
| gpt-4o-mini | ~$0.15               | ~$0.60               |

A typical webpage (after cleaning) uses roughly **3,000–6,000 input tokens** and the LLM response uses ~500–1,000 output tokens.

**Estimated cost per feed per run:** < $0.002

**With 5 feeds running every 6 hours (4×/day):**
< $0.04/day — effectively free for personal use.

GitHub Models also provides a [free tier](https://docs.github.com/en/github-models/prototyping-with-ai-models#rate-limits) for prototyping that may cover this use case entirely.

---

## Project Structure

```
rss-feeds/
├── .github/
│   └── workflows/
│       └── generate-rss.yml   # Scheduled workflow (every 6h + manual)
├── src/
│   ├── index.ts               # Main orchestration
│   ├── config.ts              # feeds.yaml loader + Zod validation
│   ├── fetchPage.ts           # HTTP fetch with retry
│   ├── cleanHtml.ts           # Cheerio HTML preprocessing
│   ├── callLLM.ts             # GitHub Models API client
│   ├── validateItems.ts       # Zod schema for feed items
│   └── generateRSS.ts         # RSS 2.0 file writer
├── _site/                     # Generated feeds (not committed; deployed via Actions artifact)
│   └── <feed-id>/
│       └── rss.xml
├── feeds.yaml                 # Feed configuration
├── package.json
├── tsconfig.json
└── README.md
```

---

## Local Development

```bash
# Install dependencies
pnpm install

# Set your GitHub token (needs models:read scope)
export GITHUB_TOKEN=ghp_...

# Generate feeds
pnpm run generate

# Build TypeScript
pnpm run build
```
