(function(){
  var T=window.TOPIC, B=window.BASE||"";
  var slow=false, el=null, playing=null;
  var VOICES=["gia","mark"], voice=T.voice||"gia";
  try{var sv=localStorage.getItem("tpd-voice");if(VOICES.indexOf(sv)>=0)voice=sv;}catch(e){}
  function other(){return voice==="gia"?"mark":"gia";}
  function wid(i){return "w"+String(i+1).padStart(2,"0");}
  function au(id,v){return B+"a/"+T.slug+"/"+(v||voice)+"/"+id+(slow?"_slow":"")+".mp3";}
  function pic(i){return B+"a/"+T.slug+"/"+wid(i)+".webp";}
  function mark(id,on){document.querySelectorAll('[data-say="'+id+'"]').forEach(function(n){n.classList.toggle("playing",on);});}
  function say(id,v){
    if(playing)mark(playing,false);
    playing=id;mark(id,true);
    if(!el)el=new Audio();
    el.pause();el.src=au(id,v);
    el.onended=function(){mark(id,false);if(playing===id)playing=null;};
    el.play().catch(function(){mark(id,false);});
  }
  function h(tag,attrs,kids){var n=document.createElement(tag);for(var k in attrs||{}){if(k==="text")n.textContent=attrs[k];else n.setAttribute(k,attrs[k]);}(kids||[]).forEach(function(c){n.appendChild(c);});return n;}
  // grid
  var grid=document.getElementById("grid");
  T.words.forEach(function(w,i){
    var b=h("button",{type:"button","class":"td-tile","data-say":wid(i),"aria-label":"Hear: "+w},[h("span",{"class":"td-num",text:String(i+1)}),h("img",{src:pic(i),alt:"",width:"360",height:"360",loading:"lazy"}),h("span",{"class":"td-word",text:w})]);
    b.addEventListener("click",function(){say(wid(i));});grid.appendChild(b);
  });
  // phrases
  var sayBox=document.getElementById("say");
  T.phrases.forEach(function(p,j){
    var id="p"+(j+1);
    var b=h("button",{type:"button","class":"td-phrase","data-say":id},[h("img",{src:B+"a/cast/"+T.phraseCast[j]+".webp",alt:"",width:"52",height:"52"}),h("span",{text:p})]);
    b.addEventListener("click",function(){say(id);});sayBox.appendChild(b);
  });
  // speed
  document.querySelectorAll("[data-speed]").forEach(function(b){
    b.addEventListener("click",function(){slow=b.getAttribute("data-speed")==="slow";document.querySelectorAll("[data-speed]").forEach(function(x){x.setAttribute("aria-pressed",String(x===b));});});
  });
  // voice
  function setVoice(v){voice=v;try{localStorage.setItem("tpd-voice",v);}catch(e){}document.querySelectorAll("[data-voice]").forEach(function(x){x.setAttribute("aria-pressed",String(x.getAttribute("data-voice")===v));});}
  document.querySelectorAll("[data-voice]").forEach(function(b){b.addEventListener("click",function(){setVoice(b.getAttribute("data-voice"));});});
  setVoice(voice);
  // listen and circle
  var L=document.getElementById("listenrows"),score=document.getElementById("score"),ans={};
  function upd(){var n=0,c=0;for(var r in ans){n++;if(T.listen[r].target===ans[r])c++;}score.textContent=n?c+" of "+T.listen.length+" correct":"";}
  var spk='<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke="none"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  T.listen.forEach(function(row,r){
    var sb=h("button",{type:"button","class":"td-spk","aria-label":"Play item "+(r+1)});sb.innerHTML=spk;sb.addEventListener("click",function(){say(wid(row.target),other());});
    var opts=h("div",{"class":"td-opts"});
    row.options.forEach(function(o){
      var ob=h("button",{type:"button","class":"td-opt","aria-label":"Choose picture "+(o+1)},[h("img",{src:pic(o),alt:"",width:"120",height:"120",loading:"lazy"})]);
      ob.addEventListener("click",function(){
        opts.querySelectorAll(".td-opt").forEach(function(x){x.classList.remove("right","wrong");var m=x.querySelector(".td-mark");if(m)m.remove();});
        var ok=o===row.target;ob.classList.add(ok?"right":"wrong");
        var m=h("span",{"class":"td-mark",text:ok?"✓":"✗"});m.style.background=ok?"#2E9E5B":"#D9534F";ob.appendChild(m);
        ans[r]=o;upd();
      });
      opts.appendChild(ob);
    });
    L.appendChild(h("div",{"class":"td-row"},[h("div",{"class":"td-rowhead"},[h("span",{"class":"td-rownum",text:String(r+1)}),sb]),opts]));
  });
  // projector: Words, Say it! and Listen and Circle
  var ov=document.getElementById("proj"),mode="words",pi=0,pans={};
  var MODES=[["words","Words",T.words.length],["say","Say it!",T.phrases.length],["listen","Listen and Circle",T.listen.length]].filter(function(m){return m[2]>0;});
  ov.innerHTML="";
  var tabs=h("div",{"class":"td-ptabs",role:"tablist"});
  MODES.forEach(function(m){var t=h("button",{type:"button","class":"td-ptab","data-mode":m[0],role:"tab",text:m[1]});t.addEventListener("click",function(){go(m[0],0);});tabs.appendChild(t);});
  var stage=h("div",{"class":"td-stage"});
  var prev=h("button",{type:"button","class":"td-arrow","aria-label":"Previous",text:"‹"}),next=h("button",{type:"button","class":"td-arrow","aria-label":"Next",text:"›"}),cnt=h("span",{"class":"td-count"});
  var closeB=h("button",{type:"button","class":"td-close",text:"Close"});
  ov.appendChild(closeB);ov.appendChild(tabs);ov.appendChild(stage);ov.appendChild(h("div",{"class":"td-nav"},[prev,cnt,next]));
  function n(){for(var k=0;k<MODES.length;k++)if(MODES[k][0]===mode)return MODES[k][2];return 1;}
  function play(){if(mode==="words")say(wid(pi));else if(mode==="say")say("p"+(pi+1));else say(wid(T.listen[pi].target),other());}
  function draw(){
    stage.innerHTML="";cnt.textContent=(pi+1)+" / "+n();
    tabs.querySelectorAll(".td-ptab").forEach(function(t){t.setAttribute("aria-selected",String(t.getAttribute("data-mode")===mode));});
    if(mode==="words"){
      var c=h("button",{type:"button","class":"td-card","data-say":wid(pi)},[h("img",{src:pic(pi),alt:""}),h("span",{"class":"td-big",text:T.words[pi]})]);
      c.addEventListener("click",play);stage.appendChild(c);
    }else if(mode==="say"){
      var id="p"+(pi+1);
      var c2=h("button",{type:"button","class":"td-card td-pcard","data-say":id},[h("img",{src:B+"a/cast/"+T.phraseCast[pi]+".webp",alt:""}),h("span",{"class":"td-pbig",text:T.phrases[pi]}),h("span",{"class":"td-ptip",text:"Listen. Then say it together."})]);
      c2.addEventListener("click",play);stage.appendChild(c2);
    }else{
      var row=T.listen[pi];
      var sp=h("button",{type:"button","class":"td-pspk","aria-label":"Play"});sp.innerHTML=spk;sp.addEventListener("click",play);
      var opts=h("div",{"class":"td-popts"});
      row.options.forEach(function(o){
        var ob=h("button",{type:"button","class":"td-opt td-popt"},[h("img",{src:pic(o),alt:""})]);
        if(pans[pi]===o)mk(ob,o===row.target);
        ob.addEventListener("click",function(){opts.querySelectorAll(".td-popt").forEach(function(x){x.classList.remove("right","wrong");var m=x.querySelector(".td-mark");if(m)m.remove();});pans[pi]=o;mk(ob,o===row.target);pscore();});
        opts.appendChild(ob);
      });
      stage.appendChild(h("div",{"class":"td-plisten"},[h("div",{"class":"td-prow"},[h("span",{"class":"td-rownum td-pnum",text:String(pi+1)}),sp]),opts,h("p",{"class":"td-pscore",id:"pscore"})]));
      pscore();
    }
  }
  function mk(ob,ok){ob.classList.add(ok?"right":"wrong");var m=h("span",{"class":"td-mark",text:ok?"✓":"✗"});m.style.background=ok?"#2E9E5B":"#D9534F";ob.appendChild(m);}
  function pscore(){var e=document.getElementById("pscore");if(!e)return;var a=0,c=0;for(var r in pans){a++;if(T.listen[r].target===pans[r])c++;}e.textContent=a?c+" of "+T.listen.length+" correct":"Tap the speaker. Then tap the picture you hear.";}
  function go(m,i){mode=m;pi=(i+n())%n();draw();play();}
  function key(e){if(e.key==="ArrowRight")go(mode,pi+1);else if(e.key==="ArrowLeft")go(mode,pi-1);else if(e.key===" "){e.preventDefault();play();}else if(e.key==="Escape")close();}
  function open(m){ov.hidden=false;document.addEventListener("keydown",key);go(m||"words",0);}
  function close(){ov.hidden=true;document.removeEventListener("keydown",key);if(el)el.pause();}
  prev.addEventListener("click",function(){go(mode,pi-1);});next.addEventListener("click",function(){go(mode,pi+1);});closeB.addEventListener("click",close);
  document.getElementById("projbtn").addEventListener("click",function(){open("words");});
  // a projector button on each section
  [["Say it","say"],["Listen and circle","listen"]].forEach(function(x){
    var sec=document.querySelector('section[aria-label="'+x[0]+'"]');if(!sec)return;var h2=sec.querySelector(".td-h2");if(!h2)return;
    var b=h("button",{type:"button","class":"td-proj td-proj-sm"});b.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>Projector';
    b.addEventListener("click",function(){open(x[1]);});
    var wrap=h("div",{"class":"td-h2row"});h2.parentNode.insertBefore(wrap,h2);wrap.appendChild(h2);wrap.appendChild(b);
  });
})();
