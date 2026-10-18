(function(){
  var T=window.TOPIC,B=window.BASE||"";
  var slow=false,el=null,playing=null,showEn=true,seqTimer=null;
  var VOICES=["marisol","leo"],voice=T.voice||"marisol";
  try{var sv=localStorage.getItem("es-voice");if(VOICES.indexOf(sv)>=0)voice=sv;}catch(e){}
  function other(){return voice==="marisol"?"leo":"marisol";}
  function pad(i){return String(i+1).padStart(2,"0");}
  function au(id,v){return B+"a/"+T.slug+"/"+(v||voice)+"/"+id+(slow?"_slow":"")+".mp3";}
  function pic(i){return B+"a/"+T.slug+"/w"+pad(i)+".webp";}
  function scn(i){return B+"a/"+T.slug+"/s"+(i+1)+".webp";}
  function mark(id,on){document.querySelectorAll('[data-say="'+id+'"]').forEach(function(n){n.classList.toggle("playing",on);});}
  function say(id,cb,v){
    if(playing)mark(playing,false);
    playing=id;mark(id,true);
    if(!el)el=new Audio();
    el.pause();el.src=au(id,v);
    el.onended=function(){mark(id,false);if(playing===id)playing=null;if(cb)cb();};
    el.play().catch(function(){mark(id,false);});
  }
  function h(tag,attrs,kids){var n=document.createElement(tag);for(var k in attrs||{}){if(k==="text")n.textContent=attrs[k];else n.setAttribute(k,attrs[k]);}(kids||[]).forEach(function(c){n.appendChild(c);});return n;}
  var spk='<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke="none"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  function en(t){return h("span",{"class":"es-en",text:t});}
  function setVoice(v){voice=v;try{localStorage.setItem("es-voice",v);}catch(e){}document.querySelectorAll("[data-voice]").forEach(function(x){x.setAttribute("aria-pressed",String(x.getAttribute("data-voice")===v));});}
  document.querySelectorAll("[data-voice]").forEach(function(b){b.addEventListener("click",function(){setVoice(b.getAttribute("data-voice"));});});
  setVoice(voice);
  // speed + english toggle
  document.querySelectorAll("[data-speed]").forEach(function(b){b.addEventListener("click",function(){slow=b.getAttribute("data-speed")==="slow";document.querySelectorAll("[data-speed]").forEach(function(x){x.setAttribute("aria-pressed",String(x===b));});});});
  var enb=document.getElementById("enbtn");
  if(enb)enb.addEventListener("click",function(){showEn=!showEn;enb.setAttribute("aria-pressed",String(showEn));document.body.classList.toggle("es-hide-en",!showEn);});
  // words
  var grid=document.getElementById("grid");
  if(grid)T.words.forEach(function(w,i){
    var id="w"+pad(i);
    var kids=[h("span",{"class":"td-num",text:String(i+1)}),h("img",{src:pic(i),alt:"",width:"360",height:"360",loading:"lazy"}),h("span",{"class":"td-word",text:w[0]}),en(w[1])];
    if(w[2])kids.push(h("span",{"class":"es-note",text:w[2]}));
    var b=h("button",{type:"button","class":"td-tile","data-say":id,"aria-label":"Hear: "+w[0]},kids);
    b.addEventListener("click",function(){say(id);});grid.appendChild(b);
  });
  // phrases
  var sb=document.getElementById("say");
  if(sb)T.phrases.forEach(function(p,j){
    var id="p"+(j+1);
    var b=h("button",{type:"button","class":"td-phrase es-phrase","data-say":id},[h("span",{"class":"es-spk",html:""}),h("span",{"class":"es-ptxt"},[h("b",{text:p[0]}),en(p[1])])]);
    b.firstChild.innerHTML=spk;
    b.addEventListener("click",function(){say(id);});sb.appendChild(b);
  });
  // picture phrases (Start Here): colored picture per phrase, tap to hear
  var pgd=document.getElementById("pgrid");
  if(pgd)T.phrases.forEach(function(p,j){
    var id="p"+(j+1);
    var b=h("button",{type:"button","class":"td-tile","data-say":id,"aria-label":"Hear: "+p[0]},[h("span",{"class":"td-num",text:String(j+1)}),h("img",{src:window.BASE+"a/"+T.slug+"/c"+(j+1)+".webp",alt:"",width:"360",height:"360",loading:"lazy"}),h("span",{"class":"td-word",text:p[0]}),en(p[1])]);
    b.addEventListener("click",function(){say(id);});pgd.appendChild(b);
  });
  // tale
  var tg=document.getElementById("tale");
  function playTale(i){ if(i>=T.sentences.length)return; say("s"+(i+1),function(){seqTimer=setTimeout(function(){playTale(i+1);},500);}); }
  if(tg){
    T.sentences.forEach(function(s,i){
      var id="s"+(i+1);
      var b=h("button",{type:"button","class":"td-tile es-scene","data-say":id,"aria-label":"Hear sentence "+(i+1)},[h("span",{"class":"td-num",text:String(i+1)}),h("img",{src:scn(i),alt:"",loading:"lazy"}),h("span",{"class":"es-sent",text:s})]);
      b.addEventListener("click",function(){clearTimeout(seqTimer);say(id);});tg.appendChild(b);
    });
    var pa=document.getElementById("playall");
    if(pa)pa.addEventListener("click",function(){clearTimeout(seqTimer);playTale(0);});
    var sw=document.getElementById("storywords");
    T.story.forEach(function(s,i){
      var id="v"+(i+1);
      var b=h("button",{type:"button","class":"td-phrase es-chip","data-say":id},[h("b",{text:s[0]}),en(s[1])]);
      b.addEventListener("click",function(){say(id);});sw.appendChild(b);
    });
  }
  // listen and circle (deterministic)
  var L=document.getElementById("listenrows");
  if(L){
    var seed=T.n*7919;function rnd(){seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;}
    var N=T.words.length,rows=[];
    for(var r=0;r<6;r++){var t=Math.floor(rnd()*N),o=[t];while(o.length<3){var x=Math.floor(rnd()*N);if(o.indexOf(x)<0)o.push(x);}
      for(var q=o.length-1;q>0;q--){var j=Math.floor(rnd()*(q+1));var tmp=o[q];o[q]=o[j];o[j]=tmp;}
      rows.push({target:t,options:o});}
    var ans={},score=document.getElementById("score");
    function upd(){var n=0,c=0;for(var r in ans){n++;if(rows[r].target===ans[r])c++;}score.textContent=n?c+" of "+rows.length+" correct":"";}
    rows.forEach(function(row,r){
      var sbn=h("button",{type:"button","class":"td-spk","aria-label":"Play item "+(r+1)});sbn.innerHTML=spk;sbn.addEventListener("click",function(){say("w"+pad(row.target),null,other());});
      var opts=h("div",{"class":"td-opts"});
      row.options.forEach(function(o){
        var ob=h("button",{type:"button","class":"td-opt","aria-label":"Choose picture"},[h("img",{src:pic(o),alt:"",width:"120",height:"120",loading:"lazy"})]);
        ob.addEventListener("click",function(){
          opts.querySelectorAll(".td-opt").forEach(function(x){x.classList.remove("right","wrong");var m=x.querySelector(".td-mark");if(m)m.remove();});
          var ok=o===row.target;ob.classList.add(ok?"right":"wrong");
          var m=h("span",{"class":"td-mark",text:ok?"✓":"✗"});m.style.background=ok?"#2E9E5B":"#D9534F";ob.appendChild(m);
          ans[r]=o;upd();});
        opts.appendChild(ob);});
      L.appendChild(h("div",{"class":"td-row"},[h("div",{"class":"td-rowhead"},[h("span",{"class":"td-rownum",text:String(r+1)}),sbn]),opts]));
    });
    window.__rows=rows;
  }
  // projector: every section
  var ov=document.getElementById("proj"),mode="words",pi=0,pans={};
  var LR=(typeof rows!=="undefined"&&rows)?rows:[];
  var MODES=[["words","Words",T.words.length],["say","Say it!",T.phrases.length],["tale","Folk tale",T.sentences.length],["story","Story words",T.story.length],["listen","Listen and Circle",LR.length]].filter(function(m){return m[2]>0;});
  var tabs=h("div",{"class":"td-ptabs",role:"tablist"});
  MODES.forEach(function(m){var t=h("button",{type:"button","class":"td-ptab","data-mode":m[0],role:"tab",text:m[1]});t.addEventListener("click",function(){go(m[0],0);});tabs.appendChild(t);});
  var stage=h("div",{"class":"td-stage"});
  var prev=h("button",{type:"button","class":"td-arrow","aria-label":"Previous",text:"‹"}),next=h("button",{type:"button","class":"td-arrow","aria-label":"Next",text:"›"}),cnt=h("span",{"class":"td-count"});
  var closeB=h("button",{type:"button","class":"td-close",text:"Close"});
  ov.innerHTML="";ov.appendChild(closeB);ov.appendChild(tabs);ov.appendChild(stage);ov.appendChild(h("div",{"class":"td-nav"},[prev,cnt,next]));
  function n(){for(var k=0;k<MODES.length;k++)if(MODES[k][0]===mode)return MODES[k][2];return 1;}
  function play(){
    if(mode==="words")say("w"+pad(pi));else if(mode==="say")say("p"+(pi+1));else if(mode==="tale")say("s"+(pi+1));
    else if(mode==="story")say("v"+(pi+1));else say("w"+pad(LR[pi].target),null,other());
  }
  function mk(ob,ok){ob.classList.add(ok?"right":"wrong");var m=h("span",{"class":"td-mark",text:ok?"✓":"✗"});m.style.background=ok?"#2E9E5B":"#D9534F";ob.appendChild(m);}
  function pscore(){var e=document.getElementById("pscore");if(!e)return;var a=0,c=0;for(var r in pans){a++;if(LR[r].target===pans[r])c++;}e.textContent=a?c+" of "+LR.length+" correct":"Tap the speaker. Then tap the picture you hear.";}
  function draw(){
    stage.innerHTML="";cnt.textContent=(pi+1)+" / "+n();
    tabs.querySelectorAll(".td-ptab").forEach(function(t){t.setAttribute("aria-selected",String(t.getAttribute("data-mode")===mode));});
    var c;
    if(mode==="words"){c=h("button",{type:"button","class":"td-card","data-say":"w"+pad(pi)},[h("img",{src:pic(pi),alt:""}),h("span",{"class":"td-big",text:T.words[pi][0]}),h("span",{"class":"es-pen",text:T.words[pi][1]})]);}
    else if(mode==="say"){c=h("button",{type:"button","class":"td-card td-pcard","data-say":"p"+(pi+1)},(T.phimg?[h("img",{src:window.BASE+"a/"+T.slug+"/c"+(pi+1)+".webp",alt:""})]:[]).concat([h("span",{"class":"td-pbig",text:T.phrases[pi][0]}),h("span",{"class":"es-pen",text:T.phrases[pi][1]}),h("span",{"class":"td-ptip",text:"Listen. Then say it together."})]));}
    else if(mode==="tale"){c=h("button",{type:"button","class":"td-card","data-say":"s"+(pi+1)},[h("img",{src:scn(pi),alt:""}),h("span",{"class":"td-pbig",text:T.sentences[pi]})]);}
    else if(mode==="story"){c=h("button",{type:"button","class":"td-card td-pcard","data-say":"v"+(pi+1)},[h("span",{"class":"td-big",text:T.story[pi][0]}),h("span",{"class":"es-pen",text:T.story[pi][1]})]);}
    else{
      var row=LR[pi];
      var sp=h("button",{type:"button","class":"td-pspk","aria-label":"Play"});sp.innerHTML=spk;sp.addEventListener("click",play);
      var opts=h("div",{"class":"td-popts"});
      row.options.forEach(function(o){
        var ob=h("button",{type:"button","class":"td-opt td-popt"},[h("img",{src:pic(o),alt:""})]);
        if(pans[pi]===o)mk(ob,o===row.target);
        ob.addEventListener("click",function(){opts.querySelectorAll(".td-popt").forEach(function(x){x.classList.remove("right","wrong");var m=x.querySelector(".td-mark");if(m)m.remove();});pans[pi]=o;mk(ob,o===row.target);pscore();});
        opts.appendChild(ob);
      });
      stage.appendChild(h("div",{"class":"td-plisten"},[h("div",{"class":"td-prow"},[h("span",{"class":"td-rownum td-pnum",text:String(pi+1)}),sp]),opts,h("p",{"class":"td-pscore",id:"pscore"})]));
      pscore();return;
    }
    c.addEventListener("click",play);stage.appendChild(c);
  }
  function go(m,i){mode=m;pi=(i+n())%n();draw();play();}
  function key(e){if(e.key==="ArrowRight")go(mode,pi+1);else if(e.key==="ArrowLeft")go(mode,pi-1);else if(e.key===" "){e.preventDefault();play();}else if(e.key==="Escape")close();}
  function open(m){ov.hidden=false;document.addEventListener("keydown",key);go(m||MODES[0][0],0);}
  function close(){ov.hidden=true;document.removeEventListener("keydown",key);if(el)el.pause();}
  prev.addEventListener("click",function(){go(mode,pi-1);});next.addEventListener("click",function(){go(mode,pi+1);});closeB.addEventListener("click",close);
  var pb=document.getElementById("projbtn");if(pb)pb.addEventListener("click",function(){open(MODES[0][0]);});
  // a projector button on each section heading
  [["Say it","say"],["Folk tale","tale"],["Listen and circle","listen"]].forEach(function(x){
    var sec=document.querySelector('section[aria-label="'+x[0]+'"]');if(!sec)return;
    if(!MODES.some(function(m){return m[0]===x[1];}))return;
    var b=h("button",{type:"button","class":"td-proj td-proj-sm"});b.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>Projector';
    b.addEventListener("click",function(){open(x[1]);});
    var row=sec.querySelector(".td-h2row");
    if(!row){var h2=sec.querySelector(".td-h2");row=h("div",{"class":"td-h2row"});h2.parentNode.insertBefore(row,h2);row.appendChild(h2);}
    row.appendChild(b);
  });
  var sw2=document.getElementById("storywords");
  if(sw2&&MODES.some(function(m){return m[0]==="story";})){var sb2=h("button",{type:"button","class":"td-proj td-proj-sm"});sb2.textContent="Projector";sb2.addEventListener("click",function(){open("story");});var h3=sw2.previousElementSibling;if(h3){var r3=h("div",{"class":"td-h2row"});h3.parentNode.insertBefore(r3,h3);r3.appendChild(h3);r3.appendChild(sb2);}}
  window.__ES={go:go,open:open,MODES:MODES};
})();
