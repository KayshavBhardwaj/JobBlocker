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
            // Execute content script function on the current tab
            // This works with 'activeTab' permission when triggered by user action
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs && tabs[0]) {
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
                } else {
                    statusMessage.textContent = "Could not find active tab.";
                    statusMessage.style.color = "#ea4335";
                }
            });
        });
    });

    disableButton.addEventListener('click', function() {
        // Disable censoring and store the state
        chrome.storage.local.set({censoringEnabled: false}, function() {
            // Execute content script function on the current tab to disable censoring
             chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                 if (tabs && tabs[0]) {
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
                } else {
                    statusMessage.textContent = "Could not find active tab.";
                    statusMessage.style.color = "#ea4335";
                }
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
        // Removed flawed data-original-text storage
        const updated = original.replace(censorRE, m => {
            const key = Object.keys(CENSORS).find(k =>
                k.toLowerCase() === m.toLowerCase() ||
                (k.includes(' ') && m.toLowerCase().match(new RegExp(k.toLowerCase().replace(/\s+/g, '\\s+'), 'i')))
            );
            if (!key) return m;
            const masked = CENSORS[key];
            if (m === m.toUpperCase()) return masked.toUpperCase();
            if (m[0] === m[0].toUpperCase()) return masked[0].toUpperCase() + masked.slice(1);
            return masked;
        });
        if (updated !== original) node.textContent = updated;
    }

    /* walk tree and censor all text nodes under a root */
    function walk(root) {
        if (!root) return; // Prevent errors if root is null/undefined
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
        const searchInputs = document.querySelectorAll('input[name="q"], input[type="search"]');
        searchInputs.forEach(input => {
             // Removed flawed data-original-value storage
            const original = input.value;
            const updated = original.replace(censorRE, m => {
                 const key = Object.keys(CENSORS).find(k =>
                    k.toLowerCase() === m.toLowerCase() ||
                    (k.includes(' ') && m.toLowerCase().match(new RegExp(k.toLowerCase().replace(/\s+/g, '\\s+'), 'i')))
                 );
                 if (!key) return m;
                 const masked = CENSORS[key];
                 if (m === m.toUpperCase()) return masked.toUpperCase();
                 if (m[0] === m[0].toUpperCase()) return masked[0].toUpperCase() + masked.slice(1);
                 return masked;
            });

            if (updated !== original) input.value = updated;

            if (!input.hasAttribute('data-censor-listener')) {
                input.addEventListener('input', function() {
                    const currentValue = this.value;
                    const censoredValue = currentValue.replace(censorRE, m => {
                         const key = Object.keys(CENSORS).find(k =>
                            k.toLowerCase() === m.toLowerCase() ||
                            (k.includes(' ') && m.toLowerCase().match(new RegExp(k.toLowerCase().replace(/\s+/g, '\\s+'), 'i')))
                         );
                         if (!key) return m;
                         const masked = CENSORS[key];
                         if (m === m.toUpperCase()) return masked.toUpperCase();
                         if (m[0] === m[0].toUpperCase()) return masked[0].toUpperCase() + masked.slice(1);
                         return masked;
                    });
                    if (censoredValue !== currentValue) {
                        const cursorPos = this.selectionStart;
                        this.value = censoredValue;
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
    // Ensure the observer is only created once
    if (!window._censorObserver) {
        window._censorObserver = new MutationObserver(muts => {
            muts.forEach(mut => {
                mut.addedNodes.forEach(node => {
                    // Process text nodes or walk element subtrees
                    if (node.nodeType === Node.TEXT_NODE) {
                         censorNode(node);
                    } else if (node.nodeType === Node.ELEMENT_NODE) { // Only process elements
                         walk(node);
                         // Re-run Google handling for any new elements that might contain inputs
                         if (window.location.hostname.includes('google')) {
                             handleGoogleSearch();
                         }
                    }
                });
            });
        });
         // Start observing the body for changes
        window._censorObserver.observe(document.body, { childList: true, subtree: true });
    }
    
    return "Censoring initiated."; // Return something for executeScript callback if needed
}

// Function that will be injected into the page to disable censoring
function disableCensoring() {
    // Attempt to restore text nodes (won't work without stored original text)
    function walkAndRestore(root) {
         if (!root) return;
         // Note: This tree walker finds TEXT nodes. The original code then checks
         // the parent node for data-original-text. This is fundamentally incorrect
         // for restoring specific text nodes.
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
             { acceptNode: n => NodeFilter.FILTER_ACCEPT } // Accept all text nodes
        );

        for (let n; (n = walker.nextNode()); ) {
        }
    }


    // Restore Google search inputs
    const searchInputs = document.querySelectorAll('input[name="q"], input[type="search"]');
    searchInputs.forEach(input => {

        // Attempt to remove the input event listener
        if (input.hasAttribute('data-censor-listener')) {
            input.removeAttribute('data-censor-listener');
            const newInput = input.cloneNode(true);
            if (input.parentNode) {
                input.parentNode.replaceChild(newInput, input);
            }
        }
    });

    walkAndRestore(document.body); // This call won't restore censored text

    // Disconnect the observer if it exists
    if (window._censorObserver) {
        window._censorObserver.disconnect();
        delete window._censorObserver;
    }
    
    return "Censoring disabled."; // Return something for executeScript callback if needed
}