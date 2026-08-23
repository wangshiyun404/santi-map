# 声音系统第三方审查报告（只读审查，未改任何源码）

审查日期：2026-08-24 01:15 左右。审查对象版本（审查期间 `js/narration.js`、`js/audio.js` 被并发修改过一次，本报告以下列版本为准）：

| 文件 | mtime | md5 | 说明 |
|---|---|---|---|
| js/narration.js | 08-24 01:13:28 | e876c70b… | 含 `playGen` 代际守卫 + 新增 `playBuffer`（data: 片段走 WebAudio 解码） |
| js/audio.js | 08-24 01:13:09 | 11642aa6… | 新增 `voiceBus` / `ctx()` / `voiceBus()` 导出 |
| js/stage.js / main.js / islands*.js | 08-24 00:16 | — | 未变 |
| audio/manifest.js | 08-24 00:25 | — | 262 条 |
| dist/artifact.html / dist/三体阅读地图.html | 08-24 00:27 / 00:25 | — | **仍是 git HEAD 的旧 narration.js（无 playGen）** |

证据来源：代码阅读 + 三个脚本/实测：
- `coverage.js`（附录 A）：枚举运行时会传给 `Narr.say` 的全部 251 条文本，用与 narration.js 相同的 djb2 哈希对照 manifest。
- `coll.js`（附录 B）：检查新 `playBuffer` 的解码缓存键是否碰撞。
- 浏览器实测：在本地 http 版（localhost:8975，新 narration.js）里给 `Audio`/`speechSynthesis`/`SM.Narr` 打桩记录时间线；另外用"跨源 iframe + 与 Artifact 相同的 sandbox/allow 属性"的测试页验证自动播放策略（Artifact 页面的 iframe 实测属性：`sandbox="allow-scripts allow-same-origin allow-forms" allow="fullscreen"`，`document.featurePolicy.allowsFeature('autoplay') === false`）。

---

## 一、必须修（按严重程度排序）

### M1. 线上 Artifact 与单文件版仍是"旧句被合成器重念"的旧代码
- 位置：`dist/artifact.html`、`dist/三体阅读地图.html`（00:25/00:27 构建）里 `SM.Narr` 块等于 `git show HEAD:js/narration.js`，`grep -c playGen dist/*.html` = 0。
- 旧代码 `stop()` 用 `cur.src = ''`，这会触发 `<audio>` 的 `error` 事件（MEDIA_ERR_SRC_NOT_SUPPORTED），旧的 `a.onerror` 没有代际判断 → `speakTTS(旧句)` → 玩家点"继续"后，**上一句被系统合成器（机器声）从头重念**，并与新句的人声叠在一起。这正是用户反馈的两个症状的根源。
- 复现（线上 Artifact）：读者模式 → 进第一站 → 旁白播到一半点"继续" → 听到机器声重念上一句、同时新句人声开始。
- 修法：`python3 build.py` 重新构建，并用 Artifact 工具（传 `url`）重新发布；把"构建时间必须晚于 js 最后修改时间"写进 CLAUDE.md 的发布清单。

