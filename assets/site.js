(() => {
  const links = document.querySelectorAll('.action');
  const state = {};
  const evidenceState = {};

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
      renderLegalJourney();
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

  function renderEvidenceGate() {
    if (!(state.new_apartment || '').toLowerCase().includes('yes')) return '';
    const required = ['e0','e1','e2','e3','e5'];
    const blocked = required.some(key => !['EXTRACTED','CONSISTENT'].includes(evidenceState[key] || 'MISSING'));
    const conflict = Object.values(evidenceState).includes('CONFLICT');
    if (conflict) return '<div class="evidence-gate"><strong>CONFLICT — REVIEW REQUIRED</strong><p>Conflicting evidence prevents a definitive exception result.</p></div>';
    if (blocked) return '<div class="evidence-gate"><strong>NOT READY FOR DEFINITIVE RESULT</strong><p>Required evidence has not yet reached an extracted/consistent state.</p></div>';
    return '<div class="evidence-gate"><strong>EVIDENCE GATE PASSED</strong><p>The required checklist items have reached an extracted/consistent state. Full legal composition can now continue.</p></div>';
  }

  function renderLegalJourney() {
    const box=document.getElementById('legal-journey');
    if(!box) return;
    const steps=[
      ['01','QUESTION','Rent review'],
      ['02','FACTS','Your information'],
      ['03','CLASSIFICATION','Tenancy regime'],
      ['04','TIME','Legal generation'],
      ['05','LAW','Candidate rules'],
      ['06','EVIDENCE','Proof required'],
      ['07','DEADLINE','Time limit'],
      ['08','NEXT','Official route']
    ];
    const result=classify();
    const active=result.status==='PRIVATE_PATH' ? 4 : result.status==='SPECIAL_PATH' ? 3 : 2;
    box.hidden=false;
    box.innerHTML='<div class="kicker">YOUR LEGAL JOURNEY</div><div class="journey-track">'+steps.map((s,i)=>'<div class="journey-step '+(i<=active?'active':'')+'"><small>'+s[0]+'</small><strong>'+s[1]+'</strong><small>'+s[2]+'</small></div>').join('')+'</div>';
  }

  function deadlineState() {
    const serviceDate = state.notice_service_date || '';
    if (!serviceDate) return {status:'UNKNOWN',message:'The notice service date has not been established, so the RTB deadline cannot be calculated.'};
    if (!validDate(serviceDate)) return {status:'UNKNOWN',message:'The notice service date must be entered as YYYY-MM-DD.'};
    const d=new Date(serviceDate+'T00:00:00Z');
    d.setUTCDate(d.getUTCDate()+7);
    return {status:'CALCULATED',date:d.toISOString().slice(0,10),message:'Current RTB procedure: the notice copy deadline is calculated as 7 calendar days from the established service date, subject to the applicable legal/procedural rules.'};
  }

  function renderEvidenceChecklist() {
    if (!(state.new_apartment || '').toLowerCase().includes('yes')) return '';
    const items = [
      ['Commencement notice or 7-day notice','REQUIRED'],
      ['Submission date to building control authority','REQUIRED'],
      ['Building control authority identified','REQUIRED'],
      ['Description of qualifying work','REQUIRED'],
      ['Certificate of compliance on completion','REQUEST IF NEEDED'],
      ['Dates and property references cross-checked','REQUIRED']
    ];
    return '<div class="evidence-checklist"><div class="kicker">Evidence checklist</div>' +
      items.map((item,index) => { const key='e'+index; const current=evidenceState[key]||'MISSING'; return '<div class="check-item"><button type="button" class="evidence-toggle" data-evidence="'+key+'">'+escapeHtml(current)+'</button><strong>' + escapeHtml(item[0]) + '</strong><small>' + escapeHtml(item[1]) + '</small></div>'; }).join('') +
      '</div>';
  }

  function apartmentState() {
    const v=(state.new_apartment||'').toLowerCase();
    if(!v) return 'UNKNOWN — construction/building-control evidence still required.';
    if(v.includes('not sure') || v.includes('unknown')) return 'UNKNOWN — do not assume qualification.';
    if(v.includes('yes')) return 'POSSIBLE QUALIFICATION — verify commencement notice / 7-day notice and statutory conditions.';
    if(v.includes('no')) return 'NOT INDICATED — ordinary rule remains the candidate branch, subject to all other conditions.';
    return 'UNKNOWN — use evidence rather than inference.';
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
      const apartment=apartmentState();
      const composition=composeLegalResult(result,time);
      const checklist=renderEvidenceChecklist();
      const evidenceGate=renderEvidenceGate();
      const deadline=deadlineState();
      html+='<div class="decision-facts"><div><span>Tenancy generation</span><strong>'+escapeHtml(time.tenancyGeneration)+'</strong></div><div><span>Review period</span><strong>'+escapeHtml(time.reviewPeriod)+'</strong></div><div><span>Commencement check</span><strong>'+escapeHtml(time.commencementCheck ? 'REQUIRED' : 'NOT YET REQUIRED')+'</strong></div></div>';
      html+='<div class="citizen-summary"><div class="kicker">YOUR SITUATION</div><p>'+escapeHtml(result.message)+'</p><div class="kicker">APPLICABLE LAW</div><p>Candidate propositions: '+escapeHtml(mapping.propositions.length ? mapping.propositions.join(' · ') : 'Historical or special-regime research required.')+'</p><div class="kicker">WHAT IS VERIFIED</div><p>Source-linked legal seed and pathway classification are available.</p><div class="kicker">WHAT IS NOT YET VERIFIED</div><p>Individual exceptions, complete statutory conditions and any missing evidence still require resolution.</p><div class="kicker">WHY</div><p>The platform does not convert incomplete facts or evidence into a definitive legal conclusion.</p><div class="kicker">WHAT TO DO NEXT</div><p>Complete the missing facts and evidence checks shown below.</p></div><div class="decision-evidence"><div class="kicker">Candidate legal propositions</div><p>'+escapeHtml(mapping.propositions.length ? mapping.propositions.join(' · ') : 'None loaded for this historical branch.')+'</p><div class="kicker">Evidence chain</div><p>'+escapeHtml(mapping.evidence.length ? mapping.evidence.join(' · ') : 'Historical evidence required.')+'</p><div class="kicker">Publication state</div><p>'+escapeHtml(mapping.route)+'</p><div class="kicker">New-apartment exception</div><p>'+escapeHtml(apartment)+'</p><div class="kicker">Deadline</div><p>'+escapeHtml(deadline.message)+(deadline.date ? '<br><strong>'+escapeHtml(deadline.date)+'</strong>' : '')+'</p><div class="kicker">Legal composition</div><p><strong>'+escapeHtml(composition.result)+'</strong><br>'+escapeHtml(composition.reason)+'</p>'+checklist+evidenceGate<button type="button" id="show-law-button">SHOW ME THE LAW</button></div>';
    }
    box.innerHTML=html;
    document.querySelectorAll('.evidence-toggle').forEach(button => button.addEventListener('click', () => { const key=button.dataset.evidence; const order=['MISSING','SUPPLIED','EXTRACTED','CONSISTENT','CONFLICT']; const current=evidenceState[key]||'MISSING'; evidenceState[key]=order[(order.indexOf(current)+1)%order.length]; renderDecision(); }));
    const lawButton=document.getElementById('show-law-button');
    if(lawButton) lawButton.addEventListener('click', renderLaw);
  }

  function composeLegalResult(result, time) {
    if (result.status !== 'PRIVATE_PATH' || !time) return {result:'NOT_DETERMINABLE',reason:'Classification or time resolution incomplete.'};
    if (time.reviewPeriod === 'BEFORE_2026_FRAMEWORK') return {result:'HISTORICAL',reason:'Historical propositions and evidence are required.'};
    const newApartment = (state.new_apartment || '').toLowerCase();
    if (newApartment.includes('yes')) {
      const required=['e0','e1','e2','e3','e5'];
      const conflict=Object.values(evidenceState).includes('CONFLICT');
      if (conflict) return {result:'REVIEW_REQUIRED',reason:'Evidence conflict detected.'};
      const ready=required.every(k => ['EXTRACTED','CONSISTENT'].includes(evidenceState[k] || 'MISSING'));
      if (!ready) return {result:'POSSIBLY',reason:'The special-rule pathway is potentially relevant, but required evidence is not yet complete.'};
      return {result:'YES_SUBJECT_TO_CONDITIONS',reason:'The verified seed supports continuing the qualifying new-apartment analysis, subject to all statutory conditions.'};
    }
    if (newApartment.includes('not sure') || !newApartment) return {result:'POSSIBLY',reason:'The special-rule fact has not been resolved.'};
    return {result:'POSSIBLY',reason:'The ordinary current private-rent proposition remains a candidate, subject to all applicable conditions and exceptions.'};
  }

  function renderLaw() {
    const box=document.getElementById('pathway-decision');
    if(!box) return;
    const time=temporalState();
    const result=classify();
    if(result.status !== 'PRIVATE_PATH' || !time || time.reviewPeriod !== 'FROM_2026_FRAMEWORK') return;
    const p='RTB-2026-RENT-CAP-001';
    box.innerHTML='<div class="kicker">SHOW ME THE LAW</div><h3>RTB-2026-RENT-CAP-001</h3><p><strong>What we say</strong><br>For applicable private residential tenancies from 1 March 2026, the general annual rent-increase rule is 2% or CPI, whichever is lower, subject to applicable exceptions.</p><p><strong>Why we say it</strong><br>This proposition is linked to the 2026 statutory framework, commencement record and current RTB official guidance.</p><p><strong>What it means</strong><br>This is a general rule only. Your tenancy classification, dates and exceptions must still be checked before an individual conclusion is reached.</p><p><strong>Official route</strong><br>RTB</p><p><strong>Last verified</strong><br>23 September 2026</p><p class="muted">Exact statutory wording will only be displayed after the applicable provision has been retrieved and verified for the relevant legal version.</p><button type="button" id="show-law-back">BACK TO PATHWAY</button>';
    const back=document.getElementById('show-law-back');
    if(back) back.addEventListener('click',renderDecision);
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