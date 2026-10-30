// Every live data source the app polls, and how often each one is allowed to be polled.

import type { Location } from './classify';
import type { ScheduleLimits } from './schedule';

export type SourceGroup = 'Aggregator' | 'Defense' | 'Conflict regions' | 'World news' | 'Cyber';

export interface Source extends ScheduleLimits {
  id: string;
  name: string;
  group: SourceGroup;
  kind: 'gdelt' | 'rss';
  url: string;
  homepage: string;
  /** Drop items that don't mention military topics. Off for specialist defense outlets, where everything is relevant. */
  militaryOnly: boolean;
  /** Used when an item names no recognisable place (e.g. a Kyiv outlet's local headlines). */
  fallbackLocation?: Location;
  /** Hard floor between any two requests, including pull-to-refresh. */
  hardMinGapMs: number;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;

const UKRAINE: Location = { latitude: 48.38, longitude: 31.17, country: 'Ukraine' };
const NORTH_KOREA: Location = { latitude: 40.34, longitude: 127.51, country: 'North Korea' };

// RSS feeds are polled as soon as their Cache-Control lifetime expires (floored at 30s, capped at 15 min).
// Feeds that send no freshness headers are polled every 2 minutes; most support ETag/Last-Modified,
// so an unchanged feed costs an empty 304.
const rss = (
  group: SourceGroup,
  id: string,
  name: string,
  url: string,
  homepage: string,
  options: { militaryOnly?: boolean; fallbackLocation?: Location } = {},
): Source => ({
  id,
  name,
  group,
  kind: 'rss',
  url,
  homepage,
  militaryOnly: options.militaryOnly ?? group !== 'Defense',
  fallbackLocation: options.fallbackLocation,
  minIntervalMs: 30 * SECOND,
  defaultIntervalMs: 2 * MINUTE,
  maxIntervalMs: 15 * MINUTE,
  hardMinGapMs: 5 * SECOND,
});

export const SOURCES: Source[] = [
  {
    id: 'gdelt',
    name: 'GDELT Project',
    group: 'Aggregator',
    kind: 'gdelt',
    url: 'https://api.gdeltproject.org/api/v2/doc/doc?query=(military%20OR%20conflict%20OR%20missile%20OR%20war%20OR%20troops)%20sourcelang:english&mode=ArtList&format=json&maxrecords=75&timespan=6h&sort=DateDesc',
    homepage: 'https://www.gdeltproject.org/',
    militaryOnly: false,
    // GDELT sends no cache headers and publishes in 15-minute batches; polling every minute picks up
    // a new batch within a minute of release. Its documented rate limit is one request per 5 seconds.
    minIntervalMs: 1 * MINUTE,
    maxIntervalMs: 15 * MINUTE,
    hardMinGapMs: 5 * SECOND,
  },

  // Specialist defense and military outlets.
  rss('Defense', 'defense-news', 'Defense News', 'https://www.defensenews.com/feed/', 'https://www.defensenews.com/'),
  rss('Defense', 'breaking-defense', 'Breaking Defense', 'https://breakingdefense.com/feed/', 'https://breakingdefense.com/'),
  rss('Defense', 'the-war-zone', 'The War Zone', 'https://www.twz.com/feed', 'https://www.twz.com/'),
  rss('Defense', 'defense-one', 'Defense One', 'https://www.defenseone.com/rss/all/', 'https://www.defenseone.com/'),
  rss('Defense', 'military-times', 'Military Times', 'https://www.militarytimes.com/feed/', 'https://www.militarytimes.com/'),
  rss('Defense', 'army-times', 'Army Times', 'https://www.armytimes.com/feed/', 'https://www.armytimes.com/'),
  rss('Defense', 'navy-times', 'Navy Times', 'https://www.navytimes.com/feed/', 'https://www.navytimes.com/'),
  rss('Defense', 'air-force-times', 'Air Force Times', 'https://www.airforcetimes.com/feed/', 'https://www.airforcetimes.com/'),
  rss('Defense', 'air-space-forces', 'Air & Space Forces Magazine', 'https://www.airandspaceforces.com/feed/', 'https://www.airandspaceforces.com/'),
  rss('Defense', 'usni-news', 'USNI News', 'https://news.usni.org/feed', 'https://news.usni.org/'),
  rss('Defense', 'naval-news', 'Naval News', 'https://www.navalnews.com/feed/', 'https://www.navalnews.com/'),
  rss('Defense', 'task-purpose', 'Task & Purpose', 'https://taskandpurpose.com/feed/', 'https://taskandpurpose.com/'),
  rss('Defense', 'military-com', 'Military.com', 'https://www.military.com/feed/daily-news/', 'https://www.military.com/'),
  rss('Defense', 'uk-defence-journal', 'UK Defence Journal', 'https://ukdefencejournal.org.uk/feed/', 'https://ukdefencejournal.org.uk/'),
  rss('Defense', 'defence-blog', 'Defence Blog', 'https://defence-blog.com/feed/', 'https://defence-blog.com/'),
  rss('Defense', 'long-war-journal', 'FDD Long War Journal', 'https://www.longwarjournal.org/feed', 'https://www.longwarjournal.org/'),
  rss('Defense', 'dvids', 'DVIDS', 'https://www.dvidshub.net/rss/news', 'https://www.dvidshub.net/'),
  rss(
    'Defense',
    'us-dow',
    'U.S. Department of War',
    'https://www.war.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945&max=10',
    'https://www.war.gov/News/',
  ),

  // Outlets covering specific conflict regions.
  rss('Conflict regions', 'kyiv-independent', 'Kyiv Independent', 'https://kyivindependent.com/news-archive/rss/', 'https://kyivindependent.com/', { fallbackLocation: UKRAINE }),
  rss('Conflict regions', 'ukrainska-pravda', 'Ukrainska Pravda', 'https://www.pravda.com.ua/eng/rss/', 'https://www.pravda.com.ua/eng/', { fallbackLocation: UKRAINE }),
  rss('Conflict regions', 'meduza', 'Meduza', 'https://meduza.io/rss/en/all', 'https://meduza.io/en'),
  rss('Conflict regions', 'middle-east-eye', 'Middle East Eye', 'https://www.middleeasteye.net/rss', 'https://www.middleeasteye.net/'),
  rss('Conflict regions', 'al-monitor', 'Al-Monitor', 'https://www.al-monitor.com/rss', 'https://www.al-monitor.com/'),
  rss('Conflict regions', 'yonhap', 'Yonhap News', 'https://en.yna.co.kr/RSS/news.xml', 'https://en.yna.co.kr/'),
  rss('Conflict regions', 'nk-news', 'NK News', 'https://www.nknews.org/feed/', 'https://www.nknews.org/', { fallbackLocation: NORTH_KOREA }),
  rss('Conflict regions', 'scmp', 'South China Morning Post', 'https://www.scmp.com/rss/91/feed/', 'https://www.scmp.com/'),
  rss('Conflict regions', 'dawn', 'Dawn', 'https://www.dawn.com/feeds/home', 'https://www.dawn.com/'),
  rss('Conflict regions', 'africanews', 'Africanews', 'https://www.africanews.com/feed/rss', 'https://www.africanews.com/'),

  // General world news, filtered to military topics.
  rss('World news', 'bbc-world', 'BBC World', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'https://www.bbc.com/news/world'),
  rss('World news', 'nyt-world', 'NYT World', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', 'https://www.nytimes.com/section/world'),
  rss('World news', 'al-jazeera', 'Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml', 'https://www.aljazeera.com/'),
  rss('World news', 'guardian-world', 'The Guardian World', 'https://www.theguardian.com/world/rss', 'https://www.theguardian.com/world'),
  rss(
    'World news',
    'un-news-peace',
    'UN News: Peace & Security',
    'https://news.un.org/feed/subscribe/en/news/topic/peace-and-security/feed/rss.xml',
    'https://news.un.org/en/news/topic/peace-and-security',
  ),

  // Cyber operations and state-sponsored hacking.
  // Dedicated cyber and national security outlet, so its items aren't keyword-filtered.
  rss('Cyber', 'the-record', 'The Record', 'https://therecord.media/feed', 'https://therecord.media/', { militaryOnly: false }),
];