### M2.（新代码）`playBuffer` 的解码缓存键大面积碰撞 → 字幕是这句、念的是另一句
- 位置：`js/narration.js:69` `var key = clip[0].length + ':' + clip[0].slice(-64);`
- 事实：edge-tts 生成的 mp3 文件尾部几乎相同（原始 262 条 data URI 的最后 64 个 base64 字符只有 **2 种**；Artifact 20kbps 转码版只有 **13 种**），所以这个键实际上只剩"base64 长度"。`coll.js` 对两份构建产物各算了一遍：**Artifact 版 25 对碰撞、单文件版 24 对碰撞**，其中大量是同一模式内都会播到的句子，例如（Artifact 版）：
  - `reader_e8d9d8bb`"你收到了一张线索卡。" ↔ `reader_29e35ce8`"你收到了3张线索卡。"（读者模式收卡提示，几乎每站都播）
  - `kid_86e43809`"你收到了2张线索卡。" ↔ `kid_307de6cf`"你收到了4张线索卡。"
  - `guide_62093426`"收好了！…下一站是'太阳是放大器'" ↔ `guide_d8c04694`"…下一站是'墓前的两条公理'"（另有 6 对"下一站是…"互撞）
  - `guide_c2a87a80`"河变成金色——…" ↔ `guide_4ef93998`"已切换到小学生模式：…"
  - `guide_18247b88`"第二部走完了…" ↔ `kid_8d600a46`"星环号上只有两个人…"
  - `kid_61dd60ee`"你判断对了！恒纪元里…" ↔ `kid_1451ddc`"罗辑去冬眠了…"
  - 单文件版还有 `guide_f3937baa` ↔ `guide_f173528d`"河变成紫色——这是罗辑的面壁线。" 等。
- 后果：先播过的那句进了 `bufCache`，后来的同键句子直接拿到错误的 PCM → **播放内容与字幕不符**，且可能换了声线（guide↔kid）。这是"播放错乱"里最严重的一种，而且只在 data: 构建（Artifact/单文件，即真正发给学生的版本）出现，本地 http 调试听不到。
- 修法：缓存键直接用 manifest 的键（`声线_哈希`，在 `findClip` 里顺手返回）或 `clip[0]` 完整字符串做 Map 键（字符串做键不会被复制，内存无额外开销）。

### M3. 从首页"继续上次的旅程"/再选模式进入星河时，向导开场白被 0 ms 内掐掉
- 位置：`js/main.js:23-31 start()` 先 `jumpTo()` 再 `guideSay(intro,true)`；`js/world.js:346-349` 的 `curLine/curBook` 是模块级变量，`showTitle()`（main.js:13）回首页时不重置；下一帧 `World.update` 发现 line/book 与上次不同 → `onLineChange` / `onBookChange`（main.js:88-91）各 `guideSay(...,true)` → `Narr.say` 的 `stop()` 掐掉开场白。
- 实测日志（同一毫秒内三次 Narr.say，前两句被 AbortError 掐掉，只有第三句在播）：
  ```
  50947 Narr.say "你好，我是小智子……" voice=guide   ← 开场白
  50949 Narr.say "三条河汇合成一条了——真相就在前方。"  ← onLineChange
  50950 Narr.say "进入第三部《死神永生》。……"          ← onBookChange
  50954 play#1 rejected AbortError / play#2 rejected AbortError / play#3 resolved
  ```
  复现：任一进度下进入星河 → 走到别的线/别的部 → 点"首页" → 点"继续上次的旅程"（或再点一次模式按钮）。玩家听到开场白冒一个字就变成"河变成……"。
- 修法：`World` 暴露 `resetLineBook()`（把 `curLine=null; curBook=-1`）并在 `start()`/`jumpTo()` 里调用（`jumpTo` 是"传送"，本就不该触发"河变色了"的播报）；或者 `onLineChange/onBookChange` 在 `Narr` 正在播向导句时排队而不是打断（见 S4）。

### M4. 句末 0.9 s 内点"重听"会被掐断并直接推进剧情
- 位置：`js/stage.js:44-45`：`Narr.say(text, cb)` 的 cb 是 `setTimeout(finish, 900)`，句柄没保存；`replayBtn.onclick` 重新 `Narr.say` 但不清这个定时器；`finish()` 里调 `SM.Narr.stop()`。
- 实测日志：`122978 ended#6` → `123299 Narr.say（重听）` → `123882 Narr.stop`（=句末 +904 ms）→ 重听只响了 0.58 s，字幕消失、互动面板弹出。
- 修法：把 `setTimeout(finish, hold)` 的句柄存起来，`replayBtn.onclick` 先 `clearTimeout`；或把"hold 后 finish"改成由 `Narr.say` 的 onEnd 统一触发（重听时 onEnd 会重新挂上）。

