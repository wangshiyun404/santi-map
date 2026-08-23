// 覆盖审计：枚举运行时会传给 Narr.say 的全部文本，对照 audio/manifest.js（与 narration.js 相同哈希）。gen_audio.py 之后跑一遍。
const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
global.window=global;global.SM={};
for(const f of ['data.js','data2.js','data3.js'])new Function(fs.readFileSync(path.join(root,'js',f),'utf8'))();
new Function(fs.readFileSync(path.join(root,'audio','manifest.js'),'utf8'))();const man=SM.AUDIO_MANIFEST;
function hash(s){var v=5381;for(var i=0;i<s.length;i++)v=((v*33)^s.charCodeAt(i))>>>0;return v.toString(16);}
function findClip(text,vk){var h=hash(text.trim());var o=vk==='guide'?['guide','kid','reader']:vk==='kid'?['kid','reader','guide']:['reader','kid','guide'];for(var i=0;i<o.length;i++)if(man[o[i]+'_'+h])return o[i];return null;}
const items=[];const add=(t,v,w)=>{ if(t) items.push({text:String(t),voice:v,where:w}); };
SM.ISLANDS.forEach(i=>{add(i.say.kid,'kid','data '+i.id);add(i.say.reader,'reader','data '+i.id);});
function extract(src){const out=[];let idx=0;while((idx=src.indexOf('api.say(',idx))>=0){let i=idx+8,d=1,q=null;const s=i;while(i<src.length&&d>0){const c=src[i];if(q){if(c==='\\')i++;else if(c===q)q=null;}else{if(c==="'"||c==='"'||c==='`')q=c;else if(c==='(')d++;else if(c===')')d--;}i++;}out.push({line:src.slice(0,idx).split('\n').length,arg:src.slice(s,i-1)});idx=i;}return out;}
function first(arg){let d=0,q=null,cur='';for(let i=0;i<arg.length;i++){const c=arg[i];if(q){cur+=c;if(c==='\\')cur+=arg[++i];else if(c===q)q=null;continue;}if(c==="'"||c==='"'||c==='`'){q=c;cur+=c;continue;}if('({['.includes(c))d++;if(')}]'.includes(c))d--;if(c===','&&d===0)break;cur+=c;}return cur.trim();}
let unhandled=0;
for(const f of ['islands.js','islands2.js','islands3.js']){const src=fs.readFileSync(path.join(root,'js',f),'utf8');for(const c of extract(src)){const e=first(c.arg),w=f+':'+c.line;
 if(e==='api.txt(api.island.say)')continue;
 if(/^api\.kid\s*\?/.test(e)){const fn=new Function('api','return ('+e+')');add(fn({kid:true}),'kid',w);add(fn({kid:false}),'reader',w);continue;}
 if(e==='msg'){const re=/msg = choice === 'dehy' \? '((?:[^'\\]|\\.)*)' : '((?:[^'\\]|\\.)*)'/g;let m;while((m=re.exec(src)))for(const t of [m[1],m[2]]){add(t,'kid',w);add(t,'reader',w);}continue;}
 if(e==='A.text'){const re=/text:\s*(api\.kid\s*\?\s*'(?:[^'\\]|\\.)*'\s*:\s*'(?:[^'\\]|\\.)*')/g;let m;while((m=re.exec(src))){const fn=new Function('api','return ('+m[1]+')');add(fn({kid:true}),'kid',w);add(fn({kid:false}),'reader',w);}continue;}
 unhandled++; console.log('UNHANDLED api.say shape',w,e);}}
add(SM.GUIDE.intro.kid,'guide','intro');add(SM.GUIDE.intro.reader,'guide','intro');add(SM.GUIDE.welcomeBack,'guide','welcome');
add('已切换到小学生模式：字少一点，讲慢一点。','guide','mode');add('已切换到读者模式：旁白更完整，每站附"想一想"。','guide','mode');
Object.values(SM.GUIDE.lineChange).forEach(t=>add(t,'guide','lineChange'));
add(SM.GUIDE.book2.kid,'guide','book2');add(SM.GUIDE.book2.reader,'guide','book2');add(SM.GUIDE.book3.reader,'guide','book3');add(SM.GUIDE.book3.kid,'guide','book3');add(SM.GUIDE.book3.kid+' '+SM.GUIDE.kidWarn,'guide','book3+warn');
[SM.GUIDE.end,SM.GUIDE.book2end,SM.GUIDE.book3end].forEach(t=>add(t,'guide','end'));
SM.ISLANDS.forEach((i,k)=>{if(k<SM.ISLANDS.length-1)add('收好了！继续沿河往前走，下一站是"'+SM.ISLANDS[k+1].title+'"。','guide','next');});
new Set(SM.ISLANDS.map(i=>i.cards.length)).forEach(n=>{const t=n>1?'你收到了'+n+'张线索卡。':'你收到了一张线索卡。';add(t,'kid','cards');add(t,'reader','cards');});
let miss=0,wrong=0,nonbmp=0;for(const it of items){ if(/[\uD800-\uDFFF]/.test(it.text)){nonbmp++;console.log('NON-BMP',it.where);} const got=findClip(it.text,it.voice);if(!got){miss++;console.log('MISSING',it.voice,it.where,it.text.slice(0,40));}else if(got!==it.voice){wrong++;console.log('WRONG VOICE',it.voice,'->',got,it.where);}}
console.log('items',items.length,'missing',miss,'wrongVoice',wrong,'nonBMP',nonbmp,'unhandled',unhandled,'manifest',Object.keys(man).length);
process.exit(miss||unhandled?1:0);
