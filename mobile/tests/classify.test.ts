import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assessSeverity,
  categorize,
  guessLocation,
  hashId,
  isMilitaryRelated,
  parseGdeltDate,
  stripHtml,
} from '../src/lib/classify.ts';

test('categorize follows desktop keyword priority', () => {
  assert.equal(categorize('North Korea fires ballistic missile'), 'MissileLaunch');
  assert.equal(categorize('Navy destroyer transits strait'), 'NavalActivity');
  assert.equal(categorize('Drone strike reported near border'), 'AirActivity');
  assert.equal(categorize('Army deploys additional troops'), 'MilitaryMovement');
  assert.equal(categorize('Talks on uranium enrichment stall'), 'NuclearActivity');
  assert.equal(categorize('New sanctions announced'), 'Sanctions');
  assert.equal(categorize('Peace summit opens in Geneva'), 'Diplomacy');
  assert.equal(categorize('Heavy fighting continues'), 'Conflict');
  assert.equal(categorize('Leader attacks rival parties'), 'Conflict');
  assert.equal(categorize('Terror cell arrested'), 'Terrorism');
  assert.equal(categorize('Weather update'), 'Other');
});

test('assessSeverity', () => {
  assert.equal(assessSeverity('ICBM test detected'), 'Critical');
  assert.equal(assessSeverity('Threat of nuclear strike raised'), 'Critical');
  assert.equal(assessSeverity('New nuclear power plant opens'), 'Low');
  assert.equal(assessSeverity('Invasion fears grow'), 'High');
  assert.equal(assessSeverity('Military exercise begins'), 'Medium');
  assert.equal(assessSeverity('Ministers meet'), 'Low');
});

test('isMilitaryRelated matches whole words only', () => {
  assert.ok(isMilitaryRelated('War in the region escalates'));
  assert.ok(isMilitaryRelated('Airstrikes hit depot'));
  assert.ok(isMilitaryRelated('New sanctions imposed'));
  assert.ok(!isMilitaryRelated('Software award announced'));
  assert.ok(!isMilitaryRelated('Storm warning issued'));
});

test('guessLocation prefers specific names and returns null when unknown', () => {
  assert.equal(guessLocation('Strikes in Gaza as Israel expands operation')?.country, 'Palestine');
  assert.equal(guessLocation('North Korea and South Korea talks')?.country, 'North Korea');
  assert.equal(guessLocation('Houthi drones target shipping')?.country, 'Yemen');
  assert.equal(guessLocation('Iranian officials respond')?.country, 'Iran');
  assert.equal(guessLocation('Russian drone attack on Ukrainian train station')?.country, 'Ukraine');
  assert.equal(guessLocation('Shelling reported in Kherson')?.country, 'Ukraine');
  assert.equal(guessLocation('Bamako, Mali residents flee')?.country, 'Mali');
  assert.equal(guessLocation('Malibu fires spread'), null);
  assert.equal(guessLocation('Something happened somewhere'), null);
});

test('helpers', () => {
  assert.equal(stripHtml('<p>Tom &amp; Jerry&#39;s</p>'), "Tom & Jerry's");
  assert.equal(stripHtml('Europe&#8217;s output'), 'Europe\u2019s output');
  assert.equal(parseGdeltDate('20261030T081500Z'), '2026-10-30T08:15:00.000Z');
  assert.equal(hashId('abc'), hashId('abc'));
  assert.notEqual(hashId('abc'), hashId('abd'));
});
