import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {categoryDescription} from '../public/category-descriptions.js';

test('category panels have one shared description and compact per-variant download/copy rows',()=>{
    const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
    assert.ok(html.includes('frame.append(heading, description, list)'));
    assert.ok(html.includes('for (const app of selected ? [selected] : group.variants)'));
    assert.ok(!html.includes('<small>${escapeHtml(apkDescription(name, desc))}</small>'));
    assert.ok(html.includes('app-action copy-app-code'));
    assert.ok(html.includes('attachAppActions(newCard, shareApp, location.origin)'));
    assert.match(categoryDescription('Browser Internet'),/Browser per navigare/);
    assert.match(categoryDescription('Android su Windows'),/non installare/);
});
