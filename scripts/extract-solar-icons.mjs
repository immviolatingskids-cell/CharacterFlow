import fs from 'node:fs';

const source=JSON.parse(fs.readFileSync('.icon-source/package/icons.json','utf8'));
const names='home-angle-linear users-group-rounded-linear palette-linear settings-linear camera-linear hanger-2-linear lock-keyhole-linear code-scan-linear play-circle-linear close-circle-linear add-circle-linear check-circle-linear alt-arrow-right-linear map-point-linear book-minimalistic-linear city-linear cup-hot-linear sun-linear moon-linear user-rounded-linear upload-linear download-linear folder-linear layers-linear pen-linear trash-bin-minimalistic-linear menu-dots-linear heart-linear star-linear refresh-linear restart-linear filter-linear sort-linear tuning-2-linear eye-linear eye-closed-linear camera-add-linear gallery-linear music-note-linear microphone-3-linear document-text-linear clipboard-text-linear info-circle-linear danger-circle-linear question-circle-linear arrow-left-linear arrow-right-linear alt-arrow-down-linear alt-arrow-up-linear case-minimalistic-linear backpack-linear glasses-linear headphones-round-linear bag-3-linear armchair-2-linear buildings-2-linear shop-linear library-linear global-linear rocket-2-linear monitor-linear laptop-linear calendar-linear clock-circle-linear logout-2-linear user-id-linear user-hand-up-linear user-speak-linear magic-stick-linear flag-linear bookmark-linear chat-round-linear menu-dots-circle-linear volume-cross-linear bolt-linear widget-2-linear archive-linear link-linear share-linear pin-linear minimalistic-magnifer-line-duotone'.split(' ');

for(const name of names){
  if(!source.icons[name])throw new Error(`Missing Solar icon: ${name}`);
  const svg=`<!-- Solar Icons by 480 Design, CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><symbol id="icon" viewBox="0 0 24 24">${source.icons[name].body}</symbol></svg>\n`;
  for(const directory of ['assets/icons','dist/assets/icons'])fs.writeFileSync(`${directory}/${name}.svg`,svg);
}
console.log(`Generated ${names.length} curated Solar SVGs.`);
