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

let title = `Welcome to /vt/ - Virtual YouTubers /lig/ - Large Indies Global`
console.log(title.toLowerCase().includes("lob"))
console.log(title.includes("lig"))

const regex1 = />>(\d+)/g;
const regexall = />>(\d+)/;
const regexbefore = /(?:>>)|([0-9])+/g;
console.log(string.match(regex1))
console.log(string.match(regexbefore))

const matches = [...string.matchAll(regex1)].map(match => match[1]);
console.log(matches)

const str1 = "`Mixya Edition \u003Cbr\u003E\u003Cbr\u003E\u003Cspan class=\"quote\"\u003E&gt;What is /lig/?\u003C/span\u003E\u003Cbr\u003E/lig/ is a thread for viewers to find, share, and discuss indie vtubers who have on average 500 viewers or more.\u003Cbr\u003E\u003Cbr\u003E\u003Cspan class=\"quote\"\u003E&gt;Why /lig/?\u003C/span\u003E\u003Cbr\u003ELarge indie vtubers have more net fans, but they are outnumbered by 2views by the thousands. This is a thread for the VIP, regardless of what language they stream on.\u003Cbr\u003E\u003Cbr\u003E\u003Cspan class=\"quote\"\u003E&gt;Can I shill my 499view oshi here?\u003C/span\u003E\u003Cbr\u003EConsidering averages fluctuate widely, all the way down to 100 is reasonable. The minimal requirement however is being Twitch partner or the YouTube equivalent in numbers.\u003Cbr\u003E\u003Cbr\u003ENumbers for 8/10:\u003Cbr\u003E1: https://twitch.tv/filian (7,773)\u003Cbr\u003E2: https://twitch.tv/shxtou (3,914)\u003Cbr\u003E3: https://twitch.tv/Silvervale (3,612) *Tie\u003Cbr\u003E3: https://twitch.tv/Shylily (3,598) *Tie\u003Cbr\u003E5: https://twitch.tv/Sinder (2,761)\u003Cbr\u003E6: https://twitch.tv/dokibird (2,655)\u003Cbr\u003E7: https://twitch.tv/Limealicious (2,598)\u003Cbr\u003E8: https://twitch.tv/Ikumi (2,464)\u003Cbr\u003E9: https://twitch.tv/nymphelia (2,387)\u003Cbr\u003E10: https://twitch.tv/Saruei (2,253)\u003Cbr\u003E\u003Cbr\u003ENon-English:\u003Cbr\u003E1: https://twitch.tv/akamikarubi (4,675) *Japanese\u003Cbr\u003E2: https://twitch.tv/Kamito_JP (4,039) *Japanese\u003Cbr\u003E3: https://twitch.tv/KSPKSP (3,750) *Chinese\u003Cbr\u003E\u003Cbr\u003E\u003Cbr\u003E\u003Cspan class=\"quote\"\u003E&gt;Wait isn&#039;t that one a corpo?\u003C/span\u003E\u003Cbr\u003EA corpo that doesn&#039;t own talents IPs and has, at most, a single member with greater than 1000 CCV is still allowed to be discussed here until it has surpassed this threshold.\u003Cbr\u003E\u003Cbr\u003E\u003Cspan class=\"quote\"\u003E&gt;/lig/ Numbers\u003C/span\u003E\u003Cbr\u003Ehttps://lignumbers.neocities.org/\u003Cbr\u003E\u003Cbr\u003E\u003Cspan class=\"quote\"\u003E&gt;Twitch Clips Guide\u003C/span\u003E\u003Cbr\u003Ehttps://pastelink.net/34vd5\u003Cbr\u003E\u003Cbr\u003E\u003Cspan class=\"quote\"\u003E&gt;VOD Archival `"
let str2 = str1.replace(/[^a-z0-9áéíóúñü_-\s\.,]/gim,"");
console.log(str2)