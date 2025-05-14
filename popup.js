document.addEventListener('DOMContentLoaded', function() {
    const censorButton = document.getElementById('censorButton');
    const disableButton = document.getElementById('disableButton');
    const statusMessage = document.getElementById('statusMessage');
    
    // Check current state and update UI accordingly
    chrome.storage.local.get(['censoringEnabled'], function(result) {
        if (result.censoringEnabled) {
            censorButton.disabled = true;
            censorButton.textContent = "Censoring Active";
            disableButton.disabled = false;
        } else {
            censorButton.disabled = false;
            disableButton.disabled = true;
        }
    });
    
    censorButton.addEventListener('click', function() {
        // Enable censoring and store the state
        chrome.storage.local.set({censoringEnabled: true}, function() {
            // Execute content script on the current tab
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.scripting.executeScript({
                    target: {tabId: tabs[0].id},
                    function: performCensoring
                });
                
                // Update button states
                censorButton.disabled = true;
                censorButton.textContent = "Censoring Active";
                disableButton.disabled = false;
                
                // Show refresh message
                statusMessage.textContent = "Please refresh the page for full effect.";
                statusMessage.style.color = "#4285f4";
            });
        });
    });

    disableButton.addEventListener('click', function() {
        // Disable censoring and store the state
        chrome.storage.local.set({censoringEnabled: false}, function() {
            // Execute content script on the current tab to disable censoring
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.scripting.executeScript({
                    target: {tabId: tabs[0].id},
                    function: disableCensoring
                });
                
                // Update button states
                censorButton.disabled = false;
                censorButton.textContent = "Censor Words";
                disableButton.disabled = true;
                
                // Show refresh message
                statusMessage.textContent = "Please refresh the page for full effect.";
                statusMessage.style.color = "#ea4335";
            });
        });
    });
});

// Function that will be injected into the page to censor words
function performCensoring() {
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
        if (!node.hasAttribute('data-original-text')) {
            node.setAttribute('data-original-text', original);
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
            if (m === m.toUpperCase()) return masked.toUpperCase();      // JOB → J*B
            if (m[0] === m[0].toUpperCase()) return masked[0].toUpperCase() + masked.slice(1); // Job → J*b
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
                (!n.parentNode ? NodeFilter.FILTER_REJECT
                : /script|style|noscript|textarea|code|pre/i
                    .test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT
                :                               NodeFilter.FILTER_ACCEPT) }
        );
        for (let n; (n = walker.nextNode()); ) censorNode(n);
    }
    
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
    }
    
    /* perform censoring on the page */
    walk(document.body);
    
    // Handle Google search if on Google
    if (window.location.hostname.includes('google')) {
        handleGoogleSearch();
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
    
    return "Censoring complete and enabled for all pages!";
}

// Function that will be injected into the page to disable censoring
function disableCensoring() {
    /* walk tree and restore all text nodes under a root */
    function walk(root) {
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            { acceptNode: n =>
                (!n.parentNode ? NodeFilter.FILTER_REJECT
                : /script|style|noscript|textarea|code|pre/i
                    .test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT
                :                               NodeFilter.FILTER_ACCEPT) }
        );
        
        for (let n; (n = walker.nextNode()); ) {
            // If the parent node has the original text stored, restore it
            if (n.parentNode && n.parentNode.hasAttribute('data-original-text')) {
                n.textContent = n.parentNode.getAttribute('data-original-text');
                n.parentNode.removeAttribute('data-original-text');
            }
        }
    }
    
    // Also look for text nodes with data-original-text attribute
    const elementsWithOriginal = document.querySelectorAll('[data-original-text]');
    elementsWithOriginal.forEach(element => {
        element.textContent = element.getAttribute('data-original-text');
        element.removeAttribute('data-original-text');
    });
    
    // Restore Google search inputs
    const searchInputs = document.querySelectorAll('input[name="q"], input[type="search"]');
    searchInputs.forEach(input => {
        if (input.hasAttribute('data-original-value')) {
            input.value = input.getAttribute('data-original-value');
            input.removeAttribute('data-original-value');
        }
        
        // Remove the input event listener
        if (input.hasAttribute('data-censor-listener')) {
            input.removeAttribute('data-censor-listener');
            // We can't easily remove the exact listener, but we can clone the element to remove all listeners
            const newInput = input.cloneNode(true);
            if (input.parentNode) {
                input.parentNode.replaceChild(newInput, input);
            }
        }
    });
    
    /* restore original text on the page */
    walk(document.body);
    
    // Disconnect the observer if it exists
    if (window._censorObserver) {
        window._censorObserver.disconnect();
        delete window._censorObserver;
    }
    
    return "Censoring disabled for all pages!";
} 