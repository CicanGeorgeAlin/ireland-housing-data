(() => {
  const links = document.querySelectorAll('.action');
  const state = {};

  links.forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const topic = link.textContent.trim();
    const target = topic.toLowerCase() === 'rent'
      ? document.getElementById('rent-pathway')
      : document.getElementById('topics');
    if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
    window.dispatchEvent(new CustomEvent('housing-path-selected',{detail:{topic}}));
  }));

  document.querySelectorAll('.pathway-btn').forEach(button => {
    button.addEventListener('click', () => {
      const key = button.dataset.next;
      const value = window.prompt(
        key === 'tenancy_type' ? 'What type of tenancy is it?' :
        key === 'tenancy_start' ? 'When did the tenancy begin? (YYYY-MM-DD)' :
        key === 'review_date' ? 'When is the proposed rent review? (YYYY-MM-DD)' :
        'Did construction of the new apartment commence after 10 June 2025? (Yes / No / Not sure)'
      );
      if (value === null || !value.trim()) return;
      state[key] = value.trim();
      renderState();
    });
  });

  function renderState() {
    const box = document.getElementById('pathway-state');
    if (!box) return;
    const entries = Object.entries(state);
    box.innerHTML = entries.length
      ? entries.map(([key,value]) => '<div><span>'+label(key)+'</span><strong>'+escapeHtml(value)+'</strong></div>').join('')
      : '<div>No facts entered yet.</div>';
    box.hidden = false;
  }

  function label(key) {
    return ({
      tenancy_type:'Tenancy type',
      tenancy_start:'Tenancy start',
      review_date:'Review date',
      new_apartment:'New-apartment construction test'
    })[key] || key;
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
})();