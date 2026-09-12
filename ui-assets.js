const safe=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export const GLYPHS=Object.freeze({
  cafe:'☕',street:'⌁',library:'▤',bedroom:'⌂',office:'▦',forest:'♧',beach:'≈',nightlife:'✦',campus:'⌂',studio:'◫',fantasy:'✧','sci-fi':'◉'
});

export function forgeOrbital(state='idle',label='Forge idle'){
  return `<div class="forge-orbital" data-forge-state="${safe(state)}" role="img" aria-label="${safe(label)}">
    <svg viewBox="0 0 180 180" aria-hidden="true">
      <g class="forge-ring ring-a"><ellipse cx="90" cy="90" rx="70" ry="30"/><circle class="node" cx="159" cy="87" r="4"/></g>
      <g class="forge-ring ring-b"><ellipse cx="90" cy="90" rx="64" ry="25" transform="rotate(58 90 90)"/><circle class="node" cx="61" cy="34" r="3"/></g>
      <g class="forge-ring ring-c"><ellipse cx="90" cy="90" rx="60" ry="22" transform="rotate(-55 90 90)"/><circle class="node" cx="120" cy="140" r="3"/></g>
      <g class="particles">${[0,1,2,3,4,5].map(index=>`<circle style="--i:${index}" cx="${38+index*20}" cy="${38+(index%2)*98}" r="2"/>`).join('')}</g>
      <path class="forge-spark" d="M90 60c3 18 12 27 30 30-18 3-27 12-30 30-3-18-12-27-30-30 18-3 27-12 30-30Z"/>
    </svg>
  </div>`;
}

export function sceneGlyph(id){return GLYPHS[id]||'⌖'}

export function editorialNote(text,variant='arrow'){
  return `<p class="editorial-note note-${safe(variant)}" aria-hidden="true">${safe(text)}</p>`;
}
