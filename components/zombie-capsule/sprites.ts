/**
 * Hand-drawn pixel sprites for the zombie capsule. Each row is a string of
 * palette keys; '.' is transparent. Rows are padded to the widest row.
 */
export type Sprite={w:number;h:number;img:HTMLCanvasElement;flash:HTMLCanvasElement};

const OUTLINE='#1e1a16';

export const SOLDIER_PALETTE:Record<string,string>={
 k:OUTLINE,c:'#3a3a3d',C:'#56565a',y:'#e3b51e',Y:'#9a8420',w:'#ffffff',
 h:'#8a3f1c',s:'#f8d6a2',S:'#da965a',e:'#7a3a1a',
 b:'#2b2b2e',g:'#46464a',G:'#66666b',m:'#a2a2a8',n:'#5a4030',p:'#3a3a3d',o:'#e07a0a',
};

/** Soldier facing right, no arms (the arms + pistol are a separate, rotating sprite). */
const SOLDIER_TOP=[
 '.....kkkkkkk.......',
 '...kkcCCCCCckk.....',
 '..kcCCCCCCywCck....',
 '..kcCcCCCCYyCck....',
 '..kccCCCCCCCcck....',
 '..kcckkkkkkkkkkkk..',
 '..kckcCCCCCCCCCCk..',
 '..kkhhkkkkkkkkkkk..',
 '..khhhhhhhhhhhhk...',
 '.kshShhhhhhhhhhk...',
 '.kssSssssssssssk...',
 '..kSssssssskeksk...',
 '..kSsssssssssssk...',
 '...kkSSssssSSkk....',
 '....kkkkkkkkkk.....',
 '...kmmybbbbbbk.....',
 '...kmYmbbbbbbk.....',
 '...knbbbbbbbbk.....',
 '...knbgggggbbk.....',
 '...knbbbbbbbbk.....',
 '...knbggggGbbk.....',
 '...kbbbbbbbbbk.....',
 '...kknnkkkknkk.....',
 '...kgggkgggggk.....',
 '...kGggkkgGggk.....',
];
const SOLDIER_LEGS_A=[
 '..kgggk..kgggk.....',
 '..kggk....kggk.....',
 '..knnk....knnk.....',
 '..knnkk...knnkk....',
 '.kkkkkk...kkkkkk...',
];
const SOLDIER_LEGS_B=[
 '...kggkkgggk.......',
 '...kggkkgggk.......',
 '...knnkknnnk.......',
 '...knnkknnnkk......',
 '..kkkkkkkkkkkk.....',
];
export const SOLDIER_A=[...SOLDIER_TOP,...SOLDIER_LEGS_A];
export const SOLDIER_B=[...SOLDIER_TOP,...SOLDIER_LEGS_B];
/** Pixel in the soldier sprite the arms pivot from. */
export const SOLDIER_SHOULDER={x:8,y:16};

/** Arms holding the pistol, pointing right. Pivot at (2,2), muzzle at (19,2). */
export const SOLDIER_ARMS=[
 'kkkkkkkkkkkk.kkkkkk.',
 'kbbbsssssssskpppppk.',
 'kbbssssssSSSkppppppo',
 'kkkkkkkkSSSkkpkkkkk.',
 '.......kkkk.kpk.....',
 '............kk......',
];
export const ARMS_PIVOT={x:2,y:2};
export const ARMS_MUZZLE={x:20,y:2};

export const ZOMBIE_PALETTE:Record<string,string>={
 k:OUTLINE,z:'#b9bea2',Z:'#8e9479',p:'#f27cba',P:'#c24f8f',h:'#a3581e',H:'#6e3a14',
 y:'#ffe14d',r:'#e01a1a',w:'#f4f0e0',t:'#a3581c',T:'#6e3a12',x:'#cfd0b8',
};

/** Zombie facing left, waist up. Arms are separate so they can bob. */
const zombie=(open:boolean)=>[
 '......kkkkkk......',
 '.....kppPppkkk....',
 '....kpPpppPkhhk...',
 '....kppPpppkhhhk..',
 '....kzzzzzzzzhhk..',
 '...kzkkzzzkkzzhk..',
 '...kkyykzkyykzzk..',
 '...kkyykzkyykzZk..',
 '...kzkkzzzkkzzZk..',
 '...kzzzzzzzzzZZk..',
 open?'...kzkrrrrkzzZk...':'...kzzkkkkzzzZk...',
 open?'....kzkwrwkzZk....':'....kzzzzzzzZk....',
 '.....kkzzzzkkk....',
 '....kkkkZZZkkkk...',
 '...kttttttttttk...',
 '..ktTtttttttTttk..',
 '..kttttxxtttttTk..',
 '..ktttxttttTtttk..',
 '..kTtttttttttttk..',
 '..kttttTtttttTtk..',
 '..ktTttttttttttk..',
 '..kttttttxtttttk..',
 '..ktttttxxxttTtk..',
 '..kTtttttttttttk..',
 '..kttTtttttttttk..',
 '..ktttttttTttttk..',
 '..ktTttttttttTtk..',
 '..kttttttttttttk..',
 '..kTttttTtttttTk..',
 '..kttttttttttttk..',
];
export const ZOMBIE_OPEN=zombie(true);
export const ZOMBIE_SHUT=zombie(false);
export const ZOMBIE_ARM=[
 'kkkkkkkkkk',
 'kzzzzzzzzk',
 'kZzzzzzzzk',
 'kkkkkkkkk.',
];
export const ZOMBIE_ARM_BACK=[
 'kkkkkkkkkk',
 'kZZZZZZZZk',
 'kZZZZZZZZk',
 'kkkkkkkkk.',
];