### M5.（新代码）`bufCache` 无上限，一轮玩下来可占数百 MB 内存
- 位置：`js/narration.js:58,71`。解码后的 PCM 是 float32：manifest 总时长 3842 s，Artifact 版 22050 Hz 单声道 ≈ **339 MB**，单文件版 24000 Hz ≈ **369 MB**（全部句子都播一遍的上限；只玩一部也有 ~110 MB）。iPad/低配 Windows 本子上 Safari/Chrome 标签页可能被杀或整机卡顿。
- 修法：不缓存（解码一条 20–200 KB 的 mp3 只要几十 ms；"重听"那一次再解一遍即可），或 LRU 只留最近 3–5 条。

### M6. `Audio.play()` 被拒时退回合成器 = 直接把"机器声"端给玩家
- 位置：`js/narration.js:47,51`：`p.catch(fallback)` 对 **任何** 拒绝（含 `NotAllowedError`）都 `speakTTS`。
- 事实：
  - Chrome/Chromium 下 Artifact 沙箱 iframe（autoplay 权限策略关闭）实测：用户在 iframe 里点过一次后，`new Audio(data:).play()` 在 7 s、12 s 后脱离手势调用仍 **成功**（sticky activation）。所以 Chrome 上不会触发；本地 http / file:// 同理。
  - Safari（macOS/iOS）对 `<audio>` 的规则是"每次 play() 需要手势或 1 s 内的手势转发"：第一句在 650 ms 定时器里启动没问题，但 **自动续播的句子**（`await api.wait()` 后、或上一句 onended 后 900 ms 自动推进 → 下一句）会 `NotAllowedError` → 退回 TTS → 机器声；iOS 上 `speechSynthesis` 还可能同样被拒 → 静默 + 字幕按估算时长硬等。这只影响 http/file 版（dist 的 data: 版现在走 WebAudio，不受此限）。
- 修法：(1) `fallback` 里区分 `e.name === 'NotAllowedError'`：不退 TTS，改为保留字幕、在字幕条上提示"点一下继续播放"，并在下一次 click/keydown 时重试 `a.play()`；(2) 更彻底：URL 片段也走 `fetch → decodeAudioData → voiceBus`（和 data: 路径统一），WebAudio 上下文一旦在手势里 `resume` 过就不再受逐句手势限制，顺带免去 CSP `media-src` 问题。

### M7. 退出岛后仍会响的"幽灵音效"（api.sfx 无代际守卫）
- 位置：`js/stage.js:94` `sfx: function (n) { if (SM.Audio) SM.Audio.sfx(n); }` 没有 `g === gen` 判断；以下延时调用在玩家点"返回星河"后照样触发：
  - `js/islands3.js:153` `setTimeout(function () { api.sfx('boom'); }, 2200)`（光粒）
  - `js/islands3.js:280` `setTimeout(function () { api.sfx('flatten'); }, 2200)`（二维化，6 s 长音）
  - `js/islands3.js:100` 10 s 倒计时 `setInterval` 到 0 调 `decide(false,true)` → `api.sfx('boom')`
  - `js/islands.js:339`、`js/islands2.js:368` 按住 3 s 的 `setInterval`（触屏下可能按住时点到退出）
- 后果：回到星河 1–10 s 后凭空一声 boom / 6 s 的二维化下滑音，与 `exit` 音效和向导句叠在一起。
- 修法：`api.sfx` 包成 `function (n) { if (g === gen && SM.Audio) SM.Audio.sfx(n); }`；`interact()` 的 finish/ABORT 时清理岛内定时器（给 api 加 `api.timeout/api.interval` 自动登记、`close()` 时统一 clear）。

---

## 二、建议改进（按价值排序）

