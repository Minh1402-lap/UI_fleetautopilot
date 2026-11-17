/* Anime.js 4.5.0 is served locally; native animations provide a fallback. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  function animate(element, frames, options) {
    if (reduced.matches || !element.animate) return;
    const animation = element.animate(frames, options);
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  }
  const seen = new WeakSet();
  function prepareFilters() {
    document.querySelectorAll('#main .filter-bar').forEach(bar => {
      if (!bar.querySelector('.search-field') || bar.querySelector('.filter-toggle')) return;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'secondary filter-toggle';
      button.textContent = 'Thu gọn bộ lọc'; button.setAttribute('aria-expanded', 'true');
      if(matchMedia('(max-width:600px)').matches) {
        bar.classList.add('filters-collapsed');
        button.textContent = 'Mở bộ lọc'; button.setAttribute('aria-expanded', 'false');
      }
      bar.insertBefore(button, bar.children[1] || null);
      const layout = window.anime?.createLayout?.(bar, {children:'.field, .secondary', duration:460, ease:'out(3)', swapAt:{opacity:1}});
      button.addEventListener('click', () => {
        const update = () => {
          const folded = bar.classList.toggle('filters-collapsed');
          button.setAttribute('aria-expanded', String(!folded));
          button.textContent = folded ? 'Mở bộ lọc' : 'Thu gọn bộ lọc';
        };
        if (layout && !reduced.matches && matchMedia('(max-width:600px)').matches) layout.update(update);
        else update();
      });
    });
  }
  function reveal() {
    prepareFilters();
    const blocks = document.querySelectorAll('#main .workspace-head, #main .page-heading, #main .panel, #main .stat');
    let index = 0;
    blocks.forEach(element => {
      if (seen.has(element) || !element.getClientRects().length) return;
      seen.add(element);
      // Page transitions already animate the snapshot; avoid a second animation on each panel.
      if (document.documentElement.dataset.motion) return;
      const rect = element.getBoundingClientRect();
      if (rect.top > innerHeight || rect.bottom < 0) return;
      const delay = Math.min(index++ * 45, 135);
      if(window.anime && !reduced.matches) {
        const a = window.anime.animate(element, {opacity:[.92,1],duration:700,delay,ease:'out(3)',onComplete:() => {a.revert();animations.delete(a);}});
        animations.add(a);
      } else animate(element, [{opacity:.92}, {opacity:1}],
        {duration:700, delay, easing:'cubic-bezier(.22,1,.36,1)'});
    });
  }
  let frame;
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(reveal); };
  new MutationObserver(schedule).observe(document.querySelector('#main'), {childList:true, subtree:true});
  document.addEventListener('pointerdown', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled || !button.closest('#main')) return;
    animate(button, [{scale:1}, {scale:.99}, {scale:1}], {duration:260, easing:'ease-out'});
  });
  reduced.addEventListener('change', () => { if(reduced.matches) animations.forEach(animation => animation.cancel()); });
  schedule();
})();
