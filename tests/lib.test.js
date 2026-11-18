import test from 'node:test';
import assert from 'node:assert/strict';
import {escapeHTML,gradeOptions,progressPercent,deckDisplayName,getDeckStatsByName,lastSevenDays,classifyDeck} from '../lib.js';

test('HTML user supplied deck name is escaped',()=>assert.equal(escapeHTML('<img src="x" onerror="x">'),'&lt;img src=&quot;x&quot; onerror=&quot;x&quot;&gt;'));
test('Anki three-button new card grade mapping is Again Good Easy',()=>assert.deepEqual(gradeOptions([1,2,3]).map(x=>[x.ease,x.name]),[[1,'Again'],[2,'Good'],[3,'Easy']]));
test('Anki four-button grade mapping has Hard and Good in the correct slots',()=>assert.deepEqual(gradeOptions([1,2,3,4]).map(x=>[x.ease,x.name]),[[1,'Again'],[2,'Hard'],[3,'Good'],[4,'Easy']]));
test('progress is clamped to 0..100',()=>{assert.equal(progressPercent(3,10),30);assert.equal(progressPercent(12,10),100);assert.equal(progressPercent(-3,10),0);});
test('nested deck names display leaf',()=>assert.equal(deckDisplayName('Lang::Japanese::N2'),'N2'));
test('deck stats aggregate counts',()=>assert.equal(getDeckStatsByName({1:{name:'Default',new_count:3,learn_count:4,review_count:5}}).get('Default').due,12));
test('seven days are stable and include today',()=>{let dates=lastSevenDays(new Date(2026,10,18));assert.equal(dates.length,7);assert.equal(dates[6].key,'2026-11-18');assert.equal(dates[0].key,'2026-11-12');});
test('deck type detector treats technical decks as code',()=>assert.equal(classifyDeck('Backend',0).symbol,'{ }'));