- **S1. AudioContext 被挂起时的行为**（`js/audio.js:87 sfx`、`:59 update`）：iOS/iPadOS 锁屏、来电、切后台会让 ctx 变 `suspended`/`interrupted`，只有 `init()`（首页两个按钮）会 `resume()`。挂起期间 `now()` 不走，`update()` 里的 cricket/crackle、每次按钮的 click 音效都排在同一个 `t` 上，恢复瞬间一起放出（短促爆音）；同时期间所有 sfx"该响不响"。建议：`sfx()`/`update()` 开头 `if (ctx.state !== 'running') { ctx.resume(); return; }`，并监听 `visibilitychange` 与首个 `pointerdown` 做 resume。
- **S2. 响度/削波**：`sfxBus(.8)×master(.9)=.72`；`boom`（audio.js:77）包络峰值正弦 .9 + 噪声 .5 → 叠加峰值 ≈ 1.0，与 `card`/和声垫/其他 sfx 同时发生时会顶到满幅。建议在 `master → destination` 之间加一个 `DynamicsCompressorNode`（threshold −12 dB、ratio 8、attack .003、release .25）当限制器，几乎零成本。
- **S3. duck 起音偏慢**：`duck(true)` 时间常数 .25（audio.js:88）→ 0.75 s 后音乐才压到位，人声开头 0.5 s 被伴奏"盖一下"；建议起音 .06–.1，释放 .8 保留。
- **S4. 向导句之间互相打断**：`guideSay` 直接 `Narr.say` → `stop()`。典型链路：完成一站 → "收好了！下一站是…"（4 s）→ 玩家立刻前进 0.012/NB 过线 → "河变蓝了"掐掉前句 → 过部界 → 书前言又掐掉。建议给向导做一个 2–3 条的小队列（正在播时排队，或"河变色/书前言"这类提示延到当前句结束后再播），岛内旁白仍保持"新句打断旧句"。
- **S5. 开场白每次回首页再进都整段重播**（reader 版 30 s、kid 版 22 s）：建议只在 `doneCount()===0` 或首次 `start()` 时念，之后改念一条短的"欢迎回来"。
- **S6. TTS 兜底路径的已知坑**（只要还保留兜底就会遇到）：Chrome 远程声（Google 普通话）对 >15 s 的 utterance 会中途静音且不触发 onend → 现在 `est*1.6+2000` 的兜底定时器要等 ~50 s 字幕才推进；`warm()`（narration.js:83）紧接着 `say()→stop()→synth.cancel()`，Chrome 里"speak 后立刻 cancel"偶发让后续 speak 无声。建议：兜底时按标点分句逐条 speak；`warm()` 只在 `!hasClips()` 时做。
- **S7. `click` 音效对所有 `<button>` 生效**（main.js:18）：按住类按钮（`.holdbtn`）松手时也"嗒"一声，和 `resolve/sweep` 叠；"继续 ▶"的嗒声正好压在下一句人声的第一个字上。建议 `.holdbtn`、`#nextBtn`、`#replayBtn` 排除，或把 click 音量从 .18 降到 .08。
- **S8. 岛内无法静音**：旁白/音效开关在 HUD 里，`enterIsland` 会 `hud.hidden`，30 s 的旁白中途想关声音只能退出岛。建议 `#stageUI` 也放一个小的 🔊 按钮（复用 `updateMute`）。
- **S9. 抽取脚本脆弱、无回归保护**：`tools/extract_lines.js` 对 `api.say(msg,…)`、`A.text` 用硬编码正则（第 37-38 行甚至要求 `msg = choice === 'dehy' ? … : …` 的精确写法）；将来任何新写法（模板字符串、变量拼接）都会**静默**落回合成器。本次用独立脚本核对：251 条运行时文本 **全部有人声、无跨声线回退、无非 BMP 字符**（`charCodeAt` 与 Python `ord` 对 emoji 等代理对会算出不同哈希——当前文案没有，建议在 hash 旁注释一句"文案里不要用 emoji"）。建议：把附录 A 的脚本放进 `tools/audio_check.js`，`gen_audio.py` 结束后跑一遍；运行时在 `findClip` 未命中时 `console.warn('[Narr] no clip:', text)`。
- **S10. 回首页后环境声/和声垫继续**（`showTitle` 只 `Narr.stop()`）：可接受，但建议 `duck` 到 .15 或淡出，"首页"应有"安静下来"的感觉。
- **S11. `narration.js:50` 的兜底定时器从 `say()` 起算**：http 版在弱网下如果 mp3 加载 >2.5 s 才开播，定时器会在人声还在播时 `fin()` 推进剧情（下一句 `stop()` 再把它掐掉）。WebAudio 路径没有这个问题（定时器在解码后才起）。若按 M6 统一走 WebAudio 即可消除。
- **S12. 小问题**：`main.js:9,51` `guideTimer` 永远没人设置（死代码）；`Narr.hasClips` 未被使用；`stage.js:44` 重听用 700 ms hold、首播 900 ms，不一致；`audio.js:40` 切主题时 `filter.type` 瞬切可能有轻微咔哒（可在切换前把 `wind.g` 压到 0 再回升）。

