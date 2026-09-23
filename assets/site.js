(() => {
  const links = document.querySelectorAll('.action');
  const state = {};

  const propositionMap = {
    private_current: {
      propositions: ['RTB-2026-RENT-CAP-001','RTB-2026-RENT-RESET-002','RTB-2026-APARTMENT-003'],
      evidence: ['EVID-RTB-2026-001'],
      route: 'VERIFIED_SEED_FACTS'
    },
    private_historical: {
      propositions: [],
      evidence: [],
      route: 'HISTORICAL_RESEARCH_REQUIRED'
    }
  };

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

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const d = new Date(value + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === value;
  }

  function classify() {
    const type=(state.tenancy_type||'').toLowerCase();
    if (!state.tenancy_type) return {status:'FACT_REQUIRED',message:'Tell us what type of tenancy this is before applying the rent-review rules.'};
    if (!state.tenancy_start || !state.review_date) return {status:'FACT_REQUIRED',message:'The tenancy start date and proposed review date are still required.'};
    if (!validDate(state.tenancy_start) || !validDate(state.review_date)) return {status:'FACT_REQUIRED',message:'Please provide both dates in YYYY-MM-DD format.'};
    if (state.review_date < state.tenancy_start) return {status:'FACT_REQUIRED',message:'The proposed review date cannot be earlier than the tenancy start date.'};
    if (type.includes('private')) return {status:'PRIVATE_PATH',message:'Private-tenancy pathway selected. Time classification can now distinguish the tenancy start period from the review-date period.'};
    if (type.includes('student')) return {status:'SPECIAL_PATH',message:'Student Specific Accommodation selected. Do not automatically apply the ordinary private-tenancy pathway.'};
    if (type.includes('cost')) return {status:'SPECIAL_PATH',message:'Cost Rental selected. Route to the cost-rental rules rather than automatically applying the private-tenancy proposition.'};
    if (type.includes('approved') || type.includes('ahb')) return {status:'SPECIAL_PATH',message:'Approved Housing Body tenancy selected. Route to the applicable AHB rules.'};
    if (type.includes('local')) return {status:'SPECIAL_PATH',message:'Local-authority housing selected. Route to the applicable local-authority framework.'};
    return {status:'FACT_REQUIRED',message:'The arrangement could not yet be classified. More information is required.'};
  }

  function temporalState() {
    if (!validDate(state.tenancy_start) || !validDate(state.review_date)) return null;
    return {
      tenancyGeneration: state.tenancy_start < '2026-03-01' ? 'BEFORE_2026_FRAMEWORK' : 'FROM_2026_FRAMEWORK',
      reviewPeriod: state.review_date < '2026-03-01' ? 'BEFORE_2026_FRAMEWORK' : 'FROM_2026_FRAMEWORK',
      commencementCheck: state.review_date >= '2026-03-01'
    };
  }

  function resolvePropositions(result,time) {
    if (result.status !== 'PRIVATE_PATH' || !time) return null;
    if (time.reviewPeriod === 'BEFORE_2026_FRAMEWORK') return propositionMap.private_historical;
    return propositionMap.private_current;
  }

  function renderDecision() {
    const box=document.getElementById('pathway-decision');
    if(!box) return;
    const result=classify();
    const time=temporalState();
    box.hidden=false;
    let html='<div class="kicker">Current pathway state</div><strong>'+escapeHtml(result.status)+'</strong><p>'+escapeHtml(result.message)+'</p>';
    if(time && result.status === 'PRIVATE_PATH'){
      const mapping=resolvePropositions(result,time);
      html+='<div class="decision-facts"><div><span>Tenancy generation</span><strong>'+escapeHtml(time.tenancyGeneration)+'</strong></div><div><span>Review period</span><strong>'+escapeHtml(time.reviewPeriod)+'</strong></div><div><span>Commencement check</span><strong>'+escapeHtml(time.commencementCheck ? 'REQUIRED' : 'NOT YET REQUIRED')+'</strong></div></div>';
      html+='<div class="decision-evidence"><div class="kicker">Candidate legal propositions</div><p>'+escapeHtml(mapping.propositions.length ? mapping.propositions.join(' · ') : 'None loaded for this historical branch.')+'</p><div class="kicker">Evidence chain</div><p>'+escapeHtml(mapping.evidence.length ? mapping.evidence.join(' · ') : 'Historical evidence required.')+'</p><div class="kicker">Publication state</div><p>'+escapeHtml(mapping.route)+'</p></div>';
    }
    box.innerHTML=html;
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