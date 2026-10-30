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

/**
 * Goku sprites traced cell-for-cell from the reference art (base form and Super Saiyan),
 * facing right. The _ARMLESS copies have the arms cut out so they can be posed for the
 * Kamehameha; the full sprites are used whenever his arms hang naturally.
 */
export const GOKU_PALETTE:Record<string,string>={'a':'#dad9de','b':'#f7cbab','c':'#f1c9a8','d':'#f4c593','e':'#e5926c','f':'#db8865','g':'#ad8271','h':'#fe5603','i':'#906652','j':'#636363','l':'#5a5e68','m':'#fc5303','n':'#f14125','o':'#bb3506','p':'#a82b02','q':'#933d27','r':'#2b4384','s':'#143576','t':'#0b2049','u':'#5e0c01','v':'#540b01','w':'#0b0509','x':'#040203','y':'#030303','z':'#030101','A':'#020403','B':'#020204','C':'#020202','D':'#020200','E':'#020002','F':'#010203','G':'#010103','H':'#010101','I':'#010100','J':'#010002','K':'#000303','L':'#000102','M':'#000006','N':'#000000'};
export const GOKU=[
 '...................gNyy........',
 '.................CgCC..........',
 '................yjNN...........',
 '...............CjNNC...........',
 '..............CjjNN..NyHHHC....',
 '..............yjHHH.HjjjjjjC...',
 '.............NjjNNNjjjjNNCNgH..',
 '.............yjjHNHjjHNHCjjCjy.',
 '.............HjjCNNjHNNCjCC....',
 '...........NNNNNNNNNNNNjy......',
 '...yN.....CNNNNNNHHNNHHE.......',
 '....NNHj..NNNNNNyjjHHjjjjjy....',
 '.....HNyjNNHjjNHjNNjHNjNCjjjN..',
 '......NNNjHjjIILjNNHjHNjNNNHjH.',
 'yCHjjjjyCjHjjNzzzINNHjNHjNHyHHy',
 '..HCHCjjjjHjjGxeeMNNzjJNyg.....',
 '....HHCNNINCjIzeffNNzezNNC.....',
 '......NNIIIIIjzCIfcIBbINNH.....',
 '...CHHNNNJeDIelq.zxcBbI.CH.....',
 '.....yyNNEeezefq..lxbB...y.....',
 '.......HICeeqefff.l.cF.........',
 '.........DCBiefffccdcF.........',
 '............xqfffccdB..........',
 '.........BEExeqfcccqB..........',
 '......NzDoomeffqqqqpoMG........',
 '......HrrsmpmcccfqccmhrC.......',
 '......NtttsmppccccqdsmrN.......',
 '......IsstthhmssssssshrH.......',
 '.....HefccBhmpmttttttaz........',
 '.....GiqccEppmpmsttttgD........',
 '.....KfqbMCophppmsssmIeH.......',
 '....yfbqx..JzJppmhmhmxbG.......',
 '....KbcA.....MssppooFbbsI......',
 '....MrrL.....DttttttIsssy......',
 '...xtssz....Dhppssssoztsby.....',
 '...IfbccB...zhpmhpmvhxffbH.....',
 '...Mccfqcw.ympmhmpmumhIfbH.....',
 '...GcbfqzHEpmhmhhpmvhmzbbH.....',
 '....HGbcI.MhhhhhmppuhhpNN......',
 '......Lx.GphhhmppvvvhmhN.......',
 '........JMphhmpmzLhpmhhD.......',
 '.......youphhpmH.Iphphhvx......',
 '......Covvppppz..Evvhpounz.....',
 '......NovuopvvI..Iuvvvvumz.....',
 '......HouvvvvoJ..xuovuunuz.....',
 '......DuouvvmuB...MummmuG......',
 '.......ErooouB.....DsnzA.......',
 '.......MrnrGI......Dsnz........',
 '.......KrnrB.......zsD.........',
 '.......wntx........Key.........',
 '......CeeB.........DtnMA.......',
 '......InD..........Dssnnx......',
 '.....CnrB..........GIDIDE......',
 '.....GGFH......................',
];
export const GOKU_ARMLESS=[
 '...................gNyy........',
 '.................CgCC..........',
 '................yjNN...........',
 '...............CjNNC...........',
 '..............CjjNN..NyHHHC....',
 '..............yjHHH.HjjjjjjC...',
 '.............NjjNNNjjjjNNCNgH..',
 '.............yjjHNHjjHNHCjjCjy.',
 '.............HjjCNNjHNNCjCC....',
 '...........NNNNNNNNNNNNjy......',
 '...yN.....CNNNNNNHHNNHHE.......',
 '....NNHj..NNNNNNyjjHHjjjjjy....',
 '.....HNyjNNHjjNHjNNjHNjNCjjjN..',
 '......NNNjHjjIILjNNHjHNjNNNHjH.',
 'yCHjjjjyCjHjjNzzzINNHjNHjNHyHHy',
 '..HCHCjjjjHjjGxeeMNNzjJNyg.....',
 '....HHCNNINCjIzeffNNzezNNC.....',
 '......NNIIIIIjzCIfcIBbINNH.....',
 '...CHHNNNJeDIelq.zxcBbI.CH.....',
 '.....yyNNEeezefq..lxbB...y.....',
 '.......HICeeqefff.l.cF.........',
 '.........DCBiefffccdcF.........',
 '............xqfffccdB..........',
 '.........BEExeqfcccqB..........',
 '......NzDoomeffqqqqpoMG........',
 '......HrrsmpmcccfqccmhrC.......',
 '......NtttsmppccccqdsmrN.......',
 '......IsstthhmssssssshrH.......',
 '..........Bhmpmtttttt..........',
 '..........Eppmpmstttt..........',
 '..........CophppmsssmI.........',
 '...........JzJppmhmhmx.........',
 '.............MssppooFb.........',
 '.............DttttttIs.........',
 '............Dhppssssoz.........',
 '............zhpmhpmvhx.........',
 '...........ympmhmpmumh.........',
 '..........Epmhmhhpmvhm.........',
 '..........MhhhhhmppuhhpN.......',
 '.........GphhhmppvvvhmhN.......',
 '........JMphhmpmzLhpmhhD.......',
 '.......youphhpmH.Iphphhvx......',
 '......Covvppppz..Evvhpounz.....',
 '......NovuopvvI..Iuvvvvumz.....',
 '......HouvvvvoJ..xuovuunuz.....',
 '......DuouvvmuB...MummmuG......',
 '.......ErooouB.....DsnzA.......',
 '.......MrnrGI......Dsnz........',
 '.......KrnrB.......zsD.........',
 '.......wntx........Key.........',
 '......CeeB.........DtnMA.......',
 '......InD..........Dssnnx......',
 '.....CnrB..........GIDIDE......',
 '.....GGFH......................',
];
export const GOKU_SSJ_PALETTE:Record<string,string>={'a':'#faddb4','b':'#fddab5','c':'#fed7b3','d':'#efbc45','e':'#f1b946','f':'#f99a19','g':'#ff8f13','h':'#ff8f0b','i':'#eabd47','j':'#ebb84b','l':'#e1996d','m':'#c8987b','n':'#ff8c10','o':'#d77d24','p':'#d35b2b','q':'#ae7560','r':'#4867d6','s':'#3a52c8','t':'#c73d10','u':'#c33d13','v':'#c93718','w':'#b6341c','x':'#7f1d3a','y':'#25378c','z':'#0a0002','A':'#060001','B':'#040002','C':'#000501','D':'#010303','E':'#010202','F':'#010103','G':'#010100','H':'#010007','I':'#000002','J':'#020000','K':'#000000'};
export const GOKU_SSJ=[
 '.....G...................',
 '.....K....K..............',
 '....F.G...KH...K.........',
 '....A..GG.B.GG.KG........',
 '...Fj....HCd..DH.H.......',
 '...Bi....o..ii.Ee.J..K...',
 '...Ied...od...jHe..F.B...',
 '.K.Gjo...o.ij..dd..GH.G..',
 '.KKFjod..o...j..j..zj.F..',
 '.K.Gio.e.o....e.e..e..F..',
 '.I..io..jo.d...jd..j..F..',
 '.D...o...eo.j...j.d..CC..',
 '.Gj..o....iojd..joojjG...',
 '.Iee..i....djed.j..o..H..',
 '..zie.jj.dijd..e....o..H.',
 'KHBCje.ej..o....dii..o..I',
 '.Hijeiio...o...ded.e..H.I',
 '..Hd...o..dlo..bbal.i.JAH',
 '...Cejio..lllo.bbbbG..G.G',
 '....GoGHo.loococabcIJ.I..',
 '..GHddCcjoll.obacboG.KK..',
 '....CDGcldll..oplo.D..G..',
 '......Bacllca.r.lrC......',
 '.......AAqlbccccclz......',
 '........AlqbcclclC.......',
 '.....ABGvlqqcbclA........',
 '...GEAhngmqlqABGuAAK.....',
 '...zrrrghhlqllqlltghBI...',
 '...HrrsyghgrccblcargrK...',
 '...FacyyhhhhssrssrsfrG...',
 '..AallmyghghhyyyyyrfzG...',
 '..Blbalyvthvgnyyssu.B....',
 '..JlaaHAvvuhvhgtutfqI....',
 '.DclqC..zvututhgnhuFJ....',
 '.CablI...zGyyyysrrzllB...',
 '.BmbD.....GyyrrryyzllJ...',
 '.HrrH....KthgggxxnuJyH...',
 '.CrrEJ...KgnggguxhgFysC..',
 '.BaccbB..AgghnnvxgnAllJ..',
 '.CbblcF.BhgggguuxugBqlG..',
 '.CbbllB.FnggnuuxtunAqlG..',
 '..AabC.BvgggugxxntgCllF..',
 '...CC..JugghgtzuvgnDAB...',
 '......InvghhuvCttggC.....',
 '......CgtnnttHuvugntB....',
 '.....DxnuuvvuCuuguuuH....',
 '....HxxntutgFJtunttnG....',
 '....HuxhhgnvJGxvuhgnE....',
 '....IwxhgnvhBIxxthntA....',
 '.....DxvttfA.JtuxuuH.....',
 '.....AspsJz...ByyxC......',
 '.....GrpsH....zyyC.......',
 '.....HspC......GyA.......',
 '.....HjjC......BoA.......',
 '.....zpH.......GyxDC.....',
 '....ArpH.......GyyxxC....',
 '....DpsA.................',
];
export const GOKU_SSJ_ARMLESS=[
 '.....G...................',
 '.....K....K..............',
 '....F.G...KH...K.........',
 '....A..GG.B.GG.KG........',
 '...Fj....HCd..DH.H.......',
 '...Bi....o..ii.Ee.J..K...',
 '...Ied...od...jHe..F.B...',
 '.K.Gjo...o.ij..dd..GH.G..',
 '.KKFjod..o...j..j..zj.F..',
 '.K.Gio.e.o....e.e..e..F..',
 '.I..io..jo.d...jd..j..F..',
 '.D...o...eo.j...j.d..CC..',
 '.Gj..o....iojd..joojjG...',
 '.Iee..i....djed.j..o..H..',
 '..zie.jj.dijd..e....o..H.',
 'KHBCje.ej..o....dii..o..I',
 '.Hijeiio...o...ded.e..H.I',
 '..Hd...o..dlo..bbal.i.JAH',
 '...Cejio..lllo.bbbbG..G.G',
 '....GoGHo.loococabcIJ.I..',
 '..GHddCcjoll.obacboG.KK..',
 '....CDGcldll..oplo.D..G..',
 '......Bacllca.r.lrC......',
 '.......AAqlbccccclz......',
 '........AlqbcclclC.......',
 '.....ABGvlqqcbclA........',
 '...GEAhngmqlqABGuAAK.....',
 '...zrrrghhlqllqlltghBI...',
 '...HrrsyghgrccblcargrK...',
 '...FacyyhhhhssrssrsfrG...',
 '.......yghghhyyyyyrfzG...',
 '.......yvthvgnyyssu.B....',
 '.......AvvuhvhgtutfqI....',
 '........zvututhgnhuFJ....',
 '.........zGyyyysrrzl.....',
 '..........Gyyrrryyzl.....',
 '.........KthgggxxnuJ.....',
 '.........KgnggguxhgF.....',
 '.........AgghnnvxgnA.....',
 '........BhgggguuxugB.....',
 '........FnggnuuxtunA.....',
 '.......BvgggugxxntgC.....',
 '.......JugghgtzuvgnD.....',
 '......InvghhuvCttggC.....',
 '......CgtnnttHuvugntB....',
 '.....DxnuuvvuCuuguuuH....',
 '....HxxntutgFJtunttnG....',
 '....HuxhhgnvJGxvuhgnE....',
 '....IwxhgnvhBIxxthntA....',
 '.....DxvttfA.JtuxuuH.....',
 '.....AspsJz...ByyxC......',
 '.....GrpsH....zyyC.......',
 '.....HspC......GyA.......',
 '.....HjjC......BoA.......',
 '.....zpH.......GyxDC.....',
 '....ArpH.......GyyxxC....',
 '....DpsA.................',
];

/** Per-form rig in the right-facing image: body centre, band splits, shoulders and fists as [back, front]. */
export const GOKU_RIG={
 base:{centre:15,hairEnd:14,torsoEnd:40,shoulders:[{x:8,y:28},{x:21,y:28}],fists:[{x:5,y:36},{x:23,y:36}]},
 ssj:{centre:12,hairEnd:17,torsoEnd:42,shoulders:[{x:5,y:30},{x:19,y:32}],fists:[{x:3,y:39},{x:20,y:39}]},
};

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
