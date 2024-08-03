const m = new Map();
m.set(483693679, 12);
m.set(483699989, 7);
m.set(483692353, 6);
m.set(483692920, 6);
m.set(483694950, 6);
m.set(483702382, 6);

console.log(m.entries().next().value); // [ 'key1', {} ]

let sortedMap = [...m.entries()].sort((a, b) => b[1] - a[1])
console.log(sortedMap[0][0]) // return key
console.log(sortedMap[0][1]) // return val

// return key list to array
function listKey (map, limit){
    let mKey = map.keys();
    return Array.from(mKey).slice(0,limit)
}
console.log(listKey(m,2))

function nextKey (map){
    let mKey = map.keys();
    console.log(mKey) // iterate map key

    let mKeyNext = mKey.next().value
    console.log(mKeyNext); // map key first
    return mKeyNext
}
console.log(nextKey(m)); // 1st key, it only returns the first because all calculation is inside function
console.log(mKey.next().value); // 3rd key if function arent defined


let mKeyReturn = mKey.return
console.log(mKeyReturn); // unknown