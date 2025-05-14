/* Check if censoring is enabled before running */
chrome.storage.local.get(['censoringEnabled'], function(result) {
  if (result.censoringEnabled) {
    initCensoring();
  }
});

function initCensoring() {
  /* words → masked forms */
  const CENSORS = {
    // General Job Words
    job: 'j*b',
    work: 'w*rk',
    career: 'c*reer',
    position: 'p*sition',
    occupation: 'occ*pation',
    role: 'r*le',
    gig: 'g*g',
    employment: 'empl*yment',
    profession: 'prof*ssion',
    livelihood: 'livel*hood',
    trade: 'tr*de',
    vocation: 'voc*tion',
    posting: 'p*sting',
    opportunity: 'opport*nity',
    
    // Application/Process
    application: 'appl*cation',
    apply: 'app*y',
    applying: 'app*ying',
    applicant: 'appl*cant',
    resume: 'res*me',
    cv: 'c*v',
    "cover letter": 'c*ver letter',
    submission: 'subm*ssion',
    portal: 'p*rtal',
    "upload resume": 'upl*ad res*me',
    screening: 'scr*ening',
    form: 'f*rm',
    register: 'reg*ster',
    enrollment: 'enr*llment',
    candidate: 'cand*date',
    
    // Hiring/Recruitment
    hiring: 'h*ring',
    recruiter: 'recr*iter',
    recruitment: 'recr*itment',
    recruiting: 'recr*iting',
    headhunter: 'headh*nter',
    "talent acquisition": 'tal*nt acq*isition',
    "job fair": 'j*b f*ir',
    opening: 'op*ning',
    vacancy: 'vac*ncy',
    offer: 'off*r',
    placement: 'plac*ment',
    onboarding: 'onb*arding',
    selection: 'sel*ction',
    shortlist: 'sh*rtlist',
    
    // Company/Employer Side
    employer: 'empl*yer',
    company: 'comp*ny',
    organization: 'org*nization',
    firm: 'f*rm',
    hr: 'h*r',
    "human resources": 'h*man res*urces',
    "hiring manager": 'h*ring man*ger',
    department: 'dep*rtment',
    corporation: 'corp*ration',
    office: 'off*ce',
    staff: 'st*ff',
    team: 't*am',
    
    // Employment Types
    "full-time": 'f*ll-time',
    "part-time": 'p*rt-time',
    contract: 'contr*ct',
    freelance: 'freel*nce',
    internship: 'int*rnship',
    temporary: 'temp*rary',
    seasonal: 'seas*nal',
    consultant: 'cons*ltant',
    remote: 'rem*te',
    "in-person": 'in-p*rson',
    
    // Compensation/Benefits
    salary: 'sal*ry',
    pay: 'p*y',
    wage: 'w*ge',
    benefits: 'ben*fits',
    compensation: 'comp*nsation',
    stipend: 'stip*nd',
    hourly: 'h*urly',
    "annual income": 'ann*al inc*me',
    "401k": '4*1k',
    insurance: 'ins*rance',
    bonus: 'bon*s',
    
    // Job Boards / Portals
    linkedin: 'link*din',
    indeed: 'ind*ed',
    glassdoor: 'glassd*or',
    monster: 'monst*r',
    handshake: 'handsh*ke',
    ziprecruiter: 'zipr*cruiter',
    workday: 'workd*y',
    lever: 'lev*r',
    greenhouse: 'greenh*use',
    "apply now": 'app*y n*w'
  };
  
  /* one case‑insensitive, whole‑word regex for all targets */
  const censorRE = new RegExp('\\b(' + Object.keys(CENSORS).join('|').replace(/\s+/g, '\\s+') + ')\\b', 'gi');
  
  /* replace text inside a single Text node */
  function censorNode(node) {
    const original = node.textContent;

    // Store original text if not already stored
    if (node.parentNode && !node.parentNode.hasAttribute('data-original-text')) {
      node.parentNode.setAttribute('data-original-text', original);
    }

    const updated = original.replace(censorRE, m => {
      // Find the matching key in a case-insensitive way
      const key = Object.keys(CENSORS).find(k => 
        k.toLowerCase() === m.toLowerCase() || 
        (k.includes(' ') && m.toLowerCase().match(new RegExp(k.toLowerCase().replace(/\s+/g, '\\s+'), 'i')))
      );
      
      if (!key) return m; // Shouldn't happen, but just in case
      
      const masked = CENSORS[key];
  
      /* keep rough capitalization style */
      if (m === m.toUpperCase())            return masked.toUpperCase();      // JOB → J*B
      if (m[0] === m[0].toUpperCase())      return masked[0].toUpperCase() + masked.slice(1); // Job → J*b
      return masked;                        // job → j*b
    });
  
    if (updated !== original) node.textContent = updated;
  }
  
  /* walk tree and censor all text nodes under a root */
  function walk(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      { acceptNode: n =>
          (!n.parentNode                ? NodeFilter.FILTER_REJECT
          : /script|style|noscript|textarea|code|pre/i
            .test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT
          :                               NodeFilter.FILTER_ACCEPT) }
    );
    for (let n; (n = walker.nextNode()); ) censorNode(n);
  }
  
  /* initial sweep */
  walk(document.body);
  
  /* Specifically handle Google search inputs */
  function handleGoogleSearch() {
    // For the main search input
    const searchInputs = document.querySelectorAll('input[name="q"], input[type="search"]');
    searchInputs.forEach(input => {
      // Store original value if not already stored
      if (!input.hasAttribute('data-original-value')) {
        input.setAttribute('data-original-value', input.value);
      }
      
      // Censor the current value
      const original = input.value;
      const updated = original.replace(censorRE, m => {
        // Find the matching key in a case-insensitive way
        const key = Object.keys(CENSORS).find(k => 
          k.toLowerCase() === m.toLowerCase() || 
          (k.includes(' ') && m.toLowerCase().match(new RegExp(k.toLowerCase().replace(/\s+/g, '\\s+'), 'i')))
        );
        
        if (!key) return m; // Shouldn't happen, but just in case
        
        const masked = CENSORS[key];
        
        if (m === m.toUpperCase()) return masked.toUpperCase();
        if (m[0] === m[0].toUpperCase()) return masked[0].toUpperCase() + masked.slice(1);
        return masked;
      });
      
      if (updated !== original) input.value = updated;
      
      // Add event listener to censor as user types
      if (!input.hasAttribute('data-censor-listener')) {
        input.addEventListener('input', function() {
          const currentValue = this.value;
          const censoredValue = currentValue.replace(censorRE, m => {
            // Find the matching key in a case-insensitive way
            const key = Object.keys(CENSORS).find(k => 
              k.toLowerCase() === m.toLowerCase() || 
              (k.includes(' ') && m.toLowerCase().match(new RegExp(k.toLowerCase().replace(/\s+/g, '\\s+'), 'i')))
            );
            
            if (!key) return m; // Shouldn't happen, but just in case
            
            const masked = CENSORS[key];
            
            if (m === m.toUpperCase()) return masked.toUpperCase();
            if (m[0] === m[0].toUpperCase()) return masked[0].toUpperCase() + masked.slice(1);
            return masked;
          });
          
          if (censoredValue !== currentValue) {
            // Save cursor position
            const cursorPos = this.selectionStart;
            this.value = censoredValue;
            // Restore cursor position
            this.setSelectionRange(cursorPos, cursorPos);
          }
        });
        input.setAttribute('data-censor-listener', 'true');
      }
    });
    
    // For search suggestions and results
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          // Check for search suggestions
          const suggestions = document.querySelectorAll('.sbct, .aypzV, .wM6W7d, .erkvQe, .OBMEnb li');
          suggestions.forEach(suggestion => walk(suggestion));
          
          // Also check for search results
          const results = document.querySelectorAll('#search, #rso, .g');
          results.forEach(result => walk(result));
        }
      });
    });
    
    // Observe the search results and suggestions containers
    const searchContainers = document.querySelectorAll('#search, .UUbT9, .aajZCb, .OBMEnb');
    searchContainers.forEach(container => {
      if (container) {
        observer.observe(container, { childList: true, subtree: true });
      }
    });
  }
  
  // Run Google search handling if we're on Google
  if (window.location.hostname.includes('google')) {
    handleGoogleSearch();
    // Also run it periodically to catch dynamic content
    setInterval(handleGoogleSearch, 1000);
  }
  
  /* keep up with dynamically‑added content (SPAs, infinite scroll, etc.) */
  if (!window._censorObserver) {
    window._censorObserver = new MutationObserver(muts => {
      muts.forEach(mut => {
        mut.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            censorNode(node);
          } else {
            walk(node);
            
            // If we're on Google, also handle search inputs in the new nodes
            if (window.location.hostname.includes('google')) {
              const searchInputs = node.querySelectorAll ? 
                node.querySelectorAll('input[name="q"], input[type="search"]') : [];
              if (searchInputs.length > 0) {
                handleGoogleSearch();
              }
            }
          }
        });
      });
    });
    window._censorObserver.observe(document.body, { childList: true, subtree: true });
  }
}
  