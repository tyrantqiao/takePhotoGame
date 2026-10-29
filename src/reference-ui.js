import { REFERENCES } from './references.js';
export function setupReferences({onPractice}) {
  const grid=document.getElementById('referenceGrid');
  for(const reference of REFERENCES){
    const card=document.createElement('article');card.className='reference-card';
    if(reference.image){const img=document.createElement('img');img.src=reference.image;img.alt=reference.title;img.loading='lazy';card.append(img);}
    else {const motif=document.createElement('div');motif.className='reference-motif';motif.textContent='◉';const label=document.createElement('span');label.textContent='出处索引 · 未收录原截图';motif.append(label);card.append(motif);}
    const kind=document.createElement('small');kind.textContent=reference.kind;
    const title=document.createElement('h3');title.textContent=reference.title;
    const description=document.createElement('p');description.textContent=reference.description;
    const credit=document.createElement('p');credit.className='reference-credit';credit.textContent=reference.credit;
    const practice=document.createElement('button');practice.textContent='练习这个镜头 ↗';practice.onclick=()=>onPractice(reference.task);
    card.append(kind,title,description,credit,practice);
    if(reference.source){const link=document.createElement('a');link.href=reference.source;link.target='_blank';link.rel='noopener noreferrer';link.textContent='查看出处 ↗';card.append(link);}
    grid.append(card);
  }
}
