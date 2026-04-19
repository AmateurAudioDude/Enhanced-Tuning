// Enhanced Tuning V3.0 – Seamless AM Scanner, Full Admin UI, Zero Globals
// -------------------------------------------------------------------------------------

/* global document, socket, window, WebSocket, Event */
(() => {
  // 1. SKUDDSIKKER FALLBACK: Sikrer at knappene alltid bygges selv om API feiler!
  let pluginConfig = {
      LAYOUT_STYLE: 'modern',
      HIDE_ALL_BUTTONS: false,
      SHOW_LOOP_BUTTON: true,
      SHOW_BAND_RANGE: true,
      ENABLE_TUNE_STEP_FEATURE: true,
      TUNE_STEP_TIMEOUT_SECONDS: 20,
      ENABLED_BANDS: ['FM', 'OIRT', 'SW', 'MW', 'LW'],
      TUNING_STANDARD: 'international',
      ENABLE_MW_STEP_TOGGLE: true,
      ENABLE_FREQUENCY_MEMORY: true,
      ENABLE_AM_BW: true,
      FIRMWARE_TYPE: 'FM-DX-Tuner',
      ENABLE_DEFAULT_AM_BW: false,
      DEFAULT_AM_BW_VALUE: '56000',
      ENABLE_SMART_KHZ_INPUT: true,
      overrideServerTuningLimit: true,
      fmLower: 64.0, fmUpper: 108.0,
      amLower: 0.144, amUpper: 30.0,
      ENABLE_AM_SCANNER: true,

      // --- NYTT: Fallback for Main Bands (Navn og grenser) ---
      customMainBands: {
          'AM_SUPER': { name: 'AM Super', tune: 1.000, start: 0.144, end: 27.0 },
          'FM': { name: 'FM', tune: 87.500, start: 87.5, end: 108.0 },
          'OIRT': { name: 'OIRT', tune: 65.900, start: 65.9, end: 74.0 },
          'SW': { name: 'SW', tune: 9.400, start: 1.710, end: 27.0 },
          'MW': { name: 'MW', tune: 0.504, start: 0.504, end: 1.701 },
          'LW': { name: 'LW', tune: 0.144, start: 0.144, end: 0.351 }
      },

      // --- Fallback for Shortwave sub-bånd (Tune, Grenser) ---
      customSwBands: {
          '160m': { tune: 1.8, start: 1.8, end: 2.0 }, '120m': { tune: 2.3, start: 2.3, end: 2.5 },
          '90m': { tune: 3.2, start: 3.2, end: 3.4 }, '75m': { tune: 3.9, start: 3.9, end: 4.0 },
          '60m': { tune: 4.75, start: 4.75, end: 5.06 }, '49m': { tune: 5.9, start: 5.9, end: 6.2 },
          '41m': { tune: 7.2, start: 7.2, end: 7.6 }, '31m': { tune: 9.4, start: 9.4, end: 9.9 },
          '25m': { tune: 11.6, start: 11.6, end: 12.1 }, '22m': { tune: 13.57, start: 13.57, end: 13.87 },
          '19m': { tune: 15.1, start: 15.1, end: 15.83 }, '16m': { tune: 17.48, start: 17.48, end: 17.9 },
          '15m': { tune: 18.9, start: 18.9, end: 19.02 }, '13m': { tune: 21.45, start: 21.45, end: 21.85 },
          '11m': { tune: 25.67, start: 25.67, end: 26.1 }
      }
  };
  
  let isAdmin = false;

  // Local Scanner State variables
  let isLocalScannerRunning = false;
  let isInternalScannerTuning = false;
  let localScannerTimer = null;
  let localScannerMode = null; 
  let localScannerDir = 'up';  
  
  let _startLocalScanner = () => {};
  let _stopLocalScanner = () => {};

  const getGlobalCurrentFrequencyInMHz = () => {
      const el = document.getElementById('data-frequency');
      if (!el) return 0;
      const freqText = el.textContent;
      let freqValue = parseFloat(freqText);
      if (freqText.toLowerCase().includes('khz')) freqValue /= 1000;
      return freqValue;
  };

  // =========================================================================
  // WEBSOCKET INTERCEPTOR
  // =========================================================================
  const originalWebSocketSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function(data) {
      if (typeof data === 'string') {
          
          // AM/SW Scanner Intercept
          if (pluginConfig.ENABLE_AM_SCANNER && data.startsWith('{')) {
              try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === "Scanner" && parsed.value && parsed.value.status === "command") {
                      const cmd = parsed.value;
                      const freq = getGlobalCurrentFrequencyInMHz();
                      
                      // Blokker Highpoint scanneren hvis vi er under 30 MHz
                      if (freq < 30.0) {
                          if ('Scan' in cmd) {
                              if (cmd.Scan === 'on') _startLocalScanner('scan', 'up');
                              else _stopLocalScanner();
                          }
                          if ('Search' in cmd) {
                              _startLocalScanner('search', cmd.Search);
                          }
                          return; 
                      }
                  }
              } catch(e) {}
          }

          // Tuning Limit Intercept
          if (pluginConfig && pluginConfig.overrideServerTuningLimit && /^T\d+$/.test(data)) {
              if (isLocalScannerRunning && !isInternalScannerTuning) _stopLocalScanner();

              let freqMhz = parseInt(data.substring(1), 10) / 1000;
              
              if (freqMhz > 0) {
                  const isFm = freqMhz >= 64.0;
                  let modified = false;

                  if (isFm) {
                      if (freqMhz < pluginConfig.fmLower) { freqMhz = pluginConfig.fmLower; modified = true; }
                      else if (freqMhz > pluginConfig.fmUpper) { freqMhz = pluginConfig.fmUpper; modified = true; }
                  } else {
                      if (freqMhz < pluginConfig.amLower) { freqMhz = pluginConfig.amLower; modified = true; }
                      else if (freqMhz > pluginConfig.amUpper) { freqMhz = pluginConfig.amUpper; modified = true; }
                  }

                  if (modified) {
                      const currentFreq = getGlobalCurrentFrequencyInMHz();
                      if (Math.abs(currentFreq - freqMhz) < 0.0001) return; 
                      data = "T" + Math.round(freqMhz * 1000);
                  }
              }
          }
      }
      originalWebSocketSend.apply(this, arguments);
  };

  const fetchPluginConfig = async () => {
    try {
      const res = await fetch('/enhanced_tuning/api/auth-check');
      if (res.ok) {
          const data = await res.json();
          // Sikker merge av config slik at vi aldri mangler noe
          pluginConfig = { ...pluginConfig, ...data.config };
          isAdmin = data.isAdmin;
      }
    } catch (err) {
      console.warn("[Enhanced Tuning] API Fetch feilet. Bruker innebygd standard config.", err);
    }
  };

  const injectSettingsIcon = () => {
    if (!isAdmin) return;
    const observer = new MutationObserver(() => {
        const fmBtn = document.querySelector('.band-selector-button[data-band-key="FM"], .band-selector-button[data-band-name="FM"]');
        if (fmBtn && !document.getElementById('et-admin-btn')) {
            
            const parentContainer = fmBtn.closest('.side-band-button-container, .main-bands-wrapper');
            if (parentContainer) {
                parentContainer.style.position = 'relative';
                // Fiks for Classic mode: forhindre at ikonet klippes bort
                const freqContainer = document.getElementById('freq-container');
                if (freqContainer && pluginConfig.LAYOUT_STYLE === 'classic') {
                    freqContainer.style.overflow = 'visible';
                }
            }

            const settingsBtn = document.createElement('button');
            settingsBtn.id = 'et-admin-btn';
            settingsBtn.innerHTML = '⚙️';
            settingsBtn.title = 'Enhanced Tuning Settings';
            
            settingsBtn.style.cssText = `
                position: absolute;
                top: 0px;
                left: -40px; /* Ligger til venstre for FM knappen */
                background: transparent; 
                border: none; 
                cursor: pointer; 
                font-size: 18px; 
                padding: 4px; 
                transition: transform 0.2s, text-shadow 0.2s; 
                color: var(--color-text);
                z-index: 1000;
            `;

            settingsBtn.onmouseover = () => {
                settingsBtn.style.transform = 'scale(1.2) rotate(45deg)';
                settingsBtn.style.textShadow = '0 0 5px rgba(255,255,255,0.5)';
            };
            settingsBtn.onmouseout = () => {
                settingsBtn.style.transform = 'scale(1) rotate(0deg)';
                settingsBtn.style.textShadow = 'none';
            };
            settingsBtn.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                window.open('/enhanced_tuning/AP', '_blank');
            };

            if (parentContainer) parentContainer.appendChild(settingsBtn);
            else fmBtn.parentNode.insertBefore(settingsBtn, fmBtn);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  const loadPluginStylesheet = () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = '/public/Enhanced_Tuning.css';
    document.head.appendChild(link);
    return new Promise((resolve) => {
      link.onload = () => resolve();
      link.onerror = () => {
        console.warn("[Enhanced Tuning] Kunne ikke laste Enhanced_Tuning.css");
        resolve(); // Fortsett uansett!
      };
    });
  };

  const checkForGradientPluginAndApplyStyles = () => {
    let attempts = 0;
    const maxAttempts = 40;
    const isGradientPluginActive = () => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText && rule.selectorText.includes('.playbutton') && rule.style.backgroundImage) {
              if (rule.style.backgroundImage.includes('linear-gradient')) return true;
            }
          }
        } catch (e) { continue; }
      }
      return false;
    };

    const styleCheckInterval = setInterval(() => {
      attempts++;
      if (isGradientPluginActive()) {
        clearInterval(styleCheckInterval);
        const styleElement = document.createElement('style');
        styleElement.textContent = `
          .band-selector-button, .am-view-button, .sw-grid-button, .loop-toggle-button {
            background-image: linear-gradient(var(--color-4), var(--color-3));
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease; background-color: transparent; opacity: 0.6;
          }
          .band-selector-button.active-band, .am-view-button.active-band, .sw-grid-button.active-band, .loop-toggle-button.active { opacity: 1; }
          .band-selector-button:hover, .am-view-button:hover, .sw-grid-button:hover, .loop-toggle-button:hover {
            background-image: linear-gradient(var(--color-3), var(--color-5));
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.2); transform: translateY(0.1px); opacity: 1;
          }
        `;
        document.head.appendChild(styleElement);
      } else if (attempts >= maxAttempts) {
        clearInterval(styleCheckInterval);
      }
    }, 250);
  };

  const initializePlugin = () => {
    try {
        // Hjelpevariabel for å garantere en array, uansett hva config sier
        const enabledBandsList = Array.isArray(pluginConfig.ENABLED_BANDS) ? pluginConfig.ENABLED_BANDS : ['FM', 'OIRT', 'SW', 'MW', 'LW'];

        checkForGradientPluginAndApplyStyles();
        injectSettingsIcon();

        if (!pluginConfig.ENABLE_AM_BW && (typeof console !== 'undefined')) {
          if (pluginConfig.ENABLE_DEFAULT_AM_BW) console.warn('[BandSelector] ENABLE_DEFAULT_AM_BW set but ENABLE_AM_BW is false.');
        }

        if (typeof socket === 'undefined' || socket === null) {
            console.warn("[Enhanced Tuning] Socket er ikke klar enda. UI bygges likevel.");
        }

        const dataFrequencyElement = document.getElementById('data-frequency');
        if(!dataFrequencyElement) {
            console.error("[Enhanced Tuning] data-frequency element finnes ikke. Avbryter scriptet.");
            return;
        }

        if (pluginConfig.ENABLE_SMART_KHZ_INPUT) {
            // Vi legger inn en liten forsinkelse for å la eventuelle andre plugins 
            // bygge seg ferdig før vi tar over og bytter ut feltet.
            setTimeout(() => {
                const oldInput = document.getElementById('commandinput');
                
                // Sjekk at feltet finnes, og at vi ikke allerede har byttet det ut
                if (oldInput && !oldInput.dataset.smartKhz) {
                    
                    // Klon hele feltet (dette fjerner ALLE gamle usynlige lyttere)
                    const newInput = oldInput.cloneNode(true);
                    newInput.dataset.smartKhz = "true"; // Markør for å vise at vi eier den
                    
                    // Bytt ut den gamle boksen med vår nye
                    oldInput.parentNode.replaceChild(newInput, oldInput);

                    // Legg til vår egen, suverene lytter
                    newInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            
                            let valStr = newInput.value.trim();
                            let val = parseFloat(valStr);

                            if (!isNaN(val)) {
                                const currentFreq = getGlobalCurrentFrequencyInMHz();
                                let targetMhz = val;

                                // 1. Logikk for AM-båndet (Under 30 MHz)
                                if (currentFreq < 30.0) {
                                    // Sjekker om brukeren skrev et rent tall (f.eks "9640" eller "693")
                                    if (/^\d+$/.test(valStr) && val >= 130) {
                                        targetMhz = val / 1000; // Gjør om kHz til MHz
                                    }
                                } 
                                // 2. Logikk for FM/OIRT-båndet (Over 30 MHz)
                                else {
                                    if (/^\d+$/.test(valStr)) {
                                        // Gjenskaper webserverens FM-snarveier:
                                        if (val >= 640 && val <= 1080) {
                                            targetMhz = val / 10; // F.eks "980" -> 98.0 MHz
                                        } else if (val >= 6400 && val <= 10800) {
                                            targetMhz = val / 100; // F.eks "9640" -> 96.4 MHz
                                        }
                                    }
                                }

                                // Send kommandoen
                                if (typeof socket !== 'undefined' && socket && socket.readyState === WebSocket.OPEN) {
                                    socket.send("T" + Math.round(targetMhz * 1000));
                                }
                                
                                // Tøm feltet og fjern fokus
                                newInput.value = '';
                                newInput.blur();
                            }
                        }
                    });
                }
            }, 1000); // 1 sekunds ventetid sikrer at vi overkjører Scanner-pluginen
        }

        const getCurrentFrequencyInMHz = () => { 
          const freqText = dataFrequencyElement.textContent; 
          let freqValue = parseFloat(freqText); 
          if (freqText.toLowerCase().includes('khz')) freqValue /= 1000; 
          return freqValue; 
        };

        const FM_DX_TUNER_BW_OPTIONS = { '3 kHz': 'W3000', '4 kHz': 'W4000', '6 kHz': 'W6000', '8 kHz': 'W8000' };
        const AM_BW_MAPPING = { '56000': 3, '64000': 4, '72000': 6, '84000': 8 };

        const ALL_BANDS = {
          'AM_SUPER': { name: 'AM Super', tune: 1.000, start: 0.144, end: 27.0, displayUnit: 'MHz' },
          'FM':   { name: 'FM',   tune: 87.500,  start: 87.5,    end: 108.0,   displayUnit: 'MHz' },
          'OIRT': { name: 'OIRT', tune: 65.900,  start: 65.9,    end: 74.0,    displayUnit: 'MHz' },
          'SW':   { name: 'SW',   tune: 9.400,   start: 1.710,   end: 27.0,    displayUnit: 'MHz' },
          'MW':   { name: 'MW',   tune: 0.504,   start: 0.504,   end: 1.701,   displayUnit: 'kHz' },
          'LW':   { name: 'LW',   tune: 0.144,   start: 0.144,   end: 0.351,   displayUnit: 'kHz' },
        };
        
        // 1. Legg på Tuning Standard regler
        switch (pluginConfig.TUNING_STANDARD) {
          case 'americas':
            ALL_BANDS['MW'] = { name: 'MW', tune: 0.530, start: 0.530, end: 1.700, displayUnit: 'kHz' };
            ALL_BANDS['FM'] = { name: 'FM', tune: 87.500, start: 87.5, end: 107.9, displayUnit: 'MHz' };
            break;
          case 'japan':
            ALL_BANDS['FM'] = { name: 'FM', tune: 76.000, start: 76.0, end: 95.0, displayUnit: 'MHz' };
            break;
        }

        // 2. Overskriv med dine egne Admin Panel tilpasninger (OIRT -> eFM osv.)
        if (pluginConfig.customMainBands) {
            for (const key in pluginConfig.customMainBands) {
                if (ALL_BANDS[key] && pluginConfig.customMainBands[key]) {
                    if (pluginConfig.customMainBands[key].name) ALL_BANDS[key].name = pluginConfig.customMainBands[key].name;
                    if (pluginConfig.customMainBands[key].tune !== undefined && !isNaN(pluginConfig.customMainBands[key].tune)) ALL_BANDS[key].tune = pluginConfig.customMainBands[key].tune;
                    if (pluginConfig.customMainBands[key].start !== undefined) ALL_BANDS[key].start = pluginConfig.customMainBands[key].start;
                    if (pluginConfig.customMainBands[key].end !== undefined) ALL_BANDS[key].end = pluginConfig.customMainBands[key].end;
                }
            }
        }

        const SW_BANDS = {
          '160m': { tune: 1.8, start: 1.8, end: 2.0, displayUnit: 'MHz' }, '120m': { tune: 2.3, start: 2.3, end: 2.5, displayUnit: 'MHz' },
          '90m':  { tune: 3.2, start: 3.2, end: 3.4, displayUnit: 'MHz' }, '75m':  { tune: 3.9, start: 3.9, end: 4.0, displayUnit: 'MHz' },
          '60m':  { tune: 4.75,start: 4.75,end: 5.06,displayUnit: 'MHz' }, '49m':  { tune: 5.9, start: 5.9, end: 6.2, displayUnit: 'MHz' },
          '41m':  { tune: 7.2, start: 7.2, end: 7.6, displayUnit: 'MHz' }, '31m':  { tune: 9.4, start: 9.4, end: 9.9, displayUnit: 'MHz' },
          '25m':  { tune: 11.6,start: 11.6,end: 12.1,displayUnit: 'MHz'},  '22m':  { tune: 13.57,start:13.57,end:13.87,displayUnit: 'MHz'},
          '19m':  { tune: 15.1,start: 15.1,end: 15.83,displayUnit: 'MHz'}, '16m':  { tune: 17.48,start:17.48,end:17.9,displayUnit: 'MHz'},
          '15m':  { tune: 18.9,start: 18.9,end: 19.02,displayUnit: 'MHz'}, '13m':  { tune: 21.45,start:21.45,end:21.85,displayUnit: 'MHz'},
          '11m':  { tune: 25.67,start:25.67,end:26.1,displayUnit: 'MHz'}
        };

        // 3. Trygg overskriving av SW frekvensgrenser og tune
        if (pluginConfig.customSwBands) {
            for (const key in pluginConfig.customSwBands) {
                if (SW_BANDS[key] && pluginConfig.customSwBands[key]) {
                    if (pluginConfig.customSwBands[key].tune !== undefined && !isNaN(pluginConfig.customSwBands[key].tune)) SW_BANDS[key].tune = pluginConfig.customSwBands[key].tune;
                    if (pluginConfig.customSwBands[key].start !== undefined) SW_BANDS[key].start = pluginConfig.customSwBands[key].start;
                    if (pluginConfig.customSwBands[key].end !== undefined) SW_BANDS[key].end = pluginConfig.customSwBands[key].end;
                }
            }
        }
        const amBandKeys =['SW', 'MW', 'LW'];

        let masterBwListTemplates =[];

        const initializeBwFilter = () => {
          const desktopBwList = document.querySelector('#data-bw .options');
          const mobileBwList = document.querySelector('#data-bw-phone .options');

          if (desktopBwList) masterBwListTemplates = Array.from(desktopBwList.querySelectorAll('li')).map(li => li.cloneNode(true));
          
          Object.entries(FM_DX_TUNER_BW_OPTIONS).forEach(([text, command]) => {
            const value = command.replace('W', '');

            if (desktopBwList) {
              const newLi = document.createElement('li');
              newLi.textContent = text;
              newLi.dataset.value = value;
              newLi.classList.add('fmdx-tuner-bw-option'); 
              newLi.style.display = 'none'; 
              addFmDxTunerClickListener(newLi, command);
              desktopBwList.appendChild(newLi);
            }
            if (mobileBwList) {
              const newLi = document.createElement('li');
              newLi.textContent = text;
              newLi.dataset.value = value;
              newLi.classList.add('fmdx-tuner-bw-option');
              newLi.style.display = 'none';
              newLi.addEventListener('click', () => { if(socket) socket.send(command); });
              mobileBwList.appendChild(newLi);
            }
          });
        };

        const getDropdownRoot = (dropdownEl) => dropdownEl?.closest?.('.dropdown') || dropdownEl;
        const findDropdownToggler = (root) => root.querySelector('.selected') || root.querySelector('[data-toggle]') || root.querySelector('.dropdown-toggle') || root.querySelector('summary') || root;
        
        const bwRoot = document.getElementById('data-bw');
        if (bwRoot) {
          bwRoot.addEventListener('mousedown', (e) => {
            if ((e.target && e.target.closest('.options li'))) {
              e.stopImmediatePropagation();
              e.preventDefault();
            }
          }, { capture: true });
        }

        let _prevIsAmMode = null;
        
        const updateBwOptionsForMode = (freqInMHz) => {
          if (!pluginConfig.ENABLE_AM_BW) return;

          const isAmMode = freqInMHz < 27.0;

          const justEnteredAmMode = _prevIsAmMode === false && isAmMode;
          if (justEnteredAmMode) {
            const lastBw = localStorage.getItem('lastKnownAmBw');
            if (lastBw) setTimeout(() => { if (typeof socket !== 'undefined' && socket && socket.readyState === WebSocket.OPEN) socket.send(`W${lastBw}`); }, 100);
          }

          const justLeftAmMode = _prevIsAmMode === true && !isAmMode;
          if (justLeftAmMode && typeof socket !== 'undefined' && socket) {
              socket.send('W0');
              const desktopSelectedText = document.querySelector('#data-bw .selected');
              const mobileSelectedText = document.querySelector('#data-bw-phone .selected');
              if (desktopSelectedText) desktopSelectedText.textContent = 'Auto';
              if (mobileSelectedText) mobileSelectedText.textContent = 'Auto';
          }

          const allBwItems = document.querySelectorAll('#data-bw .options li, #data-bw-phone .options li');
          if (allBwItems.length === 0) return;

          const amValuesToShow = new Set(['0', ...Object.keys(AM_BW_MAPPING)]);

          const getOriginalText = (value) => {
              const template = masterBwListTemplates.find(t => t.dataset.value === value);
              return template ? template.textContent : null;
          };

          allBwItems.forEach(li => {
              const isTunerOption = li.classList.contains('fmdx-tuner-bw-option');
              const value = li.dataset.value;

              if (isAmMode) {
                if (pluginConfig.FIRMWARE_TYPE === 'FM-DX-Tuner') {
                    li.style.display = isTunerOption ? '' : 'none';
                } else { 
                    const isRelevant = !isTunerOption && amValuesToShow.has(value);
                    li.style.display = isRelevant ? '' : 'none';
                    if (isRelevant && AM_BW_MAPPING.hasOwnProperty(value)) li.textContent = `${AM_BW_MAPPING[value]} kHz`;
                }
              } else { 
                li.style.display = isTunerOption ? 'none' : '';
                if (!isTunerOption && value) {
                    const originalText = getOriginalText(value);
                    if (originalText) li.textContent = originalText;
                }
              }
          });

          if (isAmMode && pluginConfig.FIRMWARE_TYPE === 'TEF6686_ESP32') {
              const desktopBwList = document.querySelector('#data-bw .options');
              const justEnteredAm = _prevIsAmMode !== true;
              if (desktopBwList && pluginConfig.ENABLE_DEFAULT_AM_BW && justEnteredAm && pluginConfig.DEFAULT_AM_BW_VALUE) {
                const targetLi = desktopBwList.querySelector(`li[data-value="${pluginConfig.DEFAULT_AM_BW_VALUE}"]`);
                if (targetLi) targetLi.click();
              }
          }

          _prevIsAmMode = isAmMode;
        };

        const closeDropdown = (dropdownEl) => {
          const root = dropdownEl.closest('.dropdown') || dropdownEl;
          const options = root.querySelector('.options');
          const selected = root.querySelector('.selected');

          root.classList.remove('open','active','show');
          dropdownEl.classList.remove('open','active','show');
          options?.classList.remove('open','active','show');

          const details = root.tagName === 'DETAILS' ? root : root.querySelector('details');
          if (details) details.open = false;

          root.querySelectorAll('[aria-expanded="true"]').forEach(el => el.setAttribute('aria-expanded','false'));
          selected?.setAttribute('aria-expanded','false');

          root.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(inp => {
              if (inp.checked) { inp.checked = false; inp.dispatchEvent(new Event('change', { bubbles: true })); }
          });

          if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
          selected?.blur?.();

          root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

          if (options) {
              const prev = options.getAttribute('style') || '';
              const addSemi = prev && !prev.trim().endsWith(';') ? ';' : '';
              options.setAttribute('style', prev + addSemi + 'display:none;');
              setTimeout(() => {
              const current = options.getAttribute('style') || '';
              const cleaned = current.replace(/(^|;)\s*display\s*:\s*none\s*;?/i, ';').replace(/^;|;;/g, ';').trim();
              if (cleaned) options.setAttribute('style', cleaned);
              else options.removeAttribute('style');
              }, 50);
          }
        };

        const addClickListener = (element) => {
          element.addEventListener('click', (ev) => {
              ev.stopImmediatePropagation();
              ev.preventDefault();

              const bwDropdown = document.getElementById('data-bw');
              if (!bwDropdown) return;

              const root = getDropdownRoot(bwDropdown);
              const toggler = findDropdownToggler(root);
              const value = element.dataset.value;

              if(typeof socket !== 'undefined' && socket) socket.send(`W${value}`);

              const selectedText = root.querySelector('.selected');
              if (selectedText) selectedText.textContent = element.textContent;

              root.style.pointerEvents = 'none';
              closeDropdown?.(bwDropdown);

              setTimeout(() => {
                try {
                    if (root.tagName === 'DETAILS') root.open = false;
                    else if (toggler) {
                      toggler.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                      toggler.setAttribute?.('aria-expanded', 'false');
                    }
                    if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
                } finally {
                    setTimeout(() => { root.style.pointerEvents = ''; }, 120);
                }
              }, 0);
          }, { capture: true });
        };
        
        const addFmDxTunerClickListener = (element, command) => {
          element.addEventListener('click', (ev) => {
              ev.stopImmediatePropagation();
              ev.preventDefault();
              const bwDropdown = document.getElementById('data-bw');
              if (!bwDropdown) return;
              const root = getDropdownRoot(bwDropdown);
              const toggler = findDropdownToggler(root);
              if(typeof socket !== 'undefined' && socket) socket.send(command);
              const selectedText = root.querySelector('.selected');
              if (selectedText) selectedText.textContent = element.textContent;
              root.style.pointerEvents = 'none';
              closeDropdown?.(bwDropdown);
              setTimeout(() => {
                try {
                    if (root.tagName === 'DETAILS') root.open = false;
                    else if (toggler) {
                      toggler.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                      toggler.setAttribute?.('aria-expanded', 'false');
                    }
                    if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
                } finally {
                    setTimeout(() => { root.style.pointerEvents = ''; }, 120);
                }
              }, 0);
          }, { capture: true });
        };
        
        const LOOP_STORAGE_KEY = 'bandSelectorLoopState';
        const LAST_FREQS_STORAGE_KEY = 'bandSelectorLastFreqs';
        const FULL_SW_MODE_KEY = 'bandSelectorFullSwMode';

        let loopEnabled = localStorage.getItem(LOOP_STORAGE_KEY) === 'true';
        if (!pluginConfig.SHOW_LOOP_BUTTON) { loopEnabled = false; localStorage.setItem(LOOP_STORAGE_KEY, 'false'); }

        let activeBandForLooping = null;
        let fullSwTuningActive = sessionStorage.getItem(FULL_SW_MODE_KEY) === 'true';

        const freqContainer = document.getElementById("freq-container");
        const rtContainer = document.getElementById('rt-container');
        const tuneUpButton = document.getElementById('freq-up');
        const tuneDownButton = document.getElementById('freq-down');
        
        if (!freqContainer || !rtContainer) {
            console.error("[Enhanced Tuning] freq-container eller rt-container mangler. Stopper UI bygging.");
            return;
        }
        
        let observer;
        let updateFrequencyDisplayWithMarker = () => {};
        let tuneEventHandler = () => {};
        let handleCustomStepTune = () => false;

        const tuneToFrequency = (frequencyInMHz) => { 
            if (typeof socket !== 'undefined' && socket && socket.readyState === WebSocket.OPEN) {
                if (isLocalScannerRunning) isInternalScannerTuning = true;
                socket.send("T" + Math.round(parseFloat(frequencyInMHz) * 1000)); 
                isInternalScannerTuning = false;
            }
        };

        // Scanner Logic Overrides
        _stopLocalScanner = () => {
            isLocalScannerRunning = false;
            clearTimeout(localScannerTimer);
            
            // Gjenopprett alltid UI for sikkerhets skyld
            const scanBtn = document.getElementById('Scan-on-off');
            const btnDown = document.getElementById('freq-down');
            const btnUp = document.getElementById('freq-up');
            const searchDown = document.getElementById('search-down');
            const searchUp = document.getElementById('search-up');
            const blinkers = document.querySelectorAll('.autoscan-blink');

            if (scanBtn) {
                scanBtn.classList.remove('bg-color-4');
                scanBtn.dataset.scanStatus = "off";
            }
            if (btnDown) btnDown.style.display = '';
            if (btnUp) btnUp.style.display = '';
            if (searchDown) searchDown.style.display = '';
            if (searchUp) searchUp.style.display = '';
            blinkers.forEach(b => b.style.display = 'none');
        };

        const doLocalScannerStep = () => {
            if (!isLocalScannerRunning) return;

            const currentFreq = getCurrentFrequencyInMHz();
            
            let activeBandKey = 'SW';
            let bStart = 1.710, bEnd = 30.0;
            let stepSize = 0.005;

            // Sjekk SW bånd
            for (const key in SW_BANDS) {
                if (currentFreq >= SW_BANDS[key].start && currentFreq <= SW_BANDS[key].end) {
                    activeBandKey = key;
                    bStart = SW_BANDS[key].start;
                    bEnd = SW_BANDS[key].end;
                    stepSize = 0.005; // 5kHz for SW
                    break;
                }
            }
            // Sjekk MW / LW
            if (currentFreq >= ALL_BANDS['MW'].start && currentFreq <= ALL_BANDS['MW'].end) {
                activeBandKey = 'MW';
                bStart = ALL_BANDS['MW'].start;
                bEnd = ALL_BANDS['MW'].end;
                const is10kHz = localStorage.getItem('mwStepPreference') === 'true' || pluginConfig.TUNING_STANDARD === 'americas';
                stepSize = is10kHz ? 0.010 : 0.009; // 9 eller 10kHz for MW
            }
            else if (currentFreq >= ALL_BANDS['LW'].start && currentFreq <= ALL_BANDS['LW'].end) {
                activeBandKey = 'LW';
                bStart = ALL_BANDS['LW'].start;
                bEnd = ALL_BANDS['LW'].end;
                stepSize = 0.009; // 9kHz for LW
            }

            let newFreq = currentFreq + (localScannerDir === 'up' ? stepSize : -stepSize);
            
            // Loop internt i det aktive båndet!
            if (newFreq > bEnd) newFreq = bStart;
            if (newFreq < bStart) newFreq = bEnd;

            tuneToFrequency(newFreq.toFixed(3));

            // Vent nøyaktig 800ms før vi leser signalet, slik at tuneren rekker å låse seg
            localScannerTimer = setTimeout(() => {
                if (!isLocalScannerRunning) return;

                const sigEl = document.getElementById('data-sig');
                let signalValue = 0;
                if (sigEl) {
                    const match = sigEl.innerText.match(/-?\d+(\.\d+)?/);
                    if (match) signalValue = parseFloat(match[0]);
                }
                
                const thresholdKey = 'thr_' + activeBandKey;
                const threshold = (pluginConfig && pluginConfig[thresholdKey] !== undefined) ? pluginConfig[thresholdKey] : 35;

                if (!isNaN(signalValue) && signalValue >= threshold) {
                    // Vi fant en stasjon over terskelen!
                    if (localScannerMode === 'search') {
                        // SEARCH: Stopp helt.
                        _stopLocalScanner();
                    } else if (localScannerMode === 'scan') {
                        // AUTOSCAN: Paus i "Hold Time", og fortsett deretter automatisk.
                        const holdInput = document.querySelector('input[title="Scanhold Time"]');
                        let holdMs = 5000;
                        if (holdInput) holdMs = parseInt(holdInput.getAttribute('data-value'), 10) || 5000;
                        localScannerTimer = setTimeout(doLocalScannerStep, holdMs);
                    }
                } else {
                    // Signalet var for svakt, gå direkte til neste step
                    doLocalScannerStep();
                }
            }, 800);
        };

        _startLocalScanner = (mode, dir) => {
            _stopLocalScanner(); // Nullstill state
            isLocalScannerRunning = true;
            localScannerMode = mode;
            localScannerDir = dir;
            
            // KUN endre Highpoint UI hvis modusen er "Scan" (Autoscan)
            if (mode === 'scan') {
                const scanBtn = document.getElementById('Scan-on-off');
                const btnDown = document.getElementById('freq-down');
                const btnUp = document.getElementById('freq-up');
                const searchDown = document.getElementById('search-down');
                const searchUp = document.getElementById('search-up');
                const blinkers = document.querySelectorAll('.autoscan-blink');

                if (scanBtn) {
                    scanBtn.classList.add('bg-color-4');
                    scanBtn.dataset.scanStatus = "on";
                }
                if (btnDown) btnDown.style.display = 'none';
                if (btnUp) btnUp.style.display = 'none';
                if (searchDown) searchDown.style.display = 'none';
                if (searchUp) searchUp.style.display = 'none';
                blinkers.forEach(b => b.style.display = 'inline-block');
            }
            // Hvis mode === 'search', gjør vi absolutt ingenting med UI-et. 

            doLocalScannerStep();
        };

        if (pluginConfig.ENABLE_TUNE_STEP_FEATURE || pluginConfig.TUNING_STANDARD === 'americas') {
            if (pluginConfig.ENABLE_TUNE_STEP_FEATURE) {
                const TUNE_STEP_CONFIG =[
                    { step: 0.001, markerIndex: -1 }, { step: 0.010, markerIndex: -2 },
                    { step: 0.100, markerIndex: -3 }, { step: 1.000, markerIndex: -5 },
                ];
                let currentTuneStepIndex = -1;
                let tuneStepResetTimer = null;
                let startResetTimer = () => {};

                if (pluginConfig.TUNE_STEP_TIMEOUT_SECONDS > 0) {
                    const resetTuneStep = () => { currentTuneStepIndex = -1; updateFrequencyDisplayWithMarker(); };
                    startResetTimer = () => {
                        clearTimeout(tuneStepResetTimer);
                        if (currentTuneStepIndex !== -1) tuneStepResetTimer = setTimeout(resetTuneStep, pluginConfig.TUNE_STEP_TIMEOUT_SECONDS * 1000);
                    };
                    const clearResetTimer = () => clearTimeout(tuneStepResetTimer);
                    freqContainer.addEventListener('mouseenter', clearResetTimer);
                    freqContainer.addEventListener('mouseleave', startResetTimer);
                }

                updateFrequencyDisplayWithMarker = () => {
                    const originalText = dataFrequencyElement.textContent;
                    if (observer) observer.disconnect();
                    if (currentTuneStepIndex === -1) {
                        dataFrequencyElement.innerHTML = originalText;
                    } else {
                        const config = TUNE_STEP_CONFIG[currentTuneStepIndex];
                        const textOnly = originalText.replace(/[^\d.]/g, '');
                        const chars = textOnly.split('');
                        const markerPos = chars.length + config.markerIndex;
                        let html = '';
                        for (let i = 0; i < chars.length; i++) {
                            if (i === markerPos && chars[i] !== '.') html += `<span class="freq-digit-marker">${chars[i]}</span>`;
                            else html += `<span>${chars[i]}</span>`;
                        }
                        dataFrequencyElement.innerHTML = html;
                    }
                    if (observer) observer.observe(dataFrequencyElement, { characterData: true, childList: true, subtree: true });
                };

                handleCustomStepTune = (direction) => {
                    if (currentTuneStepIndex === -1) return false;
                    const currentFreq = getCurrentFrequencyInMHz();
                    if (isNaN(currentFreq)) return true;

                    let newFreq;
                    const isFmBand = (currentFreq >= 64.0);
                    const directionMultiplier = (direction === 'up' ? 1 : -1);

                    if (isFmBand) {
                        let stepSize = TUNE_STEP_CONFIG[currentTuneStepIndex].step;
                        if (currentTuneStepIndex === 2) {
                            stepSize = (pluginConfig.TUNING_STANDARD === 'americas') ? 0.200 : 0.100;
                            newFreq = currentFreq + (stepSize * directionMultiplier);
                            newFreq = Math.round(newFreq * 10) / 10;
                        } else {
                            newFreq = currentFreq + (stepSize * directionMultiplier);
                        }
                    } else {
                        const stepSize = TUNE_STEP_CONFIG[currentTuneStepIndex].step;
                        newFreq = currentFreq + (stepSize * directionMultiplier);
                        
                        if (currentTuneStepIndex === 1) {
                            let bandStep = 0.005; 
                            if (newFreq >= ALL_BANDS['MW'].start && newFreq <= ALL_BANDS['MW'].end) {
                                const isAmericasTuning = (pluginConfig.TUNING_STANDARD === 'americas');
                                const storedPref = localStorage.getItem('mwStepPreference');
                                const is10kHzStep = storedPref ? (storedPref === 'true') : isAmericasTuning;
                                bandStep = is10kHzStep ? 0.010 : 0.009;
                            } else if (newFreq >= ALL_BANDS['LW'].start && newFreq <= ALL_BANDS['LW'].end) {
                                bandStep = 0.009; 
                            }
                            newFreq = Math.round(newFreq / bandStep) * bandStep;
                        }
                    }

                    tuneToFrequency(newFreq.toFixed(3));
                    startResetTimer();
                    return true;
                };

                freqContainer.addEventListener('click', (e) => {
                    if (e.target.closest('#mw-step-toggle-button, .loop-toggle-button, #band-range-container, .band-selector-button')) return;
                    e.preventDefault(); e.stopImmediatePropagation();

                    currentTuneStepIndex++;
                    const freqInMHz = getCurrentFrequencyInMHz();
                    const isFmBand = (freqInMHz >= 64.0);
                    if (isFmBand && currentTuneStepIndex === 0) currentTuneStepIndex = 1;
                    if (currentTuneStepIndex >= TUNE_STEP_CONFIG.length) currentTuneStepIndex = -1;
                    
                    updateFrequencyDisplayWithMarker();
                    startResetTimer();
                });
            }
            
            const handleAmericasDefaultStepTune = (direction) => {
                const currentFreq = getCurrentFrequencyInMHz();
                if (isNaN(currentFreq)) return;
                let newFreq;
                if (currentFreq >= ALL_BANDS['FM'].start && currentFreq <= ALL_BANDS['FM'].end) {
                    const step = 0.2;
                    newFreq = parseFloat(currentFreq.toFixed(1)); 
                    if (direction === 'up') newFreq += step; else newFreq -= step;
                    if (Math.round(newFreq * 10) % 2 === 0) newFreq -= 0.1;
                } else {
                    const step = 0.010;
                    const directionMultiplier = (direction === 'up' ? 1 : -1);
                    newFreq = Math.round((currentFreq + (step * directionMultiplier)) / step) * step;
                }
                tuneToFrequency(newFreq.toFixed(3));
            };
            
            tuneEventHandler = (event, direction) => {
                if (pluginConfig.SHOW_LOOP_BUTTON && loopEnabled && activeBandForLooping) {
                    const currentFreq = getCurrentFrequencyInMHz();
                    const tolerance = 0.0001;
                    let looped = false;
                    if (direction === 'up' && currentFreq >= activeBandForLooping.end - tolerance) {
                        tuneToFrequency(activeBandForLooping.start); looped = true;
                    } else if (direction === 'down' && currentFreq <= activeBandForLooping.start + tolerance) {
                        tuneToFrequency(activeBandForLooping.end); looped = true;
                    }
                    if (looped) { event.preventDefault(); event.stopImmediatePropagation(); return; }
                }

                if (handleCustomStepTune(direction)) {
                    event.preventDefault(); event.stopImmediatePropagation(); return;
                }
                
                if (pluginConfig.TUNING_STANDARD === 'americas') {
                    const currentFreq = getCurrentFrequencyInMHz();
                    const isFmBand = currentFreq >= ALL_BANDS['FM'].start && currentFreq <= ALL_BANDS['FM'].end;
                    const isMwBand = currentFreq >= ALL_BANDS['MW'].start && currentFreq <= ALL_BANDS['MW'].end;
                    if (isFmBand || isMwBand) {
                        handleAmericasDefaultStepTune(direction);
                        event.preventDefault(); event.stopImmediatePropagation();
                    }
                }
            };

            freqContainer.addEventListener('wheel', (e) => tuneEventHandler(e, e.deltaY < 0 ? 'up' : 'down'), true);
            if(tuneUpButton) tuneUpButton.addEventListener('click', (e) => tuneEventHandler(e, 'up'), true);
            if(tuneDownButton) tuneDownButton.addEventListener('click', (e) => tuneEventHandler(e, 'down'), true);
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowRight') tuneEventHandler(e, 'up');
                if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') tuneEventHandler(e, 'down');
            }, true);
        }
        
        let updateVisualsByFrequency;

        const updateBandButtonStates = () => {
            const allBandData = { ...ALL_BANDS, ...SW_BANDS };
            let limits = null;

            if (pluginConfig && pluginConfig.overrideServerTuningLimit) {
                limits = {
                    useCustom: true,
                    fmL: pluginConfig.fmLower,
                    fmU: pluginConfig.fmUpper,
                    amL: pluginConfig.amLower,
                    amU: pluginConfig.amUpper
                };
            } else {
                const limitSpan = Array.from(document.querySelectorAll('.text-small, span')).find(el => el.textContent.includes('Limit:'));
                if (limitSpan) {
                    const matches = limitSpan.textContent.match(/(\d+\.?\d*)\s*MHz\s*-\s*(\d+\.?\d*)\s*MHz/);
                    if (matches && matches.length >= 3) {
                        limits = {
                            useCustom: false,
                            globalL: parseFloat(matches[1]),
                            globalU: parseFloat(matches[2])
                        };
                    }
                }
            }

            document.querySelectorAll('[data-band-key],[data-band-name]').forEach(button => {
                const key = button.dataset.bandKey || button.dataset.bandName;
                const bandData = allBandData[key];

                if (bandData) {
                    const bandStartMHz = bandData.start;
                    const bandEndMHz = bandData.end;
                    
                    let isOutside = false;
                    if (limits && limits.useCustom) {
                        const isFmBand = bandEndMHz >= 64.0;
                        const lowerLimit = isFmBand ? limits.fmL : limits.amL;
                        const upperLimit = isFmBand ? limits.fmU : limits.amU;
                        isOutside = bandEndMHz < lowerLimit || bandStartMHz > upperLimit;
                    } else if (limits && !limits.useCustom) {
                        isOutside = bandEndMHz < limits.globalL || bandStartMHz > limits.globalU;
                    }

                    button.classList.toggle('disabled-band', isOutside);

                    const parent = button.parentElement;
                    const isAlreadyWrapped = parent && parent.classList.contains('bs-tooltip'); 

                    if (pluginConfig.LAYOUT_STYLE === 'modern') {
                        if (isOutside && !isAlreadyWrapped) {
                            const tooltipWrapper = document.createElement('div');
                            tooltipWrapper.className = 'bs-tooltip'; 
                            const tooltipText = document.createElement('span');
                            tooltipText.className = 'bs-tooltiptext';
                            tooltipText.id = `tooltip-band-${key}`;
                            tooltipText.textContent = 'This band is outside the tuning limits.';
                            button.parentNode.insertBefore(tooltipWrapper, button);
                            tooltipWrapper.appendChild(button);
                            tooltipWrapper.appendChild(tooltipText);
                        } else if (!isOutside && isAlreadyWrapped) {
                            const grandParent = parent.parentNode;
                            grandParent.insertBefore(button, parent);
                            grandParent.removeChild(parent);
                        }
                    }
                }
            });
        };

        if (pluginConfig.LAYOUT_STYLE === 'modern') {
            const layoutWrapper = document.createElement('div');
            const sideButtonContainer = document.createElement('div');
            const amBandsViewContainer = document.createElement('div');
            const mobileBandSelectorWrapper = document.createElement('div');
            const mobileBandSelector = document.createElement('select');
            const bandRangeContainer = document.createElement("div");
            const loopButton = document.createElement("button");

            const updateBandRangeDisplay = (band) => {
            if (!pluginConfig.SHOW_BAND_RANGE || !band) { bandRangeContainer.style.display = 'none'; return; } 
            bandRangeContainer.style.display = 'flex'; 
            const unit = band.displayUnit || 'MHz'; 
            const start = unit === 'kHz' ? Math.round(band.start * 1000) : band.start.toFixed(3); 
            const end = unit === 'kHz' ? Math.round(band.end * 1000) : band.end.toFixed(3); 
            
            // Bruker innerHTML og en span rundt unit for mobil-tilpasning
            bandRangeContainer.querySelector('.band-range-start').innerHTML = `${start} <span class="band-range-unit">${unit}</span>`; 
            bandRangeContainer.querySelector('.band-range-end').innerHTML = `${end} <span class="band-range-unit">${unit}</span>`; 
        };
            
            const updateView = (activeBandKey) => { 
                if (pluginConfig.HIDE_ALL_BUTTONS) return;
                const freqForAmCheck = getCurrentFrequencyInMHz();
                const isAmView = (freqForAmCheck >= ALL_BANDS.AM_SUPER.start && freqForAmCheck <= ALL_BANDS.AM_SUPER.end);
                rtContainer.style.display = isAmView ? 'none' : 'block'; 
                amBandsViewContainer.style.display = isAmView ? 'grid' : 'none'; 
            };

            const createBandButton = (key, data, cssClass) => {
                const button = document.createElement("button");
                button.className = cssClass;
                button.textContent = data.displayName || key.replace('m', '');
                button.dataset.bandKey = key;
                return button;
            };

            updateVisualsByFrequency = (freqInMHz) => {
                let currentMainKey = null, currentSwKey = null;
                for (const key in ALL_BANDS) { if (key !== 'AM_SUPER' && enabledBandsList.includes(key) && freqInMHz >= ALL_BANDS[key].start && freqInMHz <= ALL_BANDS[key].end) { currentMainKey = key; break; } }
                if (currentMainKey === 'SW') {
                    for (const key in SW_BANDS) { if (freqInMHz >= SW_BANDS[key].start && freqInMHz <= SW_BANDS[key].end) { currentSwKey = key; break; } }
                }
                if (pluginConfig.ENABLE_FREQUENCY_MEMORY) {
                    try {
                        const lastFreqs = JSON.parse(localStorage.getItem(LAST_FREQS_STORAGE_KEY)) || {};
                        if (currentSwKey) lastFreqs[currentSwKey] = freqInMHz;
                        if (currentMainKey) lastFreqs[currentMainKey] = freqInMHz;
                        localStorage.setItem(LAST_FREQS_STORAGE_KEY, JSON.stringify(lastFreqs));
                    } catch (e) { }
                }
                const bandForDisplay = (currentMainKey === 'SW' && fullSwTuningActive) ? ALL_BANDS['SW'] : (SW_BANDS[currentSwKey] || ALL_BANDS[currentMainKey]);
                updateView(currentMainKey);
                updateBandRangeDisplay(bandForDisplay);
                activeBandForLooping = bandForDisplay;
                if (amBandKeys.includes(currentMainKey)) localStorage.setItem('bandSelectorLastAmBand', currentMainKey);
                const activeKeys = new Set();
                if (currentMainKey) activeKeys.add(currentMainKey);
                if (currentSwKey) activeKeys.add(currentSwKey);
                if (amBandKeys.includes(currentMainKey)) activeKeys.add('AM');
                document.querySelectorAll('.band-selector-button, .am-view-button, .sw-grid-button').forEach(btn => { btn.classList.toggle('active-band', activeKeys.has(btn.dataset.bandKey)); });
                if (mobileBandSelector && currentMainKey) { if (document.activeElement !== mobileBandSelector) mobileBandSelector.value = currentMainKey; }
                const loopOption = document.getElementById('mobile-loop-toggle-option');
                if (loopOption) loopOption.textContent = loopEnabled ? 'Disable Band Loop' : 'Enable Band Loop';
                const antContainer = document.getElementById('data-ant-container');
                const swSelectorWrapper = document.getElementById('mobile-sw-band-selector-wrapper');
                const mobileSwBandSelector = document.getElementById('mobile-sw-band-selector');
                if (antContainer && swSelectorWrapper) {
                    if (currentMainKey === 'SW') {
                        swSelectorWrapper.style.display = 'flex';
                        antContainer.classList.add('sw-mode-active');
                    } else {
                        swSelectorWrapper.style.display = 'none';
                        antContainer.classList.remove('sw-mode-active');
                    }
                }
                if (mobileSwBandSelector) mobileSwBandSelector.value = currentSwKey || '';
                updateFrequencyDisplayWithMarker();
            };
            
            if (pluginConfig.SHOW_LOOP_BUTTON) {
                loopButton.className = 'loop-toggle-button'; loopButton.innerHTML = 'Band<br>Loop';
                loopButton.title = 'Enable/disable frequency loop'; loopButton.classList.toggle('active', loopEnabled);
                freqContainer.appendChild(loopButton);
                loopButton.addEventListener('click', (e) => { e.stopPropagation(); loopEnabled = !loopEnabled; loopButton.classList.toggle('active', loopEnabled); localStorage.setItem(LOOP_STORAGE_KEY, loopEnabled); });
            }
            if (pluginConfig.SHOW_BAND_RANGE) {
                bandRangeContainer.id = "band-range-container"; bandRangeContainer.innerHTML = `<span class="band-range-part band-range-start"></span><span class="range-separator">↔</span><span class="band-range-part band-range-end"></span>`;
                freqContainer.appendChild(bandRangeContainer);
                bandRangeContainer.querySelector('.band-range-start').addEventListener('click', () => { if (activeBandForLooping) tuneToFrequency(activeBandForLooping.start); });
                bandRangeContainer.querySelector('.band-range-end').addEventListener('click', () => { if (activeBandForLooping) tuneToFrequency(activeBandForLooping.end); });
            }
            if (!pluginConfig.HIDE_ALL_BUTTONS) {
                layoutWrapper.className = `band-selector-layout-wrapper ${rtContainer.className}`; rtContainer.className = '';
                rtContainer.parentNode.replaceChild(layoutWrapper, rtContainer);
                sideButtonContainer.className = 'side-band-button-container'; layoutWrapper.appendChild(sideButtonContainer);
                layoutWrapper.appendChild(rtContainer);
                amBandsViewContainer.className = 'am-bands-view-container'; layoutWrapper.appendChild(amBandsViewContainer);
                const sideButtonKeys =['FM', 'OIRT', 'AM'];
                sideButtonKeys.forEach(key => {
                    const isAmButton = (key === 'AM');
                    const shouldCreate = isAmButton ? amBandKeys.some(b => enabledBandsList.includes(b)) : enabledBandsList.includes(key);
                    if (shouldCreate) {
                        const btn = createBandButton(key, { displayName: key === 'AM' ? ALL_BANDS['AM_SUPER'].name : ALL_BANDS[key].name }, 'band-selector-button');
                        btn.addEventListener('click', () => {
                            const lastFreqs = pluginConfig.ENABLE_FREQUENCY_MEMORY ? (JSON.parse(localStorage.getItem(LAST_FREQS_STORAGE_KEY)) || {}) : {};
                            let targetFreq;
                            if (isAmButton) {
                                const lastAmBand = localStorage.getItem('bandSelectorLastAmBand');
                                if (lastAmBand && enabledBandsList.includes(lastAmBand) && lastFreqs[lastAmBand]) targetFreq = lastFreqs[lastAmBand];
                                else {
                                    const firstEnabledAmBand = amBandKeys.find(b => enabledBandsList.includes(b));
                                    if (firstEnabledAmBand) targetFreq = lastFreqs[firstEnabledAmBand] || ALL_BANDS[firstEnabledAmBand].tune;
                                }
                            } else {
                                fullSwTuningActive = false; sessionStorage.setItem(FULL_SW_MODE_KEY, 'false');
                                targetFreq = lastFreqs[key] || ALL_BANDS[key].tune;
                            }
                            if (targetFreq !== undefined) tuneToFrequency(targetFreq);
                            updateVisualsByFrequency(getCurrentFrequencyInMHz());
                        });
                        sideButtonContainer.appendChild(btn);
                    }
                });
                if (enabledBandsList.includes('SW')) {
                    const swFieldset = document.createElement('fieldset'); swFieldset.className = 'sw-bands-fieldset';
                    const swLegend = document.createElement('legend'); swLegend.textContent = 'SW Broadcast Band'; swFieldset.appendChild(swLegend);
                    const swGridContainer = document.createElement('div'); swGridContainer.className = 'sw-grid-container'; swFieldset.appendChild(swGridContainer);
                    Object.keys(SW_BANDS).forEach(key => {
                        const btn = createBandButton(key, SW_BANDS[key], 'sw-grid-button');
                        btn.addEventListener('click', () => {
                            fullSwTuningActive = false; sessionStorage.setItem(FULL_SW_MODE_KEY, 'false');
                            const lastFreqs = pluginConfig.ENABLE_FREQUENCY_MEMORY ? (JSON.parse(localStorage.getItem(LAST_FREQS_STORAGE_KEY)) || {}) : {};
                            const targetFreq = lastFreqs[key] || SW_BANDS[key].tune;
                            tuneToFrequency(targetFreq);
                            updateVisualsByFrequency(getCurrentFrequencyInMHz());
                        });
                        swGridContainer.appendChild(btn);
                    });
                    amBandsViewContainer.appendChild(swFieldset);
                }
                const bandFieldset = document.createElement('fieldset'); bandFieldset.className = 'band-fieldset';
                const bandLegend = document.createElement('legend'); bandLegend.textContent = 'AM Band'; bandFieldset.appendChild(bandLegend);
                const bandButtonContainer = document.createElement('div'); bandButtonContainer.className = 'band-button-container'; bandFieldset.appendChild(bandButtonContainer);
                if (enabledBandsList.includes('SW')) {
                    const fullSwButton = createBandButton('SW', { ...ALL_BANDS['SW'], displayName: 'SW' }, 'am-view-button');
                    fullSwButton.addEventListener('click', () => {
                        fullSwTuningActive = true; sessionStorage.setItem(FULL_SW_MODE_KEY, 'true');
                        const lastFreqs = pluginConfig.ENABLE_FREQUENCY_MEMORY ? (JSON.parse(localStorage.getItem(LAST_FREQS_STORAGE_KEY)) || {}) : {};
                        const targetFreq = lastFreqs['SW'] || ALL_BANDS['SW'].tune;
                        tuneToFrequency(targetFreq);
                        updateVisualsByFrequency(getCurrentFrequencyInMHz());
                    });
                    bandButtonContainer.appendChild(fullSwButton);
                }['MW', 'LW'].forEach(key => {
                    if (enabledBandsList.includes(key)) {
                        const btn = createBandButton(key, ALL_BANDS[key], 'am-view-button');
                        btn.addEventListener('click', () => {
                            fullSwTuningActive = false; sessionStorage.setItem(FULL_SW_MODE_KEY, 'false');
                            const lastFreqs = pluginConfig.ENABLE_FREQUENCY_MEMORY ? (JSON.parse(localStorage.getItem(LAST_FREQS_STORAGE_KEY)) || {}) : {};
                            const targetFreq = lastFreqs[key] || ALL_BANDS[key].tune;
                            tuneToFrequency(targetFreq);
                            updateVisualsByFrequency(getCurrentFrequencyInMHz());
                        });
                        bandButtonContainer.appendChild(btn);
                    }
                });
                if (bandButtonContainer.hasChildNodes()) amBandsViewContainer.prepend(bandFieldset);
                const rtContainerForAnchor = document.getElementById('rt-container');
                if (rtContainerForAnchor && rtContainerForAnchor.parentNode) {
                    let antContainer = document.getElementById('data-ant-container');
                    if (!antContainer) {
                        antContainer = document.createElement('div'); antContainer.id = 'data-ant-container'; antContainer.className = 'hide-desktop';
                        rtContainerForAnchor.parentNode.insertBefore(antContainer, rtContainerForAnchor);
                    }
                    mobileBandSelectorWrapper.id = 'mobile-band-selector-wrapper'; mobileBandSelector.id = 'mobile-band-selector';
                    const mobileBandOrder =['FM', 'OIRT', 'SW', 'MW', 'LW'];
                    mobileBandOrder.forEach(key => {
                        if (enabledBandsList.includes(key)) {
                            const option = document.createElement('option'); option.value = key; option.textContent = ALL_BANDS[key].name; mobileBandSelector.appendChild(option);
                        }
                    });
                    if (pluginConfig.SHOW_LOOP_BUTTON) {
                        const separator = document.createElement('option'); separator.disabled = true; separator.textContent = '──────────'; mobileBandSelector.appendChild(separator);
                        const loopOption = document.createElement('option'); loopOption.id = 'mobile-loop-toggle-option'; loopOption.value = 'toggle-loop';
                        loopOption.textContent = loopEnabled ? 'Disable Band Loop' : 'Enable Band Loop'; mobileBandSelector.appendChild(loopOption);
                    }
                    mobileBandSelectorWrapper.appendChild(mobileBandSelector); antContainer.appendChild(mobileBandSelectorWrapper);
                    const mobileSwBandSelectorWrapper = document.createElement('div'); mobileSwBandSelectorWrapper.id = 'mobile-sw-band-selector-wrapper'; mobileSwBandSelectorWrapper.style.display = 'none'; 
                    const mobileSwBandSelector = document.createElement('select'); mobileSwBandSelector.id = 'mobile-sw-band-selector';
                    const defaultSwOption = document.createElement('option'); defaultSwOption.value = ""; defaultSwOption.textContent = "Band"; mobileSwBandSelector.appendChild(defaultSwOption);
                    Object.keys(SW_BANDS).forEach(key => {
                        const option = document.createElement('option'); option.value = key; option.textContent = key; mobileSwBandSelector.appendChild(option);
                    });
                    mobileSwBandSelectorWrapper.appendChild(mobileSwBandSelector); antContainer.appendChild(mobileSwBandSelectorWrapper);
                    mobileSwBandSelector.addEventListener('change', (event) => {
                    const key = event.target.value; 
                    if (!key) return; 
                    const data = SW_BANDS[key]; 
                    if (!data) return;

                    fullSwTuningActive = false; 
                    sessionStorage.setItem(FULL_SW_MODE_KEY, 'false');

                    const lastFreqs = pluginConfig.ENABLE_FREQUENCY_MEMORY ? (JSON.parse(localStorage.getItem(LAST_FREQS_STORAGE_KEY)) || {}) : {};
                    const targetFreq = lastFreqs[key] || data.tune;
                    tuneToFrequency(targetFreq);
                });
                    mobileBandSelector.addEventListener('change', (event) => {
                        const key = event.target.value;
                        if (key === 'toggle-loop') {
                            loopEnabled = !loopEnabled; localStorage.setItem(LOOP_STORAGE_KEY, loopEnabled);
                            if (loopButton) loopButton.classList.toggle('active', loopEnabled);
                            const freqMhz = getCurrentFrequencyInMHz();
                            let currentMainKey = null;
                            for (const bandKey in ALL_BANDS) { if (freqMhz >= ALL_BANDS[bandKey].start && freqMhz <= ALL_BANDS[bandKey].end) { currentMainKey = bandKey; break; } }
                            if (currentMainKey) mobileBandSelector.value = currentMainKey;
                            updateVisualsByFrequency(freqMhz); return;
                        }
                        const data = ALL_BANDS[key]; if (!data) return;
                        if (key === 'SW') fullSwTuningActive = true; else fullSwTuningActive = false;
                        sessionStorage.setItem(FULL_SW_MODE_KEY, String(fullSwTuningActive));
                        const lastFreqs = JSON.parse(localStorage.getItem(LAST_FREQS_STORAGE_KEY)) || {};
                        const targetFreq = lastFreqs[key] || data.tune;
                        tuneToFrequency(targetFreq);
                        updateVisualsByFrequency(getCurrentFrequencyInMHz());
                    });
                }
            }
        } else if (pluginConfig.LAYOUT_STYLE === 'classic') {
            const pluginTopContainer = document.createElement("div");
            pluginTopContainer.className = "plugin-top-container";
            const mainBandsWrapper = document.createElement("div");
            mainBandsWrapper.className = "main-bands-wrapper";
            const swBandsContainer = document.createElement("div");
            swBandsContainer.className = "sw-bands-container";
            const swBandsTopWrapper = document.createElement("div");
            swBandsTopWrapper.className = "sw-bands-grid sw-bands-top-wrapper";
            const swBandsBottomWrapper = document.createElement("div");
            swBandsBottomWrapper.className = "sw-bands-grid sw-bands-bottom-wrapper";
            const bandRangeContainer = document.createElement("div");
            bandRangeContainer.id = "band-range-container";
            const startFreqSpan = document.createElement("span");
            startFreqSpan.className = "band-range-part";
            startFreqSpan.title = "Go to band start";
            const rangeSeparator = document.createElement("span");
            rangeSeparator.className = "range-separator";
            rangeSeparator.innerHTML = "↔"; 
            const endFreqSpan = document.createElement("span");
            endFreqSpan.className = "band-range-part";
            endFreqSpan.title = "Go to band end";

            const updateBandRangeDisplay = (start, end, unit) => {
                if (!pluginConfig.SHOW_BAND_RANGE || start === undefined || end === undefined) {
                    bandRangeContainer.style.display = 'none';
                    return;
                }
                bandRangeContainer.style.display = 'flex';
                const displayStart = unit === 'kHz' ? Math.round(start * 1000) : start.toFixed(3);
                const displayEnd = unit === 'kHz' ? Math.round(end * 1000) : end.toFixed(3);
                
                // Bruker innerHTML og en span rundt unit for mobil-tilpasning
                startFreqSpan.innerHTML = `${displayStart} <span class="band-range-unit">${unit}</span>`;
                startFreqSpan.dataset.freqMhz = start;
                endFreqSpan.innerHTML = `${displayEnd} <span class="band-range-unit">${unit}</span>`;
                endFreqSpan.dataset.freqMhz = end;
            };

            updateVisualsByFrequency = (freqInMHz) => {
                let activeMainBandName = null;
                for (const bandName of enabledBandsList) {
                    const band = ALL_BANDS[bandName];
                    if (band && freqInMHz >= band.start && freqInMHz <= band.end) {
                        activeMainBandName = band.name;
                        break;
                    }
                }
                mainBandsWrapper.querySelectorAll('.main-band-button').forEach(btn => btn.classList.toggle('active-band', btn.dataset.bandName === activeMainBandName));
                
                if (activeMainBandName) activeBandForLooping = ALL_BANDS[activeMainBandName];
                else activeBandForLooping = null;

                let activeSwBandName = null;
                if (activeMainBandName === 'SW') {
                    swBandsContainer.style.display = 'flex';
                    for (const swBandName in SW_BANDS) {
                        const swBand = SW_BANDS[swBandName];
                        if (freqInMHz >= swBand.start && freqInMHz <= swBand.end) {
                            activeSwBandName = swBandName;
                            break;
                        }
                    }
                    swBandsContainer.querySelectorAll('.sw-band-button').forEach(btn => btn.classList.toggle('active-band', btn.dataset.bandName === activeSwBandName));
                    
                    const activeSwBand = SW_BANDS[activeSwBandName];
                    if (activeSwBand) { 
                        updateBandRangeDisplay(activeSwBand.start, activeSwBand.end, 'MHz');
                        activeBandForLooping = activeSwBand;
                    } else { 
                        updateBandRangeDisplay(ALL_BANDS.SW.start, ALL_BANDS.SW.end, 'MHz');
                        activeBandForLooping = ALL_BANDS.SW;
                    }
                } else {
                    swBandsContainer.style.display = 'none';
                    const activeMainBand = ALL_BANDS[activeMainBandName];
                    if (activeMainBand) updateBandRangeDisplay(activeMainBand.start, activeMainBand.end, activeMainBand.displayUnit);
                    else updateBandRangeDisplay();
                }
                
                if (pluginConfig.ENABLE_FREQUENCY_MEMORY) {
                    try {
                        const lastFreqs = JSON.parse(localStorage.getItem(LAST_FREQS_STORAGE_KEY)) || {};
                        if (activeSwBandName) lastFreqs[activeSwBandName] = freqInMHz;
                        if (activeMainBandName) lastFreqs[activeMainBandName] = freqInMHz;
                        localStorage.setItem(LAST_FREQS_STORAGE_KEY, JSON.stringify(lastFreqs));
                    } catch (e) { }
                }

                const mobileBandSelectorEl = document.getElementById('mobile-band-selector');
                if (mobileBandSelectorEl && activeMainBandName) {
                    if (document.activeElement !== mobileBandSelectorEl) mobileBandSelectorEl.value = activeMainBandName;
                }

                const loopOption = document.getElementById('mobile-loop-toggle-option');
                if (loopOption) loopOption.textContent = loopEnabled ? 'Disable Band Loop' : 'Enable Band Loop';

                const antContainer = document.getElementById('data-ant-container');
                const swSelectorWrapper = document.getElementById('mobile-sw-band-selector-wrapper');
                const mobileSwBandSelectorEl = document.getElementById('mobile-sw-band-selector');

                if (antContainer && swSelectorWrapper) {
                    if (activeMainBandName === 'SW') {
                        swSelectorWrapper.style.display = 'flex'; antContainer.classList.add('sw-mode-active');
                    } else {
                        swSelectorWrapper.style.display = 'none'; antContainer.classList.remove('sw-mode-active');
                    }
                }
                
                if (mobileSwBandSelectorEl) mobileSwBandSelectorEl.value = activeSwBandName || '';

                updateFrequencyDisplayWithMarker();
            };
            
            const createBandButton = (bandName, bandData, isSubBand = false) => {
                const button = document.createElement("button");
                button.className = isSubBand ? 'sw-band-button band-selector-button' : 'main-band-button band-selector-button';
                
                // Bruker navnet fra admin-panelet hvis det eksisterer!
                button.textContent = isSubBand ? bandName.replace('m', '') : (bandData.name || bandName);
                button.dataset.bandName = bandName;

                // SIKKERHET: Unngå krasj hvis 'tune' er borte av en eller annen grunn
                const safeTune = (bandData && typeof bandData.tune === 'number') ? bandData.tune : 0;
                button.title = `Go to ${safeTune.toFixed(3)} ${bandData.displayUnit || 'MHz'}`;
                
                button.addEventListener('click', () => { 
                    activeBandForLooping = bandData;
                    const lastFreqs = pluginConfig.ENABLE_FREQUENCY_MEMORY ? (JSON.parse(localStorage.getItem(LAST_FREQS_STORAGE_KEY)) || {}) : {};
                    const targetFreq = lastFreqs[bandName] || safeTune; // Bruker trygg verdi
                    tuneToFrequency(targetFreq);
                });
                return button;
            };
            
            enabledBandsList.forEach((bandName) => mainBandsWrapper.appendChild(createBandButton(bandName, ALL_BANDS[bandName])));
            
            let swButtonIndex = 0;
            Object.keys(SW_BANDS).forEach((swBandName) => {
                const button = createBandButton(swBandName, SW_BANDS[swBandName], true);
                if (swButtonIndex < 9) swBandsTopWrapper.appendChild(button);
                else swBandsBottomWrapper.appendChild(button);
                swButtonIndex++;
            });

            if (pluginConfig.SHOW_LOOP_BUTTON) {
                const loopButton = document.createElement("button");
                loopButton.id = 'loop-toggle-button';
                loopButton.className = 'band-selector-button';
                loopButton.textContent = 'Loop';
                loopButton.title = 'Enable/disable frequency loop';
                if (loopEnabled) loopButton.classList.add('active');
                loopButton.addEventListener('click', () => {
                    loopEnabled = !loopEnabled;
                    loopButton.classList.toggle('active', loopEnabled);
                    localStorage.setItem(LOOP_STORAGE_KEY, loopEnabled);
                });
                pluginTopContainer.appendChild(mainBandsWrapper);
                pluginTopContainer.appendChild(loopButton);
            } else {
                pluginTopContainer.appendChild(mainBandsWrapper);
            }

            swBandsContainer.appendChild(swBandsTopWrapper);
            swBandsContainer.appendChild(swBandsBottomWrapper);
            startFreqSpan.addEventListener('click', (e) => { const freqMhz = parseFloat(e.target.dataset.freqMhz); if (!isNaN(freqMhz)) tuneToFrequency(freqMhz); });
            endFreqSpan.addEventListener('click', (e) => { const freqMhz = parseFloat(e.target.dataset.freqMhz); if (!isNaN(freqMhz)) tuneToFrequency(freqMhz); });
            
            const rtContainerForAnchor = document.getElementById('rt-container');
            if (rtContainerForAnchor && rtContainerForAnchor.parentNode) {
                let antContainer = document.getElementById('data-ant-container');
                if (!antContainer) {
                    antContainer = document.createElement('div');
                    antContainer.id = 'data-ant-container';
                    rtContainerForAnchor.parentNode.insertBefore(antContainer, rtContainerForAnchor);
                }
                antContainer.classList.add('classic-mobile-controls');
                
                const mobileBandSelectorWrapper = document.createElement('div');
                mobileBandSelectorWrapper.id = 'mobile-band-selector-wrapper';
                const mobileBandSelector = document.createElement('select');
                mobileBandSelector.id = 'mobile-band-selector';
                
                const mobileBandOrder =['FM', 'OIRT', 'SW', 'MW', 'LW'];
                mobileBandOrder.forEach(key => {
                    if (enabledBandsList.includes(key)) {
                        const option = document.createElement('option');
                        option.value = key;
                        option.textContent = ALL_BANDS[key].name;
                        mobileBandSelector.appendChild(option);
                    }
                });

                if (pluginConfig.SHOW_LOOP_BUTTON) {
                    const separator = document.createElement('option');
                    separator.disabled = true; separator.textContent = '──────────';
                    mobileBandSelector.appendChild(separator);
                    const loopOption = document.createElement('option');
                    loopOption.id = 'mobile-loop-toggle-option'; loopOption.value = 'toggle-loop';
                    loopOption.textContent = loopEnabled ? 'Disable Band Loop' : 'Enable Band Loop';
                    mobileBandSelector.appendChild(loopOption);
                }
                mobileBandSelectorWrapper.appendChild(mobileBandSelector);
                antContainer.appendChild(mobileBandSelectorWrapper);

                const mobileSwBandSelectorWrapper = document.createElement('div');
                mobileSwBandSelectorWrapper.id = 'mobile-sw-band-selector-wrapper';
                mobileSwBandSelectorWrapper.style.display = 'none';
                const mobileSwBandSelector = document.createElement('select');
                mobileSwBandSelector.id = 'mobile-sw-band-selector';
                const defaultSwOption = document.createElement('option');
                defaultSwOption.value = ""; defaultSwOption.textContent = "Band";
                mobileSwBandSelector.appendChild(defaultSwOption);
                Object.keys(SW_BANDS).forEach(key => {
                    const option = document.createElement('option');
                    option.value = key; option.textContent = key;
                    mobileSwBandSelector.appendChild(option);
                });
                mobileSwBandSelectorWrapper.appendChild(mobileSwBandSelector);
                antContainer.appendChild(mobileSwBandSelectorWrapper);

                mobileSwBandSelector.addEventListener('change', (event) => {
                    const key = event.target.value; 
                    if (!key) return; 
                    const data = SW_BANDS[key]; 
                    if (!data) return;
                    fullSwTuningActive = false; 
                    sessionStorage.setItem(FULL_SW_MODE_KEY, 'false');
                    const lastFreqs = pluginConfig.ENABLE_FREQUENCY_MEMORY ? (JSON.parse(localStorage.getItem(LAST_FREQS_STORAGE_KEY)) || {}) : {};
                    const targetFreq = lastFreqs[key] || data.tune;
                    tuneToFrequency(targetFreq);
                });

                mobileBandSelector.addEventListener('change', (event) => {
                    const key = event.target.value;
                    if (key === 'toggle-loop') {
                        loopEnabled = !loopEnabled; 
                        localStorage.setItem(LOOP_STORAGE_KEY, loopEnabled);
                        const classicLoopButton = document.getElementById('loop-toggle-button');
                        if (classicLoopButton) classicLoopButton.classList.toggle('active', loopEnabled);
                        
                        const freqMhz = getCurrentFrequencyInMHz();
                        let currentMainKey = null;
                        for (const bandKey of enabledBandsList) {
                            if (ALL_BANDS[bandKey] && freqMhz >= ALL_BANDS[bandKey].start && freqMhz <= ALL_BANDS[bandKey].end) {
                                currentMainKey = bandKey; break; 
                            }
                        }
                        if (currentMainKey) mobileBandSelector.value = currentMainKey;
                        updateVisualsByFrequency(freqMhz); 
                        return;
                    }
                    const data = ALL_BANDS[key]; 
                    if (!data) return;

                    fullSwTuningActive = (key === 'SW');
                    sessionStorage.setItem(FULL_SW_MODE_KEY, String(fullSwTuningActive));
                    
                    const lastFreqs = pluginConfig.ENABLE_FREQUENCY_MEMORY ? (JSON.parse(localStorage.getItem(LAST_FREQS_STORAGE_KEY)) || {}) : {};
                    const targetFreq = lastFreqs[key] || data.tune;
                    tuneToFrequency(targetFreq);
                });
            }

            freqContainer.appendChild(pluginTopContainer);
            freqContainer.appendChild(swBandsContainer);
            
            if (pluginConfig.SHOW_BAND_RANGE) {
                bandRangeContainer.appendChild(startFreqSpan);
                bandRangeContainer.appendChild(rangeSeparator);
                bandRangeContainer.appendChild(endFreqSpan);
                freqContainer.appendChild(bandRangeContainer);
            }
        }

        const setBodyClasses = () => {
          const body = document.body;
          if (pluginConfig.LAYOUT_STYLE === 'modern') body.classList.add('layout-modern');
          else body.classList.add('layout-classic');
          
          if (pluginConfig.ENABLE_TUNE_STEP_FEATURE) body.classList.add('tune-step-enabled');
          if (pluginConfig.SHOW_LOOP_BUTTON) body.classList.add('loop-button-visible');
          if (pluginConfig.SHOW_BAND_RANGE) body.classList.add('band-range-visible');
          if (pluginConfig.LAYOUT_STYLE === 'modern' && !pluginConfig.HIDE_ALL_BUTTONS) body.classList.add('modern-buttons-visible');
        };
        
        setBodyClasses();

        observer = new MutationObserver(() => {
          setTimeout(() => {
            const freqMhz = getCurrentFrequencyInMHz();
            if (!isNaN(freqMhz)) {
              if (typeof updateVisualsByFrequency === 'function') updateVisualsByFrequency(freqMhz);
              if (pluginConfig.ENABLE_AM_BW) setTimeout(() => updateBwOptionsForMode(freqMhz), 150);
            }
          }, 0);
        });
        observer.observe(dataFrequencyElement, { characterData: true, childList: true, subtree: true });

        const limitSpanForObserver = Array.from(document.querySelectorAll('.text-small, span')).find(el => el.textContent.includes('Limit:'));
        if (limitSpanForObserver) {
            const limitObserver = new MutationObserver(updateBandButtonStates);
            limitObserver.observe(limitSpanForObserver, { childList: true, characterData: true, subtree: true });
        }

        setTimeout(() => {
          const initialFreqMhz = getCurrentFrequencyInMHz();
          if (pluginConfig.ENABLE_AM_BW) initializeBwFilter();
          if (!isNaN(initialFreqMhz)) {
            if (typeof updateVisualsByFrequency === 'function') updateVisualsByFrequency(initialFreqMhz);
            if (pluginConfig.ENABLE_AM_BW) updateBwOptionsForMode(initialFreqMhz);
          }
          if(typeof updateBandButtonStates === 'function') updateBandButtonStates();
        }, 500);

        if (pluginConfig.ENABLE_MW_STEP_TOGGLE) {
          
          const MW_STEP_STORAGE_KEY = 'mwStepPreference';
          
          const MW_BAND_AMERICAS = { name: 'MW', tune: 1.000, start: 0.530, end: 1.700, displayUnit: 'kHz' };
          const MW_BAND_INTERNATIONAL = { name: 'MW', tune: 0.999, start: 0.504, end: 1.701, displayUnit: 'kHz' };

          let is10kHzStep = localStorage.getItem(MW_STEP_STORAGE_KEY)
            ? localStorage.getItem(MW_STEP_STORAGE_KEY) === 'true'
            : (pluginConfig.TUNING_STANDARD === 'americas');

          const mwStepButton = document.createElement("button");
          mwStepButton.id = 'mw-step-toggle-button';
          mwStepButton.textContent = is10kHzStep ? '10 kHz' : '9 kHz';
          mwStepButton.title = 'Toggle MW tuning step';
          
          const updateButtonStyle = () => { mwStepButton.classList.toggle('active', is10kHzStep); };

          mwStepButton.addEventListener('click', (e) => {
            e.stopPropagation(); e.preventDefault();
            
            const originalFreq = getCurrentFrequencyInMHz();
            is10kHzStep = !is10kHzStep;
            mwStepButton.textContent = is10kHzStep ? '10 kHz' : '9 kHz';
            localStorage.setItem(MW_STEP_STORAGE_KEY, is10kHzStep);
            updateButtonStyle();

            ALL_BANDS.MW = is10kHzStep ? MW_BAND_AMERICAS : MW_BAND_INTERNATIONAL;
            const newBand = ALL_BANDS.MW;

            const newStep = is10kHzStep ? 0.010 : 0.009;
            let targetFreq = Math.round(originalFreq / newStep) * newStep;
            targetFreq = Math.max(newBand.start, Math.min(newBand.end, targetFreq));
            
            if (Math.abs(targetFreq - originalFreq) > 0.0001) tuneToFrequency(targetFreq.toFixed(3));
            if (typeof updateVisualsByFrequency === 'function') updateVisualsByFrequency(targetFreq);
          });
          
          freqContainer.appendChild(mwStepButton);
          updateButtonStyle();

          const originalUpdateVisuals = updateVisualsByFrequency;
          updateVisualsByFrequency = (freqInMHz) => {
            if (typeof originalUpdateVisuals === 'function') originalUpdateVisuals(freqInMHz);
            const isMwBandActive = (ALL_BANDS.MW && freqInMHz >= ALL_BANDS.MW.start && freqInMHz <= ALL_BANDS.MW.end);
            mwStepButton.style.display = isMwBandActive ? 'block' : 'none';
          };

          const originalTuneHandler = tuneEventHandler;
          tuneEventHandler = (event, direction) => {
            const currentFreq = getCurrentFrequencyInMHz();
            const isMwBand = (ALL_BANDS.MW && currentFreq >= ALL_BANDS.MW.start && currentFreq <= ALL_BANDS.MW.end);

            if (isMwBand) {
              if (pluginConfig.SHOW_LOOP_BUTTON && loopEnabled) {
                  const tolerance = 0.0001;
                  let looped = false;
                  if (direction === 'up' && currentFreq >= ALL_BANDS.MW.end - tolerance) {
                      tuneToFrequency(ALL_BANDS.MW.start); looped = true;
                  } else if (direction === 'down' && currentFreq <= ALL_BANDS.MW.start + tolerance) {
                      tuneToFrequency(ALL_BANDS.MW.end); looped = true;
                  }
                  if (looped) { event.preventDefault(); event.stopImmediatePropagation(); return; }
              }

              if (!handleCustomStepTune(direction)) {
                const step = is10kHzStep ? 0.010 : 0.009;
                const directionMultiplier = (direction === 'up' ? 1 : -1);
                let newFreq = Math.round((currentFreq + (step * directionMultiplier)) / step) * step;
                if (pluginConfig.SHOW_LOOP_BUTTON && loopEnabled) newFreq = Math.max(ALL_BANDS.MW.start, Math.min(ALL_BANDS.MW.end, newFreq));

                tuneToFrequency(newFreq.toFixed(3));
                event.preventDefault(); event.stopImmediatePropagation(); return;
              }
            }
            originalTuneHandler(event, direction);
          };
        }

        console.log(`[Enhanced Tuning] v3.0 loaded successfully.`);
    } catch (err) {
        console.error("[Enhanced Tuning] Krasj under bygging av UI:", err);
    }
  };

  document.addEventListener("DOMContentLoaded", async () => {
    await fetchPluginConfig(); // Laster innstillingene (har en safe try/catch inni seg)
    
    loadPluginStylesheet()
      .then(() => initializePlugin()) // Bygger UI uansett hva APIet svarer
      .catch(error => console.error("[Enhanced Tuning] Error under lasting:", error));
  });
})();
