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
    assert.ok(!html.includes('appendProvenance(newCard, shareApp)'));
    const css=readFileSync(new URL('../public/nello-theme.css',import.meta.url),'utf8');
    assert.ok(css.includes('grid-template-columns:80px 145px'));
    assert.ok(css.includes('border:0 !important; border-radius:0 !important'));
    assert.ok(css.includes('margin:0; padding:0;'));
    assert.ok(css.includes('grid-template-columns:75px 70px 145px'));
    assert.ok(css.includes('.variant-list { padding-left:0; }'));
    assert.ok(css.includes('grid-column:2; grid-row:1; width:100%'));
    assert.ok(css.includes('.variant-list > .card:nth-child(even) { background:#fff2e6 !important; }'));
    assert.ok(css.includes('.variant-list .download-row img { visibility:hidden; }'));
    assert.match(categoryDescription('Browser Internet'),/Browser per navigare/);
    assert.match(categoryDescription('Android su Windows'),/non installare/);
});
