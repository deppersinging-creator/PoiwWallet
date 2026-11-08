/* Poi-chan: PoiWallet's mascot, a clasp coin purse (gamaguchi) that keeps your cards safe.
   mascotSvg(mood) → inline SVG string. Moods: "hi" (default), "happy", "worried", "sleepy". */
window.mascotSvg = function (mood) {
  mood = mood || "hi";
  const ink = "#4a2c2a";
  const eyes = {
    hi: `<ellipse cx="47" cy="70" rx="4.6" ry="5.8" fill="${ink}"/><ellipse cx="73" cy="70" rx="4.6" ry="5.8" fill="${ink}"/>
         <circle cx="48.6" cy="67.8" r="1.7" fill="#fff"/><circle cx="74.6" cy="67.8" r="1.7" fill="#fff"/>`,
    happy: `<path d="M41 71 Q47 63 53 71" fill="none" stroke="${ink}" stroke-width="3.4" stroke-linecap="round"/>
            <path d="M67 71 Q73 63 79 71" fill="none" stroke="${ink}" stroke-width="3.4" stroke-linecap="round"/>`,
    worried: `<ellipse cx="47" cy="71" rx="4.2" ry="5.2" fill="${ink}"/><ellipse cx="73" cy="71" rx="4.2" ry="5.2" fill="${ink}"/>
              <circle cx="48.4" cy="69" r="1.5" fill="#fff"/><circle cx="74.4" cy="69" r="1.5" fill="#fff"/>
              <path d="M40 61 L52 58" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>
              <path d="M80 61 L68 58" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`,
    sleepy: `<path d="M41 71 Q47 76 53 71" fill="none" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>
             <path d="M67 71 Q73 76 79 71" fill="none" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>`,
  }[mood];
  const mouth = {
    hi: `<path d="M54 81 Q60 87 66 81" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`,
    happy: `<path d="M52 79 Q60 92 68 79 Z" fill="${ink}"/><path d="M55.5 85 Q60 89 64.5 85" fill="#ff8a9a"/>`,
    worried: `<ellipse cx="60" cy="84" rx="3.6" ry="4.2" fill="${ink}"/>`,
    sleepy: `<path d="M56 83 Q60 85 64 83" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`,
  }[mood];
  const extra = {
    hi: "",
    happy: `<g fill="#ffc94a"><path d="M100 30 l2.4 5 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z"/><circle cx="16" cy="44" r="3"/></g>`,
    worried: `<path d="M92 52 q5 8 0 11 q-5 -3 0 -11z" fill="#7cc4f2"/>`,
    sleepy: `<text x="88" y="40" font-family="system-ui,sans-serif" font-weight="700" font-size="15" fill="#8e7cc3">z</text><text x="98" y="28" font-family="system-ui,sans-serif" font-weight="700" font-size="11" fill="#8e7cc3">z</text>`,
  }[mood];
  return `<svg class="poi" viewBox="0 0 120 120" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="112" rx="34" ry="4.5" fill="#000" opacity=".08"/>
    <path d="M23 52 Q23 42 33 42 H87 Q97 42 97 52 L101 94 Q102 108 88 108 H32 Q18 108 19 94 Z" fill="#f58f7c" stroke="#d2604f" stroke-width="3" stroke-linejoin="round"/>
    <path d="M30 60 H90" stroke="#ffffff" stroke-opacity=".35" stroke-width="2" stroke-dasharray="3 5" stroke-linecap="round"/>
    <path d="M27 45 Q60 22 93 45" fill="none" stroke="#e2a72e" stroke-width="5.5" stroke-linecap="round"/>
    <circle cx="54.5" cy="27.5" r="6.2" fill="#f2c14e" stroke="#c98a12" stroke-width="2"/>
    <circle cx="65.5" cy="27.5" r="6.2" fill="#f2c14e" stroke="#c98a12" stroke-width="2"/>
    <circle cx="52.8" cy="25.6" r="1.8" fill="#fff" opacity=".8"/><circle cx="63.8" cy="25.6" r="1.8" fill="#fff" opacity=".8"/>
    <ellipse cx="36" cy="82" rx="7" ry="4.3" fill="#ff6f91" opacity=".42"/>
    <ellipse cx="84" cy="82" rx="7" ry="4.3" fill="#ff6f91" opacity=".42"/>
    ${eyes}${mouth}${extra}
  </svg>`;
};
