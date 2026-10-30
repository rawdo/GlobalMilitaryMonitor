// Every live data source the app polls, and how often each one is allowed to be polled.

import type { ScheduleLimits } from './schedule';

export interface Source extends ScheduleLimits {
  id: string;
  name: string;
  kind: 'gdelt' | 'rss';
  url: string;
  homepage: string;
  /** Hard floor between any two requests, including pull-to-refresh (the source's published rate limit). */
  hardMinGapMs: number;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;

// RSS feeds publish their own freshness via Cache-Control, so they are polled as soon as their
// cached copy expires (Defense News, NYT and Al Jazeera: 5 min; BBC: seconds, floored at 30s).
const rss = (id: string, name: string, url: string, homepage: string): Source => ({
  id,
  name,
  kind: 'rss',
  url,
  homepage,
  minIntervalMs: 30 * SECOND,
  maxIntervalMs: 15 * MINUTE,
  hardMinGapMs: 5 * SECOND,
});

export const SOURCES: Source[] = [
  {
    id: 'gdelt',
    name: 'GDELT',
    kind: 'gdelt',
    url: 'https://api.gdeltproject.org/api/v2/doc/doc?query=(military%20OR%20conflict%20OR%20missile%20OR%20war%20OR%20troops)%20sourcelang:english&mode=ArtList&format=json&maxrecords=75&timespan=6h&sort=DateDesc',
    homepage: 'https://www.gdeltproject.org/',
    // GDELT sends no cache headers and publishes in 15-minute batches; polling every minute picks up
    // a new batch within a minute of release. Its documented rate limit is one request per 5 seconds.
    minIntervalMs: 1 * MINUTE,
    maxIntervalMs: 15 * MINUTE,
    hardMinGapMs: 5 * SECOND,
  },
  rss('defense-news', 'Defense News', 'https://www.defensenews.com/feed/', 'https://www.defensenews.com/'),
  rss('bbc-world', 'BBC World', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'https://www.bbc.com/news/world'),
  rss('nyt-world', 'NYT World', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', 'https://www.nytimes.com/section/world'),
  rss('al-jazeera', 'Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml', 'https://www.aljazeera.com/'),
];
