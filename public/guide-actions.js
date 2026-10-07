import {copyAppText} from './app-sharing.js';

// Keep commands, paragraph boundaries and actual link destinations in plain text.
export function guideText(node) {
  const kind=node.nodeType;
  if(kind===3 || node.type==='text') return node.nodeValue ?? node.data;
  const tag=(node.tagName||node.name||'').toLowerCase();
  const children=Array.from(node.childNodes||node.children||[]);
  const inner=children.map(guideText).join('');
  if(tag==='br') return '\n';
  if(tag==='a') {
    const href=node.getAttribute?.('href')||node.attribs?.href||'';
    return /^https?:\/\//i.test(href) && !inner.includes(href) ? `${inner} (${href})` : inner;
  }
  if(tag==='li') return '• '+inner.trim()+'\n';
  if(['p','div','ol','ul','h4','h3','h2','h1','article'].includes(tag)) return inner.trim()+'\n\n';
  return inner;
}

export function installGuideActions(root=document) {
  const targets=[...root.querySelectorAll('#catalog-guides .adv-guide, article[data-guide]')];
  for(const target of targets) {
    const body=target.querySelector('.guide-body')||target;
    if(body.querySelector('.guide-share-actions')) continue;
    const title=target.querySelector('summary')?.textContent.trim()||document.title.replace(/ · Il Covo di Nello$/,'');
    const key=target.dataset.guide||target.id.replace(/^guide-/,'');
    const url=new URL('/guide/'+key,location.origin).href;
    const content=guideText(body).replace(/\n{3,}/g,'\n\n').trim();
    const payload=[target.matches('article')?'':title,content,'Guida: '+url].filter(Boolean).join('\n\n');
    const bar=document.createElement('div');
    bar.className='guide-share-actions';
    bar.style.cssText='display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:12px 0;white-space:normal';
    const copy=document.createElement('button');
    copy.type='button';copy.className='app-action';copy.textContent='📋 Copia testo';
    const share=document.createElement('button');
    share.type='button';share.className='app-action';share.textContent='↗ Condividi';
    const status=document.createElement('span');status.setAttribute('role','status');status.style.fontSize='14px';
    const alternatives=document.createElement('div');alternatives.hidden=true;
    alternatives.style.whiteSpace='normal';
    for(const [label,href] of [
      ['WhatsApp','https://wa.me/?text='+encodeURIComponent(payload)],
      ['Telegram','https://t.me/share/url?url='+encodeURIComponent(url)+'&text='+encodeURIComponent([title,content].join('\n\n'))]
    ]) {
      const link=document.createElement('a');link.className='app-action';link.textContent=label;link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.style.marginRight='10px';alternatives.append(link);
    }
    copy.addEventListener('click',async()=>{
      status.textContent='';
      if(await copyAppText(payload)) status.textContent='Guida completa copiata.';
    });
    if(target.matches('article')) {
      for(const code of body.querySelectorAll('code')) {
        const text=code.textContent;
        code.tabIndex=0;code.setAttribute('role','button');code.setAttribute('aria-label','Copia: '+text);
        code.title='Clicca per copiare';code.style.cursor='pointer';
        const copyCommand=async()=>{if(await copyAppText(text)) status.textContent='Codice o comando copiato.';};
        code.addEventListener('click',copyCommand);
        code.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();void copyCommand();}});
      }
    }
    share.addEventListener('click',async()=>{
      if(navigator.share) {
        try {await navigator.share({title,text:payload});return;}
        catch(error) {if(error.name==='AbortError') return;}
      }
      alternatives.hidden=!alternatives.hidden;
    });
    bar.append(share,copy,status);body.prepend(bar);bar.after(alternatives);
  }
}

if(typeof document!=='undefined') installGuideActions();