---

## 三、逐项核查结论（对应任务 1–7）

1. **跳过/打断后旧句是否会继续或重放**
   - `<audio>` 路径：新 `stop()`（narration.js:24-30）先 `playGen++`、置空 handler、`pause()+removeAttribute('src')+load()`。`load()` 会清空媒体元素事件队列并以 AbortError 拒绝挂起的 `play()` promise；`fallback` 检查 `gen !== playGen || cur !== a`，实测点"继续"后 **无 error 事件、无 TTS、无重念**（日志：`Narr.stop → TTS.cancel`，仅此而已）。
   - 兜底定时器：`stop()` 清 `timer`；`fallback→speakTTS` 会覆盖 `timer` 变量，但旧的 `<audio>` 定时器 closure 里 `done` 已为 true，无害。
   - `speechSynthesis` 路径：`synth.cancel()` 后 onend/onerror 有代际守卫；OK。
   - WebAudio 路径（新）：解码回调里检查 `gen`，`stop()` 经 `cur.pause()` 调 `src.stop()`；OK。
   - **漏网**：线上 dist 未重建（M1）；"重听"与 900 ms hold 的竞态（M4）；退出岛时岛内 `setTimeout/Interval` 没清（M7，音效而非旁白）。
2. **两路声音同时朗读**：`Narr.say` 单例 + 入口 `stop()`，正常流程不会双声；`showCards`、`guideSay`、`enterIsland`、`close()` 都先 `stop()`。问题是反方向——**互相掐断**（M3/M4/S4）。`card` 音效与"你收到了…"同时响、`enter` 扫频与第一句开头重叠属设计。
3. **句子→音频覆盖**：251 条运行时文本（41 站 say.kid/reader 82 条；islands*.js 共 84 处 `api.say`，其中 41 处是 `api.txt(island.say)` 已含在前者，其余 41 处三元表达式 ×2 + 乱纪元 6 条 msg ×2 + 童话 3×2 = 100 条；main.js 向导 speak=true 的 61 条；收卡 4 种张数 ×2 = 8 条）**全部命中**，`findClip` 回退顺序未发生"拿错声线"（wrongVoice=0）。manifest 里 11 条用不到的向导音频（nearIsland/walk/speak=false 的句子、单独的 book3.kid）无害。hash 算法两端一致（注意 S9 的非 BMP 提醒）。
4. **自动播放策略**：Chrome（含 Artifact 沙箱 iframe：无 `allow="autoplay"`、featurePolicy autoplay=false）实测点过一次后 `play()` 长期可用；file:// 同样；data: URI 现走 WebAudio 解码，不再依赖 `media-src`。风险在 Safari/iOS 的 http/file 版（M6），以及任何 `NotAllowedError` 都会变成机器声的策略本身。
5. **audio.js**：`env()` 全部用 ≥1e-4 的指数斜坡、频率斜坡无 0/负数/NaN；节点都 `stop()` 且无 JS 引用可被回收；`update()` 不是每帧建节点（ping 2.5–9 s 一次、cricket ≈1.4 次/s、crackle 近篝火 10 次/s 每次 1 个噪声源，可接受）。问题：削波余量（S2）、duck 起音（S3）、suspended 行为（S1）、`setTargetAtTime` 的 glide 2.5–4 s 让和弦换位是 7–10 s 的连续滑音（风格取舍，可略）。
6. **静音/开关持久化**：`sm_mute`（narration.js:4,81）与 `sm_sfx`（audio.js:5,89）读写一致，`updateMute()` 在 `start()` 和两个按钮后刷新，UI 与状态一致；沙箱/ file:// 下 localStorage 异常有 try/catch。缺口：岛内无开关（S8）；`setEnabled(false)` 只关 master，旁白走 `voiceBus` 直连 destination 不受影响（正确）。
7. **其他**：见 S 列表。

