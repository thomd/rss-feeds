# rss-feeds

Generates RSS feeds from public webpages using a GitHub-hosted LLM. Runs daily via GitHub Actions and publishes feeds via GitHub Pages.

## Setup

**1. Fork this repository.**

**2. Enable GitHub Pages:** go to Settings > Pages, set Source to "GitHub Actions".

**3. Trigger the first run:** go to Actions > Generate RSS Feeds > Run workflow.

Feeds are published at `https://<your-username>.github.io/rss-feeds/<feed-id>/rss.xml`.

No secrets are required — the workflow uses the built-in `GITHUB_TOKEN` for GitHub Models access.

To run locally:

```bash
export GITHUB_TOKEN=ghp_...   # personal access token with models:read scope
pnpm install
pnpm run generate
```

## Adding Feeds

Edit `feeds.yaml`. The minimum configuration is three fields:

```yaml
feeds:
  - id: my-feed
    name: My Feed
    url: https://example.com/news
```

The LLM automatically detects the page structure and extracts items. Optional fields:

| Field | Description |
|---|---|
| `id` | URL-safe identifier, used as the output path |
| `name` | Feed title |
| `url` | URL of the webpage to extract from |
| `prompt` | Extra instructions for the LLM (e.g. "each item is one release") |
| `maxItems` | Maximum number of items in the feed (default: 10) |
| `selectors.items` | CSS selector for the repeating item container |
| `selectors.title` | CSS selector for the title (relative to item) |
| `selectors.link` | CSS selector for the link (relative to item) |
| `selectors.description` | CSS selector string, or `{ selector, prompt }` to transform via LLM using the given prompt |
| `selectors.pubDate` | CSS selector for the date (relative to item, optional) |

Use `selectors` instead of `prompt` when the page structure is stable and you want deterministic extraction without an LLM call. If `selectors` is defined, the LLM is used only to summarize descriptions.

