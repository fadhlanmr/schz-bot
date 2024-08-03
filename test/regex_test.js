const string = `I just realized the entirety of GDD is named after Halo references."
You mean the 17th right?
"https://x.com/B_OX_MOD1/status/1806247801078358121
Saiba twins -> Reference to the FSS-1000 Anti-Ship Spaceplane , commonly known as the "Sabre". Highly classified planetary defense starfighter used by the UNSC in "surgical" orbital combat. Utilized during Operation: UPPER CUT in which multiple Sabres were used to board the Covenant Corvette "Ardent Prayer" in order to use it as a makeshift slipspace bomb against the "Long Night of Solace".
>>483691282
>next week
>>483691498
that's right, I love hag (teenager)
Alice -> Alice-130, Spartan-II, member of the Red Team and fought alongside the crew of the UNSC Spirit of Fire
Yuzu ->Y'zaht, brother of Voro Nar 'Mantakree and Delo. Member of the Sali 'Nyon's Covenant, a splinter group formed from Jul Mdama's Covenant. Which was also a splinter group of the former Covenant Empire.
>>483691282
> Next week
Who's telling him?

`

const regex1 = />>(\d+)/g;
const regexall = />>(\d+)/;
const regexbefore = /(?:>>)|([0-9])+/g;
console.log(string.match(regex1))
console.log(string.match(regexbefore))

const matches = [...string.matchAll(regex1)].map(match => match[1]);
console.log(matches)