---

## 附录 A：覆盖审计脚本（node，放在任意位置运行；建议收进 tools/audio_check.js）

```js
const fs=require('fs'),path=require('path');const root='/Users/shiyunwang/santi-map';
global.window=global;global.SM={};
for(const f of ['data.js','data2.js','data3.js'])new Function(fs.readFileSync(path.join(root,'js',f),'utf8'))();
new Function(fs.readFileSync(path.join(root,'audio','manifest.js'),'utf8'))();const man=SM.AUDIO_MANIFEST;
function hash(s){var v=5381;for(var i=0;i<s.length;i++)v=((v*33)^s.charCodeAt(i))>>>0;return v.toString(16);}
function findClip(text,vk){var h=hash(text.trim());var o=vk==='guide'?['guide','kid','reader']:vk==='kid'?['kid','reader','guide']:['reader','kid','guide'];for(var i=0;i<o.length;i++)if(man[o[i]+'_'+h])return o[i];return null;}
const items=[];const add=(t,v,w)=>items.push({text:String(t),voice:v,where:w});
SM.ISLANDS.forEach(i=>{add(i.say.kid,'kid','data '+i.id);add(i.say.reader,'reader','data '+i.id);});
function extract(src){const out=[];let idx=0;while((idx=src.indexOf('api.say(',idx))>=0){let i=idx+8,d=1,q=null;const s=i;while(i<src.length&&d>0){const c=src[i];if(q){if(c==='\\')i++;else if(c===q)q=null;}else{if(c==="'"||c==='"'||c==='`')q=c;else if(c==='(')d++;else if(c===')')d--;}i++;}out.push({line:src.slice(0,idx).split('\n').length,arg:src.slice(s,i-1)});idx=i;}return out;}
function first(arg){let d=0,q=null,cur='';for(let i=0;i<arg.length;i++){const c=arg[i];if(q){cur+=c;if(c==='\\')cur+=arg[++i];else if(c===q)q=null;continue;}if(c==="'"||c==='"'||c==='`'){q=c;cur+=c;continue;}if('({['.includes(c))d++;if(')}]'.includes(c))d--;if(c===','&&d===0)break;cur+=c;}return cur.trim();}
for(const f of ['islands.js','islands2.js','islands3.js']){const src=fs.readFileSync(path.join(root,'js',f),'utf8');for(const c of extract(src)){const e=first(c.arg),w=f+':'+c.line;
 if(e==='api.txt(api.island.say)')continue;
 if(/^api\.kid\s*\?/.test(e)){const fn=new Function('api','return ('+e+')');add(fn({kid:true}),'kid',w);add(fn({kid:false}),'reader',w);continue;}
 if(e==='msg'){const re=/msg = choice === 'dehy' \? '((?:[^'\\]|\\.)*)' : '((?:[^'\\]|\\.)*)'/g;let m;while((m=re.exec(src)))for(const t of [m[1],m[2]]){add(t,'kid',w);add(t,'reader',w);}continue;}
 if(e==='A.text'){const re=/text:\s*(api\.kid\s*\?\s*'(?:[^'\\]|\\.)*'\s*:\s*'(?:[^'\\]|\\.)*')/g;let m;while((m=re.exec(src))){const fn=new Function('api','return ('+m[1]+')');add(fn({kid:true}),'kid',w);add(fn({kid:false}),'reader',w);}continue;}
 console.log('UNHANDLED api.say shape',w,e);}}
