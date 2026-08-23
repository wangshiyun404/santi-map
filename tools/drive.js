/* 自动化冒烟/覆盖审计脚本（仅测试用）：在页面里注入后调用 __runAll() */
(function(){
window.__errs=window.__errs||[]; window.addEventListener('error',e=>__errs.push(e.message));
window.__miss=[]; window.__hits=0; if(!window.__origSay){ window.__origSay=SM.Narr.say; }
SM.Narr.say=function(t,cb,o){ var kid=document.body.classList.contains('kid'); var vk=(o&&o.voice==='guide')?'guide':(kid?'kid':'reader'); var h=SM.Narr.hash(String(t).trim()); var man=SM.AUDIO_MANIFEST||{}; var order=vk==='guide'?['guide','kid','reader']:vk==='kid'?['kid','reader','guide']:['reader','kid','guide']; var found=null; for(var i=0;i<order.length;i++){ if(man[order[i]+'_'+h]){found=order[i];break;} } if(!found) __miss.push([vk,String(t).slice(0,40)]); else { __hits++; if(found!==vk && vk!=='guide') __miss.push([vk+'→'+found, String(t).slice(0,40)]); } SM.Narr.stop(); if(cb) setTimeout(cb,150); };
window.__open=function(id){ SM.World.setFrozen(true); document.getElementById('hud').classList.add('hidden'); window.__closed=null; SM.Stage.open(SM.ISLANDS.find(i=>i.id===id), function(isl,c){ document.getElementById('hud').classList.remove('hidden'); SM.World.setFrozen(false); window.__closed=[isl.id,c]; }); };
window.__drive=function(id, act, timeout){ return new Promise(function(res){ __open(id); var lastPrompt=null, t0=Date.now(); var iv=setInterval(function(){ var $=x=>document.getElementById(x); if(__closed){clearInterval(iv);res({c:__closed[1],ms:Date.now()-t0});return;} if(Date.now()-t0>(timeout||40000)){clearInterval(iv);res({timeout:true,prompt:$('intPrompt').textContent.slice(0,30)});SM.Stage.close(false);return;} if(!$('subtitle').classList.contains('hidden')) { $('nextBtn').click(); return; } if(!$('cardPop').classList.contains('hidden')) { var b=$('cardPop').querySelector('.ok button'); b&&b.click(); return; } if(!$('thinkBox').classList.contains('hidden')) { $('thinkSkip').click(); return; } if(!$('interact').classList.contains('hidden')) { var p=$('intPrompt').textContent; if(p!==lastPrompt){ lastPrompt=p; try{ act({prompt:p, body:$('intBody'), note:$('intNote'), opts:$('intOpts'), all:$('interact')}); }catch(e){__errs.push('act:'+e.message);} } } }, 250); }); };
window.__setRange=function(el,v){ el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); };
window.__clickBtn=function(els,text){ var b=[...(els.all||els.opts).querySelectorAll('button')].find(b=>b.textContent.includes(text)&&!b.disabled); if(b){b.click();return true;} return false; };
window.__pollBtn=function(els,text,done){ var iv=setInterval(function(){ if(__clickBtn(els,text)){clearInterval(iv); done&&done();} },300); setTimeout(()=>clearInterval(iv),50000); };
function cvClick(cv, pts, scaleW, scaleH, after){ function go(){ var r=cv.getBoundingClientRect(); if(r.width===0){ setTimeout(go,300); return; } pts.forEach(p=>cv.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+p[0]*r.width/scaleW,clientY:r.top+p[1]*r.height/scaleH}))); after&&setTimeout(after,300); } setTimeout(go,300); }
window.__acts={
 qinghua:els=>__clickBtn(els,'拾起'), hongan:els=>{ __setRange(els.body.querySelector('input[type=range]'),19); setTimeout(()=>__clickBtn(els,'对准'),400); }, launch:els=>__clickBtn(els,'发'),
 countdown:els=>{ __clickBtn(els,'拍照'); setTimeout(()=>__clickBtn(els,'拍照'),600); setTimeout(()=>__clickBtn(els,'继续'),1200); },
 flicker:els=>{ __clickBtn(els,'开始观测'); __pollBtn(els,'次',()=>setTimeout(()=>__clickBtn(els,'继续'),500)); },
 eras:els=>{ setTimeout(()=>__clickBtn(els,'全民脱水'),300); },
 computer:els=>{ var fA=els.body.querySelector('#fA'), fB=els.body.querySelector('#fB'); fA.click(); fB.click(); fA.click(); fA.click(); setTimeout(()=>__clickBtn(els,'我明白了'),400); },
 noanswer:els=>{ __clickBtn(els,'我回答'); setTimeout(()=>__clickBtn(els,'继续'),400); },
 truth:els=>{ __clickBtn(els,'第一颗'); setTimeout(()=>__clickBtn(els,'第二颗'),2200); setTimeout(()=>__clickBtn(els,'第三颗'),4400); setTimeout(()=>__pollBtn(els,'继续'),5000); },
 answer:els=>{ var hb=els.body.querySelector('.holdbtn'); hb.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); setTimeout(()=>hb.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})),3400); },
 judgment:els=>{ __clickBtn(els,'节点 1'); __clickBtn(els,'节点 2'); __clickBtn(els,'节点 3'); setTimeout(()=>__clickBtn(els,'继续'),400); },
 zither:els=>{ __setRange(els.body.querySelector('input[type=range]'),100); setTimeout(()=>__clickBtn(els,'拉好'),400); }, bugs:els=>__clickBtn(els,'挥手'),
 b2_axioms:els=>{ var kid=document.body.classList.contains('kid'); var seq = els.prompt.startsWith('第1')?(kid?['活下去','是文明最要紧的事']:['生存','是文明的','第一需要']):(kid?['东西是有限的','可文明一直在长大']:['文明不断增长和扩张','但宇宙中的物质总量','保持不变']); seq.forEach((t,i)=>setTimeout(()=>__clickBtn(els,t), 200+i*300)); },
 b2_wallfacer:els=>{ __clickBtn(els,'罗辑'); setTimeout(()=>__clickBtn(els,'继续'),400); },
 b2_luoji:els=>{ cvClick(els.body.querySelector('canvas'), [[150,60],[230,50],[275,120],[250,200],[160,210],[120,130]], 420, 260, ()=>__clickBtn(els,'画好了')); },
 b2_wallbreaker:els=>{ var pairs=[['泰勒','量子幽灵'],['雷迪亚兹','核弹威胁'],['希恩斯','思想钢印']]; pairs.forEach((p,i)=>{ setTimeout(()=>__clickBtn(els,p[0]),200+i*600); setTimeout(()=>__clickBtn(els,p[1]),450+i*600); }); setTimeout(()=>__clickBtn(els,'继续'),2400); },
 b2_zhang:els=>{ __clickBtn(els,'辐射推进'); setTimeout(()=>__clickBtn(els,'继续'),400); }, b2_spell:els=>__clickBtn(els,'发出咒语'), b2_ravine:els=>__clickBtn(els,'上 升'), b2_ns:els=>__clickBtn(els,'前 进 四'),
 b2_droplet:els=>{ __setRange(els.body.querySelector('input[type=range]'),100); setTimeout(()=>__clickBtn(els,'放开它'),400); },
 b2_darkbattle:els=>{ __clickBtn(els,'不开火'); setTimeout(()=>__clickBtn(els,'继续'),400); },
 b2_spellhit:els=>{ __setRange(els.body.querySelector('input[type=range]'),39); setTimeout(()=>__clickBtn(els,'找到了'),400); },
 b2_law:els=>{ var bs=[...els.opts.querySelectorAll('button')]; bs[bs.length-1].click(); setTimeout(()=>__clickBtn(els,'继续'),400); },
 b2_snow:els=>{ for(var i=1;i<=10;i++){ (function(i){ setTimeout(()=>__clickBtn(els,'轨道 '+i),100*i); })(i);} setTimeout(()=>__clickBtn(els,'布好了'),1400); },
 b2_deterrence:els=>{ var hb=els.body.querySelector('.holdbtn'); hb.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); setTimeout(()=>hb.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})),3600); },
 b3_star:els=>{ var cv=els.body.querySelector('canvas'); function go(){ var r=cv.getBoundingClientRect(); if(r.width===0){ setTimeout(go,300); return; } for(var x=370;x<=490;x+=16) for(var y=70;y<=210;y+=16){ if(els.note.textContent.includes('就是它')) break; cv.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+x*r.width/560,clientY:r.top+y*r.height/300})); } setTimeout(()=>__clickBtn(els,'找到了'),300); } setTimeout(go,300); },
 b3_staircase:els=>{ for(var i=0;i<5;i++){ setTimeout(()=>__clickBtn(els,'引 爆'),200+i*350); } }, b3_sword:els=>{ __clickBtn(els,'程心'); setTimeout(()=>__clickBtn(els,'继续'),400); },
 b3_fail:els=>{ setTimeout(()=>__clickBtn(els,'不按'),800); setTimeout(()=>__clickBtn(els,'继续'),1300); },
 b3_4d:els=>{ __setRange(els.body.querySelector('input[type=range]'),100); setTimeout(()=>__clickBtn(els,'广 播'),400); }, b3_triend:els=>__clickBtn(els,'观 测'),
 b3_tales:els=>{ var idx = els.prompt.includes('第一个')?0:els.prompt.includes('第二个')?1:2; var bs=[...els.opts.querySelectorAll('button')]; bs[idx].click(); setTimeout(()=>{ if(!__clickBtn(els,'下一个')) __clickBtn(els,'继续'); },400); },
 b3_bunker:els=>{ ['木星','土星','天王星','海王星'].forEach((t,i)=>setTimeout(()=>__clickBtn(els,t),200+i*300)); setTimeout(()=>__clickBtn(els,'继续'),1800); },
 b3_wade:els=>{ __clickBtn(els,'让他停下'); setTimeout(()=>__clickBtn(els,'继续'),400); }, b3_singer:els=>__pollBtn(els,'扔出去'), b3_flat:els=>__clickBtn(els,'光速逃离'), b3_blue:els=>__clickBtn(els,'出 发'),
 b3_647:els=>{ for(var i=0;i<4;i++){ setTimeout(()=>__clickBtn(els,'擦一下'),200+i*300); } setTimeout(()=>__clickBtn(els,'走进门'),1800); }, b3_end:els=>__clickBtn(els,'放下生态球')
};
window.__runAll=async function(ids){ window.__results={}; for (var id of (ids||Object.keys(__acts))) { __results[id]=await __drive(id, __acts[id], 40000); } __results.done=true; };
})();
