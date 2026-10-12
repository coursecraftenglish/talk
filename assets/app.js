(function(){
  var T=window.TOPIC, B=window.BASE||"";
  var slow=false, el=null, playing=null;
  function wid(i){return "w"+String(i+1).padStart(2,"0");}
  function au(id){return B+"a/"+T.slug+"/"+id+(slow?"_slow":"")+".mp3";}
  function pic(i){return B+"a/"+T.slug+"/"+wid(i)+".webp";}
  function mark(id,on){document.querySelectorAll('[data-say="'+id+'"]').forEach(function(n){n.classList.toggle("playing",on);});}
  function say(id){
    if(playing)mark(playing,false);
    playing=id;mark(id,true);
    if(!el)el=new Audio();
    el.pause();el.src=au(id);
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
  // listen and circle
  var L=document.getElementById("listenrows"),score=document.getElementById("score"),ans={};
  function upd(){var n=0,c=0;for(var r in ans){n++;if(T.listen[r].target===ans[r])c++;}score.textContent=n?c+" of "+T.listen.length+" correct":"";}
  var spk='<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke="none"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  T.listen.forEach(function(row,r){
    var sb=h("button",{type:"button","class":"td-spk","aria-label":"Play item "+(r+1)});sb.innerHTML=spk;sb.addEventListener("click",function(){say(wid(row.target));});
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
  // projector
  var ov=document.getElementById("proj"),pi=0;
  function show(i){pi=(i+T.words.length)%T.words.length;ov.querySelector("img").src=pic(pi);ov.querySelector(".td-big").textContent=T.words[pi];ov.querySelector(".td-count").textContent=(pi+1)+" / "+T.words.length;ov.querySelector(".td-card").setAttribute("data-say",wid(pi));say(wid(pi));}
  function key(e){if(e.key==="ArrowRight")show(pi+1);else if(e.key==="ArrowLeft")show(pi-1);else if(e.key===" "){e.preventDefault();say(wid(pi));}else if(e.key==="Escape")close();}
  function open(){ov.hidden=false;document.addEventListener("keydown",key);show(0);}
  function close(){ov.hidden=true;document.removeEventListener("keydown",key);if(el)el.pause();}
  document.getElementById("projbtn").addEventListener("click",open);
  ov.querySelector(".td-close").addEventListener("click",close);
  ov.querySelector(".td-card").addEventListener("click",function(){say(wid(pi));});
  ov.querySelector("[data-prev]").addEventListener("click",function(){show(pi-1);});
  ov.querySelector("[data-next]").addEventListener("click",function(){show(pi+1);});
})();