export const KNIGHT_PALETTE:Record<string,string>={
 k:'#1a1622',a:'#dfe4f4',b:'#aab3d2',c:'#6f7699',v:'#2a2438',e:'#e040ff',
 r:'#d6192c',R:'#8c1020',s:'#7a5a3a',S:'#c2a477',n:'#2a2630',
};

/** Knight facing right: steel plate, red plume, scarf and cape. The sword is a separate sprite. */
export const KNIGHT=[
 '....RRr...............',
 '..RRrrrR.kkkkk........',
 '.RrrRrrRkaaaabk.......',
 'Rrr.Rrrkaaaaaabbk.....',
 'Rr..Rrkaaaaaaabbck....',
 'R...Rrkaabaaaabbck....',
 '....Rrkvvvvvvevvck....',
 '.....Rkaaabbbbbbck....',
 '......kabkbkbkbbck....',
 '......kkabbbbbcckk....',
 '.....kRrrrrrrrrRk.....',
 '...kkkRRrrrrrrRRkkk...',
 '..kaabkRRrrrRRkbaabk..',
 '..kabbbkaaaaabkbbbck..',
 '.Rkbbcckaaaaabkkbcck..',
 '.RRkkckaaabaabkckkRr..',
 '.RrkaakbaaabbbkaakRr..',
 '.RrkaakbbabbbbkaakRr..',
 '.RrkbbkkbbbbbkkbbkRr..',
 '.Rrkbbkssssssskbbk.Rr.',
 'RRrkaakssSSsssk.aak.Rr',
 'RrrkkkknnnnnnnkkkkRRr.',
 'Rr..Rkannnnnnaak.Rrr..',
 'Rr.Rrkaabk.kaabkRRr...',
 'R..Rrkabbk.kabbk.Rr...',
 '..RRrkbbck.kbbck.RRr..',
 '.RRr.kaabk.kaabk..RR..',
 '.R...kabck.kabck...R..',
 '....kaabbk.kaabbk.....',
 '....kkkkkk.kkkkkk.....',
];
/** Where the sword hand sits in the knight sprite. */
export const KNIGHT_HAND={x:16,y:19};

export const SWORD_PALETTE:Record<string,string>={k:'#1a1622',g:'#e3b51e',G:'#9a7a18',n:'#5a3a22',c:'#4de0ff',w:'#f3f6ff',W:'#b4bdd8'};
/** Sword pointing right. Grip pivot at (3,3). */
export const SWORD=[
 '......kk................',
 'kkk..kgGk...............',
 'kgnnnkgckkkkkkkkkkkkkkk.',
 'kgnnnkgckwwwwwwwwwwwwwwk',
 'kkk..kgckWWWWWWWWWWWWWk.',
 '......kGgkkkkkkkkkkkkkk.',
 '.......kk...............',
];
export const SWORD_PIVOT={x:3,y:3};

export const SKULL=[
 '.kkkkk.',
 'kwwwwwk',
 'kwkwkwk',
 'kwwwwwk',
 '.kwkwk.',
 '..kkk..',
];
export const SKULL_PALETTE:Record<string,string>={k:OUTLINE,w:'#f0ead8'};

export function makeSprite(rows:string[],palette:Record<string,string>):Sprite{
 const w=Math.max(...rows.map(r=>r.length)),h=rows.length;
 const img=document.createElement('canvas'),flash=document.createElement('canvas');
 img.width=flash.width=w;img.height=flash.height=h;
 const a=img.getContext('2d')!,b=flash.getContext('2d')!;
 b.fillStyle='#ffffff';
 rows.forEach((row,y)=>[...row].forEach((ch,x)=>{const col=palette[ch];if(!col)return;a.fillStyle=col;a.fillRect(x,y,1,1);b.fillRect(x,y,1,1)}));
 return {w,h,img,flash};
}

/** Mirror image of a sprite (characters are drawn facing one way and flipped as needed). */
export function flipSprite(s:Sprite):Sprite{
 const flip=(src:HTMLCanvasElement)=>{const c=document.createElement('canvas');c.width=s.w;c.height=s.h;const x=c.getContext('2d')!;x.translate(s.w,0);x.scale(-1,1);x.drawImage(src,0,0);return c};
 return {w:s.w,h:s.h,img:flip(s.img),flash:flip(s.flash)};
}

/** 3×5 pixel font. */
const FONT:Record<string,string>={
 '0':'111101101101111','1':'010110010010111','2':'111001111100111','3':'111001011001111','4':'101101111001001',
 '5':'111100111001111','6':'111100111101111','7':'111001010010010','8':'111101111101111','9':'111101111001111',
 '%':'101001010100101','.':'000000000000010',' ':'000000000000000','-':'000000111000000','!':'010010010000010',
 '/':'001001010100100','*':'000000010000000','×':'000101010101000',
 A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',
 F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',
 K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',
 P:'110101110100100',Q:'010101101110011',R:'110101110101101',S:'011100010001110',T:'111010010010010',
 U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',
 Z:'111001010100111',
};

export const textWidth=(text:string,scale=1)=>text.length?(text.length*4-1)*scale:0;

/** Lit cells of a glyph, for effects such as drips under the counter digits. */
export const glyphCells=(ch:string)=>{const g=FONT[ch]??FONT[' '];const out:{x:number;y:number}[]=[];for(let i=0;i<15;i++)if(g[i]==='1')out.push({x:i%3,y:Math.floor(i/3)});return out};

export function drawText(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,color:string|((row:number)=>string),scale=1){
 let cx=Math.round(x);
 for(const ch of text.toUpperCase()){
  for(const c of glyphCells(ch)){ctx.fillStyle=typeof color==='string'?color:color(c.y);ctx.fillRect(cx+c.x*scale,Math.round(y)+c.y*scale,scale,scale)}
  cx+=4*scale;
 }
}
