(function(){
  var head=document.querySelector('header.td-head'); if(!head) return;
  var ctl=head.querySelector('.td-controls'); if(!ctl) return;
  var bar=document.createElement('div'); bar.className='td-bar'; bar.setAttribute('role','toolbar'); bar.setAttribute('aria-label','Controls');
  head.insertAdjacentElement('afterend',bar); bar.appendChild(ctl); // moves node: listeners stay
  var wrap=head.parentNode, secs=[], lab={'Words':'Words','Say it':'Say it','Folk tale':'Tale','Listen and circle':'Listen','Listen':'Listen','Questions':'Questions','Story':'Story','Steps':'Steps'};
  [].forEach.call(wrap.querySelectorAll('section[aria-label]'),function(s,i){
    var l=s.getAttribute('aria-label'); if(!lab[l]) return;
    if(!s.id) s.id='sec-'+i; secs.push([s,lab[l]]);
  });
  if(secs.length<2) return;
  var nav=document.createElement('nav'); nav.className='td-jump'; nav.setAttribute('aria-label','Jump to section');
  var links=secs.map(function(p){var a=document.createElement('a');a.href='#'+p[0].id;a.textContent=p[1];nav.appendChild(a);
    a.addEventListener('click',function(e){e.preventDefault();var h=bar.getBoundingClientRect().height;var y=p[0].getBoundingClientRect().top+window.pageYOffset-h-20;window.scrollTo({top:y,behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});});
    return a;});
  bar.appendChild(nav);
  function upd(){var h=bar.getBoundingClientRect().height+30,cur=0;
    secs.forEach(function(p,i){if(p[0].getBoundingClientRect().top<=h+10) cur=i;});
    if(window.innerHeight+window.pageYOffset>=document.documentElement.scrollHeight-4) cur=secs.length-1;
    links.forEach(function(a,i){a.classList.toggle('on',i===cur);});}
  var t;window.addEventListener('scroll',function(){cancelAnimationFrame(t);t=requestAnimationFrame(upd);},{passive:true});
  window.addEventListener('resize',upd); upd();
})();
