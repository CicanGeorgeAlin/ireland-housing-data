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
      renderDecision();
    });
  });

  function classify() {
    const type=(state.tenancy_type||'').toLowerCase();
    if (!state.tenancy_type) return {status:'FACT_REQUIRED',message:'Tell us what type of tenancy this is before applying the rent-review rules.'};
    if (!state.tenancy_start || !state.review_date) return {status:'FACT_REQUIRED',message:'The tenancy start date and proposed review date are still required.'};
    if (type.includes('private')) return {status:'PRIVATE_PATH',message:'Private-tenancy pathway selected. The applicable legal generation and exceptions still need to be resolved.'};
    if (type.includes('student')) return {status:'SPECIAL_PATH',message:'Student Specific Accommodation selected. Do not automatically apply the ordinary private-tenancy pathway.'};
    if (type.includes('cost')) return {status:'SPECIAL_PATH',message:'Cost Rental selected. Route to the cost-rental rules rather than automatically applying the private-tenancy proposition.'};
    if (type.includes('approved') || type.includes('ahb')) return {status:'SPECIAL_PATH',message:'Approved Housing Body tenancy selected. Route to the applicable AHB rules.'};
    if (type.includes('local')) return {status:'SPECIAL_PATH',message:'Local-authority housing selected. Route to the applicable local-authority framework.'};
    return {status:'FACT_REQUIRED',message:'The arrangement could not yet be classified. More information is required.'};
  }

  function renderDecision() {
    const box=document.getElementById('pathway-decision');
    if(!box) return;
    const result=classify();
    box.hidden=false;
    box.innerHTML='<div class="kicker">Current pathway state</div><strong>'+escapeHtml(result.status)+'</strong><p>'+escapeHtml(result.message)+'</p>';
  }

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
    return ({tenancy_type:'Tenancy type',tenancy_start:'Tenancy start',review_date:'Review date',new_apartment:'New-apartment construction test'})[key] || key;
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
})();