add(SM.GUIDE.intro.kid,'guide','intro');add(SM.GUIDE.intro.reader,'guide','intro');
add('已切换到小学生模式：字少一点，讲慢一点。','guide','mode');add('已切换到读者模式：旁白更完整，每站附"想一想"。','guide','mode');
Object.values(SM.GUIDE.lineChange).forEach(t=>add(t,'guide','lineChange'));
add(SM.GUIDE.book2.kid,'guide','book2');add(SM.GUIDE.book2.reader,'guide','book2');add(SM.GUIDE.book3.reader,'guide','book3');add(SM.GUIDE.book3.kid+' '+SM.GUIDE.kidWarn,'guide','book3+warn');
[SM.GUIDE.end,SM.GUIDE.book2end,SM.GUIDE.book3end].forEach(t=>add(t,'guide','end'));
SM.ISLANDS.forEach((i,k)=>{if(k<SM.ISLANDS.length-1)add('收好了！继续沿河往前走，下一站是"'+SM.ISLANDS[k+1].title+'"。','guide','next');});
new Set(SM.ISLANDS.map(i=>i.cards.length)).forEach(n=>{const t=n>1?'你收到了'+n+'张线索卡。':'你收到了一张线索卡。';add(t,'kid','cards');add(t,'reader','cards');});
let miss=0;for(const it of items){const got=findClip(it.text,it.voice);if(!got){miss++;console.log('MISSING',it.voice,it.where,it.text.slice(0,40));}else if(got!==it.voice)console.log('WRONG VOICE',it.voice,'->',got,it.where);}
console.log('items',items.length,'missing',miss);
```
本次输出：`card counts per island: [2,1,4,3]`、`total items 251 missing 0 wrongVoice 0 nonBMP 0`、`manifest entries 262 unused 11`。

## 附录 B：缓存键碰撞检查（针对 narration.js:69 的键算法，跑在 dist 产物上）

```js
const fs=require('fs');for(const f of ['dist/artifact.html','dist/三体阅读地图.html']){const s=fs.readFileSync(f,'utf8');const man=JSON.parse(s.match(/SM\.AUDIO_MANIFEST = (\{.*?\});\n/s)[1]);const seen={},coll=[];for(const k in man){const u=man[k][0];const key=u.length+':'+u.slice(-64);if(seen[key])coll.push([seen[key],k]);else seen[key]=k;}console.log(f,'collisions',coll.length,coll);}
```
本次输出：artifact 25 对、单文件 24 对（明细见 M2）。

## 附录 C：实测时间线（本地 http 版 + 新 narration.js，Chromium 148）

- 点"继续"打断：`Narr.say → newAudio → play resolved → [点继续] Narr.stop → TTS.cancel`，此后无 error/TTS/重念；`speechSynthesis.speaking=false`，旧 `<audio>.paused=true`。
- 重听竞态：`ended#6 @122978 → Narr.say(重听) @123299 → Narr.stop @123882`（句末 +904 ms 掐断）。
- 首页→继续：同一毫秒 `Narr.say` ×3（开场白 → 汇合提示 → 第三部前言），前两个 `play()` 被 AbortError 取消。
- 跨源 iframe（`sandbox="allow-scripts allow-same-origin allow-forms" allow="fullscreen"`，featurePolicy autoplay=false）：点击一次后，t+7 s、t+12 s 的 `new Audio(data:).play()` 均 resolved。
