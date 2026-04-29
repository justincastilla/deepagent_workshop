/**
 * Shared GitHub API helper.
 *
 * Used by the metrics and sentiment subagents. Wraps fetch() with auth +
 * the Accept/User-Agent headers GitHub expects.
 */

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing env var ${name}. Set it in .env.`);
  }
  return v;
}

/**
 * Authenticated GET against api.github.com. Returns the raw Response so
 * callers can read both the body and the headers (Link header has total
 * counts via pagination).
 */
export async function githubFetch(path: string): Promise<Response> {
  const token = requireEnv("GITHUB_API_KEY");
  const url = `https://api.github.com${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "deepagent-workshop",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status} on ${path}: ${body}`);
  }
  return res;
}

/**
 * Pull a "total count" from a paginated GitHub endpoint by reading the
 * `rel="last"` page number from the Link header. Many endpoints (like
 * /contributors) don't return a count directly, so the trick is to call
 * with `per_page=1` and parse the last-page number.
 */
export function totalFromLinkHeader(linkHeader: string | null): number | null {
  if (!linkHeader) return null;
  const match = /<[^>]*[?&]page=(\d+)>;\s*rel="last"/.exec(linkHeader);
  return match ? parseInt(match[1], 10) : null;
}
