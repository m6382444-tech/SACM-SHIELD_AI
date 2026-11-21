/**
 * ScamShield AI - Main Application Controller
 * Handles Navigation, API calls, Voice AI orchestration, Leaflet Maps,
 * Multilingual rendering, and Demo Presets.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- Initialize Subsystems ---
  const voiceAi = new VoiceAiEngine();
  const audioCanvas = document.getElementById('audioVisualizerCanvas');
  voiceAi.setCanvas(audioCanvas);

  let currentLang = 'en';
  let activeTab = 'home';
  let phoneMapViewer = null;
  let qrScannerManager = null;
  let currentResultData = null;

  // --- Quiz State ---
  const QUIZ_QUESTIONS = [
    {
      id: 1,
      title: 'Scenario 1: Bank KYC Urgent SMS',
      message: 'Dear Customer, your SBI account will be blocked today within 24 hours. Click http://sbi-kyc-verify.top to update your PAN immediately.',
      sender: 'VM-SBIBNK',
      correctAnswer: 'scam',
      explanation: 'Scam! Banks never send unverified shortlinks (.top) or threaten 24-hour blockages via SMS.'
    },
    {
      id: 2,
      title: 'Scenario 2: WhatsApp Part-Time Job',
      message: 'Hello! I am Sarah from HR. Earn ₹5000 daily just by liking 5 YouTube videos. Payouts every 30 mins. Contact manager on Telegram @FastCash.',
      sender: '+234 801 234 5678',
      correctAnswer: 'scam',
      explanation: 'Scam! This is a classic YouTube task fraud designed to lure you into a fake crypto/recharge trap.'
    },
    {
      id: 3,
      title: 'Scenario 3: OLX Buyer QR Code',
      message: 'Buyer says: "I am sending you this QR code. Just scan it on Google Pay and enter your UPI PIN to receive the advance payment of ₹12,000."',
      sender: 'Buyer on OLX',
      correctAnswer: 'scam',
      explanation: 'Scam! You NEVER scan a QR code or enter your PIN to receive money. Scanning a QR code always sends money!'
    },
    {
      id: 4,
      title: 'Scenario 4: Genuine Bank Debit Alert',
      message: 'Rs. 2,500.00 debited from A/C XX4102 on 21-Nov-26 at ATM-SBI COLABA. Avail Bal: Rs. 38,150.00. Txn Ref: 43261789. If not done by you, SMS BLOCK to 567676.',
      sender: 'VK-SBIPAY',
      correctAnswer: 'safe',
      explanation: 'Genuine! This is an official transactional notification with masked account number, ATM location, and official shortcode.'
    },
    {
      id: 5,
      title: 'Scenario 5: Electricity Disconnection Notice',
      message: 'Dear Consumer, your electricity power will be disconnected tonight at 9:30 PM because last month bill is pending. Immediately call power officer at 9876543210.',
      sender: '+91 98765 43210',
      correctAnswer: 'scam',
      explanation: 'Scam! Power utility boards do not disconnect power on the same night or instruct you to call personal mobile numbers.'
    }
  ];
  let quizIndex = 0;
  let quizScore = 0;

  // --- DOM Elements ---
  const langSelect = document.getElementById('langSelect');
  const voiceToggleBtn = document.getElementById('voiceToggleBtn');
  const autoNarrateToggle = document.getElementById('autoNarrateToggle');
  const demoModal = document.getElementById('demoModal');
  const demoPresetsList = document.getElementById('demoPresetsList');
  const openDemoBtn = document.getElementById('openDemoBtn');
  const heroDemoBtn = document.getElementById('heroDemoBtn');
  const closeDemoModalBtn = document.getElementById('closeDemoModalBtn');

  // Result Drawer Elements
  const resultDrawer = document.getElementById('resultDrawer');
  const closeResultDrawerBtn = document.getElementById('closeResultDrawerBtn');
  const listenVoiceBtn = document.getElementById('listenVoiceBtn');
  const stopVoiceBtn = document.getElementById('stopVoiceBtn');
  const riskGaugeFill = document.getElementById('riskGaugeFill');
  const riskScoreDisplay = document.getElementById('riskScoreDisplay');
  const threatBadgeDisplay = document.getElementById('threatBadgeDisplay');
  const scamCategoryTag = document.getElementById('scamCategoryTag');
  const redFlagsContainer = document.getElementById('redFlagsContainer');
  const safetyAdviceContainer = document.getElementById('safetyAdviceContainer');
  const phoneResultSection = document.getElementById('phoneResultSection');
  const qrResultSection = document.getElementById('qrResultSection');

  // Navigation Links
  const navTabs = document.querySelectorAll('[data-tab-target]');
  const tabPanels = document.querySelectorAll('.tab-panel');

  // --- Initialize App ---
  initApp();

  function initApp() {
    setupNavigation();
    setupLanguageSelector();
    setupVoiceControls();
    setupDemoPresets();
    setupForms();
    setupIncidentSolver();
    setupComplaintGenerator();
    setupQuiz();
    setupSpeechRecognitionButtons();
    loadLiveStats();
    loadHelplinesDirectory();
    updateUiLanguage(currentLang);
  }

  // --- Navigation ---
  function setupNavigation() {
    navTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = tab.getAttribute('data-tab-target');
        switchTab(targetTab);
      });
    });
  }

  function switchTab(tabId) {
    activeTab = tabId;
    navTabs.forEach(t => {
      if (t.getAttribute('data-tab-target') === tabId) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    tabPanels.forEach(panel => {
      if (panel.id === `tab-${tabId}`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Invalidate map if switching to phone tab with map rendered
    if (tabId === 'phone' && phoneMapViewer) {
      setTimeout(() => phoneMapViewer.resize(), 200);
    }
  }

  // --- Language Management ---
  function setupLanguageSelector() {
    if (!langSelect) return;
    langSelect.addEventListener('change', (e) => {
      currentLang = e.target.value;
      voiceAi.setLanguage(currentLang);
      updateUiLanguage(currentLang);

      // If results are open, update voice narration text
      if (currentResultData && currentResultData.narratorScripts) {
        const text = currentResultData.narratorScripts[currentLang] || currentResultData.narratorScripts.en;
        if (voiceAi.isSpeaking) {
          voiceAi.speak(text);
        }
      }
    });
  }

  function updateUiLanguage(lang) {
    const dict = (window.TRANSLATIONS && window.TRANSLATIONS[lang]) || window.TRANSLATIONS.en;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.setAttribute('placeholder', dict[key]);
      }
    });

    // Update RTL for Arabic
    if (lang === 'ar') {
      document.body.setAttribute('dir', 'rtl');
    } else {
      document.body.setAttribute('dir', 'ltr');
    }
  }

  // --- Voice AI Narrator Controls ---
  function setupVoiceControls() {
    if (voiceToggleBtn) {
      voiceToggleBtn.addEventListener('click', () => {
        const isMuted = voiceAi.toggleMute();
        voiceToggleBtn.classList.toggle('muted', isMuted);
        const icon = voiceToggleBtn.querySelector('.voice-icon');
        const text = voiceToggleBtn.querySelector('.voice-label');
        if (isMuted) {
          icon.innerHTML = `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clip-rule="evenodd" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>`;
          if (text) text.textContent = 'Voice Muted';
        } else {
          icon.innerHTML = `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>`;
          if (text) text.textContent = 'Voice AI';
        }
      });
    }

    if (autoNarrateToggle) {
      autoNarrateToggle.addEventListener('change', (e) => {
        voiceAi.isAutoNarrateEnabled = e.target.checked;
      });
    }

    if (listenVoiceBtn) {
      listenVoiceBtn.addEventListener('click', () => {
        if (!currentResultData || !currentResultData.narratorScripts) return;
        const script = currentResultData.narratorScripts[currentLang] || currentResultData.narratorScripts.en;
        voiceAi.speak(script, () => {
          listenVoiceBtn.style.display = 'none';
          stopVoiceBtn.style.display = 'inline-flex';
        }, () => {
          listenVoiceBtn.style.display = 'inline-flex';
          stopVoiceBtn.style.display = 'none';
        });
      });
    }

    if (stopVoiceBtn) {
      stopVoiceBtn.addEventListener('click', () => {
        voiceAi.stop();
        listenVoiceBtn.style.display = 'inline-flex';
        stopVoiceBtn.style.display = 'none';
      });
    }
  }

  // --- Speech Recognition (Mic Input) ---
  function setupSpeechRecognitionButtons() {
    document.querySelectorAll('.btn-mic').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-mic-target');
        const targetInput = document.getElementById(targetId);
        if (!targetInput) return;

        btn.classList.add('mic-active');
        voiceAi.startVoiceInput((transcript) => {
          if (targetInput.value) {
            targetInput.value += ' ' + transcript;
          } else {
            targetInput.value = transcript;
          }
        }, (status) => {
          if (status !== 'LISTENING') {
            btn.classList.remove('mic-active');
          }
        });
      });
    });
  }

  // --- Demo Presets Modal & Loader ---
  function setupDemoPresets() {
    const openModal = () => {
      loadDemoPresetsList();
      demoModal.classList.add('active');
    };

    const closeModal = () => {
      demoModal.classList.remove('active');
    };

    if (openDemoBtn) openDemoBtn.addEventListener('click', openModal);
    if (heroDemoBtn) heroDemoBtn.addEventListener('click', openModal);
    if (closeDemoModalBtn) closeDemoModalBtn.addEventListener('click', closeModal);

    demoModal.addEventListener('click', (e) => {
      if (e.target === demoModal) closeModal();
    });
  }

  async function loadDemoPresetsList() {
    try {
      const res = await fetch('/api/presets');
      const data = await res.json();
      if (!data.success || !data.presets) return;

      demoPresetsList.innerHTML = '';
      data.presets.forEach(preset => {
        const card = document.createElement('div');
        card.className = 'demo-preset-card';
        card.innerHTML = `
          <div class="preset-card-top">
            <span class="preset-badge badge-${preset.category}">${preset.badge}</span>
            <span class="preset-channel-tag">${preset.category.toUpperCase()}</span>
          </div>
          <h4 class="preset-title">${preset.title}</h4>
          <p class="preset-desc">${preset.description}</p>
          <button class="btn btn-primary btn-sm btn-load-preset">Run Demo</button>
        `;

        card.querySelector('.btn-load-preset').addEventListener('click', () => {
          demoModal.classList.remove('active');
          runPreset(preset);
        });

        demoPresetsList.appendChild(card);
      });
    } catch (e) {
      console.warn('Failed to load presets:', e);
    }
  }

  function runPreset(preset) {
    if (preset.category === 'sms') {
      switchTab('sms');
      document.getElementById('smsSenderInput').value = preset.data.sender || '';
      document.getElementById('smsMessageInput').value = preset.data.message || '';
      document.getElementById('smsForm').dispatchEvent(new Event('submit'));
    } else if (preset.category === 'whatsapp') {
      switchTab('whatsapp');
      document.getElementById('waSenderInput').value = preset.data.sender || '';
      document.getElementById('waMessageInput').value = preset.data.message || '';
      document.getElementById('waForwardedCheck').checked = preset.data.message.includes('Forwarded');
      document.getElementById('whatsappForm').dispatchEvent(new Event('submit'));
    } else if (preset.category === 'phone') {
      switchTab('phone');
      document.getElementById('phoneNumberInput').value = preset.data.phoneNumber || '';
      document.getElementById('phoneForm').dispatchEvent(new Event('submit'));
    } else if (preset.category === 'qr') {
      switchTab('qr');
      document.getElementById('qrPayloadInput').value = preset.data.qrPayload || '';
      document.getElementById('qrForm').dispatchEvent(new Event('submit'));
    } else if (preset.category === 'email') {
      switchTab('email');
      document.getElementById('emailFromName').value = preset.data.fromName || '';
      document.getElementById('emailFromAddress').value = preset.data.fromEmail || '';
      document.getElementById('emailReplyTo').value = preset.data.replyTo || '';
      document.getElementById('emailSubject').value = preset.data.subject || '';
      document.getElementById('emailBody').value = preset.data.body || '';
      document.getElementById('emailForm').dispatchEvent(new Event('submit'));
    }
  }

  // --- Form Handlers ---
  function setupForms() {
    // 1. SMS Form
    const smsForm = document.getElementById('smsForm');
    if (smsForm) {
      smsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = document.getElementById('smsMessageInput').value.trim();
        const sender = document.getElementById('smsSenderInput').value.trim();
        if (!message) return;

        showLoading();
        try {
          const res = await fetch('/api/verify/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, sender, channel: 'SMS' })
          });
          const result = await res.json();
          renderResult(result, 'SMS');
        } catch (err) {
          alert('Verification failed. Please try again.');
        } finally {
          hideLoading();
        }
      });
    }

    // 2. WhatsApp Form
    const whatsappForm = document.getElementById('whatsappForm');
    if (whatsappForm) {
      whatsappForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = document.getElementById('waMessageInput').value.trim();
        const sender = document.getElementById('waSenderInput').value.trim();
        const isForwarded = document.getElementById('waForwardedCheck').checked;
        if (!message) return;

        showLoading();
        try {
          const res = await fetch('/api/verify/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, sender, isForwarded })
          });
          const result = await res.json();
          renderResult(result, 'WHATSAPP');
        } catch (err) {
          alert('Verification failed. Please try again.');
        } finally {
          hideLoading();
        }
      });
    }

    // 3. Phone & Caller GPS Form
    const phoneForm = document.getElementById('phoneForm');
    if (phoneForm) {
      phoneForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phoneNumber = document.getElementById('phoneNumberInput').value.trim();
        if (!phoneNumber) return;

        showLoading();
        try {
          const res = await fetch('/api/verify/phone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber })
          });
          const result = await res.json();
          if (result.error) {
            alert(result.error);
            return;
          }
          renderResult(result, 'PHONE');
        } catch (err) {
          alert('Phone lookup failed. Please try again.');
        } finally {
          hideLoading();
        }
      });
    }

    // 4. QR Form & Scanner
    const qrForm = document.getElementById('qrForm');
    const qrFileInput = document.getElementById('qrFileInput');
    const qrUploadBtn = document.getElementById('qrUploadBtn');
    const qrCameraBtn = document.getElementById('qrCameraBtn');
    const qrCameraContainer = document.getElementById('qrCameraContainer');
    const qrVideo = document.getElementById('qrVideo');
    const qrCanvas = document.getElementById('qrCanvas');
    const qrStopCameraBtn = document.getElementById('qrStopCameraBtn');

    if (qrUploadBtn && qrFileInput) {
      qrUploadBtn.addEventListener('click', () => qrFileInput.click());
      qrFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!qrScannerManager) {
          qrScannerManager = new QrScannerManager(qrVideo, qrCanvas, (data) => {
            document.getElementById('qrPayloadInput').value = data;
            qrForm.dispatchEvent(new Event('submit'));
          });
        }

        showLoading('Decoding QR Image...');
        qrScannerManager.decodeImageFile(file, (err, decodedData) => {
          hideLoading();
          if (err) {
            alert(err.message);
          } else {
            document.getElementById('qrPayloadInput').value = decodedData;
            qrForm.dispatchEvent(new Event('submit'));
          }
        });
      });
    }

    if (qrCameraBtn) {
      qrCameraBtn.addEventListener('click', () => {
        if (!qrScannerManager) {
          qrScannerManager = new QrScannerManager(qrVideo, qrCanvas, (data) => {
            qrCameraContainer.style.display = 'none';
            document.getElementById('qrPayloadInput').value = data;
            qrForm.dispatchEvent(new Event('submit'));
          });
        }
        qrCameraContainer.style.display = 'block';
        qrScannerManager.startCamera();
      });
    }

    if (qrStopCameraBtn) {
      qrStopCameraBtn.addEventListener('click', () => {
        if (qrScannerManager) qrScannerManager.stopCamera();
        qrCameraContainer.style.display = 'none';
      });
    }

    if (qrForm) {
      qrForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const qrPayload = document.getElementById('qrPayloadInput').value.trim();
        if (!qrPayload) return;

        showLoading();
        try {
          const res = await fetch('/api/verify/qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qrPayload })
          });
          const result = await res.json();
          renderResult(result, 'QR');
        } catch (err) {
          alert('QR verification failed. Please try again.');
        } finally {
          hideLoading();
        }
      });
    }

    // 5. Email Form
    const emailForm = document.getElementById('emailForm');
    if (emailForm) {
      emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fromName = document.getElementById('emailFromName').value.trim();
        const fromEmail = document.getElementById('emailFromAddress').value.trim();
        const replyTo = document.getElementById('emailReplyTo').value.trim();
        const subject = document.getElementById('emailSubject').value.trim();
        const body = document.getElementById('emailBody').value.trim();
        const attachmentName = document.getElementById('emailAttachment').value.trim();

        showLoading();
        try {
          const res = await fetch('/api/verify/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromName, fromEmail, replyTo, subject, body, attachmentName })
          });
          const result = await res.json();
          renderResult(result, 'EMAIL');
        } catch (err) {
          alert('Email verification failed. Please try again.');
        } finally {
          hideLoading();
        }
      });
    }

    // 6. Image & Screenshot Form
    const imageUploadArea = document.getElementById('imageUploadArea');
    const imageFileInput = document.getElementById('imageFileInput');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreviewImg = document.getElementById('imagePreviewImg');
    const imageOcrText = document.getElementById('imageOcrText');
    const imageForm = document.getElementById('imageForm');
    let selectedImageFile = null;

    if (imageUploadArea && imageFileInput) {
      imageUploadArea.addEventListener('click', () => imageFileInput.click());

      imageFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        selectedImageFile = file;

        // Preview
        const reader = new FileReader();
        reader.onload = (ev) => {
          imagePreviewImg.src = ev.target.result;
          imagePreviewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);

        // Pre-fill realistic OCR simulation if client OCR isn't loaded
        if (!imageOcrText.value) {
          imageOcrText.value = `Payment Successful!\nPaid to: SBI Quick Settlement Service\nAmount: Rs. 15,000.00\nStatus: Completed\nNote: Advance for Goods Delivery`;
        }
      });
    }

    if (imageForm) {
      imageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const extractedText = imageOcrText.value.trim();
        if (!extractedText && !selectedImageFile) {
          alert('Please upload an image or provide text to analyze.');
          return;
        }

        showLoading('Analyzing Image & OCR Data...');
        try {
          const formData = new FormData();
          if (selectedImageFile) {
            formData.append('imageFile', selectedImageFile);
          }
          formData.append('extractedText', extractedText);

          const res = await fetch('/api/verify/image', {
            method: 'POST',
            body: formData
          });
          const result = await res.json();
          renderResult(result, 'IMAGE');
        } catch (err) {
          alert('Image analysis failed. Please try again.');
        } finally {
          hideLoading();
        }
      });
    }

    // 7. Report Scam Form
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
      reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('reportType').value;
        const target = document.getElementById('reportTarget').value.trim();
        const category = document.getElementById('reportCategory').value.trim();
        const details = document.getElementById('reportDetails').value.trim();

        if (!target || !category) return;

        try {
          const res = await fetch('/api/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, target, category, details })
          });
          const data = await res.json();
          if (data.success) {
            alert('Thank you! Your scam report has been added to the community database.');
            reportForm.reset();
            loadLiveStats();
            switchTab('home');
          }
        } catch (e) {
          alert('Failed to submit report. Please try again.');
        }
      });
    }

    // Close Result Drawer
    if (closeResultDrawerBtn) {
      closeResultDrawerBtn.addEventListener('click', () => {
        resultDrawer.classList.remove('active');
        voiceAi.stop();
      });
    }
  }

  // --- Render Result Drawer ---
  function renderResult(result, type = 'SMS') {
    currentResultData = result;

    // Reset sections
    phoneResultSection.style.display = 'none';
    qrResultSection.style.display = 'none';

    // 1. Risk Score and Gauge
    const score = result.riskScore || 0;
    riskScoreDisplay.textContent = `${score}%`;
    riskGaugeFill.style.width = `${score}%`;

    // Colors
    if (score >= 75) {
      riskGaugeFill.style.backgroundColor = '#ef4444'; // critical red
    } else if (score >= 50) {
      riskGaugeFill.style.backgroundColor = '#f97316'; // orange
    } else if (score >= 25) {
      riskGaugeFill.style.backgroundColor = '#eab308'; // yellow
    } else {
      riskGaugeFill.style.backgroundColor = '#10b981'; // green
    }

    // 2. Threat Verdict Badge
    const dict = (window.TRANSLATIONS && window.TRANSLATIONS[currentLang]) || window.TRANSLATIONS.en;
    if (result.isScam) {
      threatBadgeDisplay.className = 'threat-badge badge-danger';
      threatBadgeDisplay.textContent = dict.threatVerdictScam;
      voiceAi.playChime('scam');
    } else if (result.threatLevel === 'MEDIUM') {
      threatBadgeDisplay.className = 'threat-badge badge-warning';
      threatBadgeDisplay.textContent = dict.threatVerdictMedium;
      voiceAi.playChime('scam');
    } else {
      threatBadgeDisplay.className = 'threat-badge badge-safe';
      threatBadgeDisplay.textContent = dict.threatVerdictSafe;
      voiceAi.playChime('safe');
    }

    // 3. Category Tag
    scamCategoryTag.textContent = result.scamType || result.spamCategory || result.qrType || 'Phishing Analysis';

    // 4. Red Flags List
    redFlagsContainer.innerHTML = '';
    if (result.redFlags && result.redFlags.length > 0) {
      result.redFlags.forEach(flag => {
        const item = document.createElement('div');
        item.className = 'red-flag-item';
        item.innerHTML = `
          <div class="red-flag-icon">⚠️</div>
          <div class="red-flag-content">
            <strong>${flag.title}</strong>
            <p>${flag.description}</p>
          </div>
        `;
        redFlagsContainer.appendChild(item);
      });
    } else {
      redFlagsContainer.innerHTML = `<div class="safe-note">✓ No malicious indicators or deceptive urgency triggers detected.</div>`;
    }

    // 5. Component Probabilities Breakdown
    const compProbArea = document.getElementById('resComponentProbArea');
    const compProbList = document.getElementById('resComponentProbsList');
    if (compProbArea && compProbList) {
      if (result.componentProbabilities) {
        compProbArea.style.display = 'block';
        compProbList.innerHTML = '';
        const cp = result.componentProbabilities;

        const labelsMap = {
          overallScamProbability: 'Overall Composite Scam Probability',
          visualTamperingProbability: 'Visual Manipulation & Layout Distortion',
          bankReferenceIntegrityRisk: 'Bank Reference (UTR) Integrity Risk',
          urgencyLinguisticProbability: 'Artificial Urgency & Threat Index',
          entityImpersonationProbability: 'Brand / Bank Impersonation Likelihood',
          carrierRiskProbability: 'Carrier Line & PBX Routing Risk',
          voipSpoofProbability: 'Virtual VoIP Number Spoofing Probability',
          spamReportProbability: 'Community Fraud Reports Confidence',
          geographicRiskProbability: 'Telecom Circle Risk Weighting',
          linkDeceptionProbability: 'Malicious Link & Domain Deception',
          credentialHarvestingRisk: 'Credential & OTP Harvesting Hazard'
        };

        for (const [key, val] of Object.entries(cp)) {
          const numVal = parseFloat(val) || 0;
          const label = labelsMap[key] || key;
          const barItem = document.createElement('div');
          barItem.className = 'prob-bar-item';
          const fillClass = numVal >= 70 ? 'fill-danger' : (numVal >= 40 ? 'fill-warning' : 'fill-safe');
          barItem.innerHTML = `
            <div class="prob-bar-labels">
              <span>${label}</span>
              <strong>${numVal.toFixed(1)}%</strong>
            </div>
            <div class="prob-bar-track">
              <div class="prob-bar-fill ${fillClass}" style="width: ${numVal}%;"></div>
            </div>
          `;
          compProbList.appendChild(barItem);
        }
      } else {
        compProbArea.style.display = 'none';
      }
    }

    // 6. Safety Advice Checklist
    safetyAdviceContainer.innerHTML = '';
    if (result.safetyAdvice && result.safetyAdvice.length > 0) {
      result.safetyAdvice.forEach(adv => {
        const item = document.createElement('li');
        item.textContent = adv;
        safetyAdviceContainer.appendChild(item);
      });
    }

    // 6. Type Specific Details
    if (type === 'PHONE' && result.gps) {
      phoneResultSection.style.display = 'block';
      document.getElementById('resCallerName').textContent = result.name || 'Not Listed';
      document.getElementById('resCarrier').textContent = result.carrier || 'Unknown Operator';
      document.getElementById('resLineType').textContent = result.lineType || 'Mobile';
      document.getElementById('resCircle').textContent = result.telecomCircle || 'National';
      document.getElementById('resReportsCount').textContent = result.reportsCount || '0';
      document.getElementById('resGpsCoords').textContent = `${result.gps.lat}° N, ${result.gps.lng}° E`;
      document.getElementById('resExchangeAddress').textContent = result.gps.address || 'Telecom Base Station';

      // Render Leaflet Map
      if (!phoneMapViewer) {
        phoneMapViewer = new PhoneMapViewer('phoneMapContainer');
      }
      setTimeout(() => {
        phoneMapViewer.renderLocation(result.gps, result.isScam, result.name);
      }, 150);
    }

    if (type === 'QR' && result.detailedAnalysis) {
      qrResultSection.style.display = 'block';
      const da = result.detailedAnalysis;
      let qrDetailsHtml = '';
      if (result.qrType === 'UPI_PAYMENT') {
        qrDetailsHtml = `
          <div class="upi-alert-banner">
            🚨 <b>UPI PAYMENT REQUEST DETECTED</b><br/>
            Payee Name: <b>${da.payeeName}</b><br/>
            UPI VPA: <b>${da.payeeVpa}</b><br/>
            Amount: <b>${da.amount}</b><br/>
            <span class="warning-text">Scanning this QR will TRANSFER MONEY OUT of your account!</span>
          </div>
        `;
      } else if (result.qrType === 'URL') {
        qrDetailsHtml = `
          <div class="qr-url-box">
            <b>Destination URL:</b> <a href="${da.destinationUrl}" target="_blank" rel="noopener noreferrer">${da.destinationUrl}</a><br/>
            <b>Domain:</b> ${da.domain} (${da.isHttps ? 'HTTPS Encrypted' : 'Plain HTTP Insecure'})
          </div>
        `;
      }
      document.getElementById('qrDetailsBox').innerHTML = qrDetailsHtml;
    }

    // Open Result Drawer
    resultDrawer.classList.add('active');

    // Trigger Voice AI Narration
    if (voiceAi.isAutoNarrateEnabled && !voiceAi.isMuted && result.narratorScripts) {
      const script = result.narratorScripts[currentLang] || result.narratorScripts.en;
      voiceAi.speak(script, () => {
        listenVoiceBtn.style.display = 'none';
        stopVoiceBtn.style.display = 'inline-flex';
      }, () => {
        listenVoiceBtn.style.display = 'inline-flex';
        stopVoiceBtn.style.display = 'none';
      });
    }
  }

  // --- Scam IQ Quiz ---
  function setupQuiz() {
    renderQuizQuestion();

    const quizScamBtn = document.getElementById('quizScamBtn');
    const quizSafeBtn = document.getElementById('quizSafeBtn');
    const quizNextBtn = document.getElementById('quizNextBtn');

    if (quizScamBtn) {
      quizScamBtn.addEventListener('click', () => handleQuizAnswer('scam'));
    }
    if (quizSafeBtn) {
      quizSafeBtn.addEventListener('click', () => handleQuizAnswer('safe'));
    }
    if (quizNextBtn) {
      quizNextBtn.addEventListener('click', () => {
        quizIndex++;
        if (quizIndex >= QUIZ_QUESTIONS.length) {
          showQuizSummary();
        } else {
          renderQuizQuestion();
        }
      });
    }
  }

  function renderQuizQuestion() {
    const q = QUIZ_QUESTIONS[quizIndex];
    document.getElementById('quizProgress').textContent = `Question ${quizIndex + 1} of ${QUIZ_QUESTIONS.length}`;
    document.getElementById('quizScenarioTitle').textContent = q.title;
    document.getElementById('quizSenderBadge').textContent = `Sender: ${q.sender}`;
    document.getElementById('quizMessageText').textContent = q.message;

    document.getElementById('quizActionBtns').style.display = 'flex';
    document.getElementById('quizFeedbackBox').style.display = 'none';
    document.getElementById('quizNextBtn').style.display = 'none';
  }

  function handleQuizAnswer(userChoice) {
    const q = QUIZ_QUESTIONS[quizIndex];
    const isCorrect = userChoice === q.correctAnswer;
    if (isCorrect) quizScore++;

    const feedbackBox = document.getElementById('quizFeedbackBox');
    feedbackBox.style.display = 'block';
    feedbackBox.className = `quiz-feedback ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`;
    feedbackBox.innerHTML = `
      <h4>${isCorrect ? '🎉 Correct Answer!' : '❌ Incorrect!'}</h4>
      <p>${q.explanation}</p>
    `;

    document.getElementById('quizActionBtns').style.display = 'none';
    document.getElementById('quizNextBtn').style.display = 'inline-flex';

    // Narrate Quiz Feedback
    if (!voiceAi.isMuted) {
      voiceAi.speak(isCorrect ? `Correct! ${q.explanation}` : `Watch out! ${q.explanation}`);
    }
  }

  function showQuizSummary() {
    const container = document.getElementById('quizCardContainer');
    container.innerHTML = `
      <div class="quiz-summary-card">
        <h3>🏆 Quiz Completed!</h3>
        <p class="quiz-score-display">Your Scam IQ Score: <b>${quizScore} / ${QUIZ_QUESTIONS.length}</b></p>
        <p>${quizScore >= 4 ? 'Excellent! You have strong vigilance against digital fraud.' : 'Stay alert! Review our verification tools to protect yourself.'}</p>
        <button class="btn btn-primary" onclick="location.reload()">Restart Quiz</button>
      </div>
    `;
  }

  // --- AI Incident Solver (Paste Your Problem) ---
  let lastIncidentAnalysis = null;

  function setupIncidentSolver() {
    // Quick scenario chips
    document.querySelectorAll('.btn-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const sample = chip.getAttribute('data-sample-problem');
        const input = document.getElementById('incidentStoryInput');
        if (input && sample) {
          input.value = sample;
        }
      });
    });

    const incidentForm = document.getElementById('incidentForm');
    if (incidentForm) {
      incidentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const problemText = document.getElementById('incidentStoryInput').value.trim();
        if (!problemText) return;

        showLoading('Analyzing Fraud Incident & Crafting Rescue Plan...');
        try {
          const res = await fetch('/api/incident/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ problemText })
          });
          const data = await res.json();
          if (data.error) {
            alert(data.error);
            return;
          }
          lastIncidentAnalysis = data;
          renderIncidentResults(data);
        } catch (err) {
          alert('Failed to analyze problem. Please try again.');
        } finally {
          hideLoading();
        }
      });
    }

    // Pre-fill button to complaint generator
    const btnPreFill = document.getElementById('btnPreFillComplaint');
    if (btnPreFill) {
      btnPreFill.addEventListener('click', () => {
        if (!lastIncidentAnalysis) return;
        switchTab('recovery');

        // Pre-fill values
        if (lastIncidentAnalysis.detectedAmount && lastIncidentAnalysis.detectedAmount !== 'Undetermined / Not specified') {
          const amtInput = document.getElementById('compAmountLost');
          if (amtInput) amtInput.value = lastIncidentAnalysis.detectedAmount.replace(/[^0-9,]/g, '');
        }

        const suspects = lastIncidentAnalysis.suspectsFound || {};
        if (suspects.phones && suspects.phones.length > 0) {
          const phoneInput = document.getElementById('compScammerPhone');
          if (phoneInput) phoneInput.value = suspects.phones.join(', ');
        }
        if (suspects.upiIds && suspects.upiIds.length > 0) {
          const upiInput = document.getElementById('compScammerUpi');
          if (upiInput) upiInput.value = suspects.upiIds.join(', ');
        }

        const storyInput = document.getElementById('compIncidentStory');
        const rawStory = document.getElementById('incidentStoryInput').value;
        if (storyInput && rawStory) {
          storyInput.value = rawStory;
        }

        window.scrollTo({ top: 400, behavior: 'smooth' });
      });
    }
  }

  function renderIncidentResults(data) {
    const area = document.getElementById('incidentResultsArea');
    if (!area) return;

    area.style.display = 'block';

    document.getElementById('incDetectedCategory').textContent = data.detectedCategory || 'Cyber Fraud Incident';
    document.getElementById('incDetectedLoss').textContent = data.hasFinancialLoss
      ? (data.detectedAmount ? `Rs. ${data.detectedAmount}` : 'Financial Transfer Indicated')
      : 'No Immediate Financial Loss';

    const cp = data.componentProbabilities || {};
    const overallProb = cp.overallScamProbability || 95.0;
    document.getElementById('incOverallProb').textContent = `${overallProb}%`;

    // Bars
    setProbBar('probFinancial', 'fillFinancial', cp.financialLossProbability || 90);
    setProbBar('probIdentity', 'fillIdentity', cp.identityTheftProbability || 85);
    setProbBar('probDevice', 'fillDevice', cp.deviceCompromiseProbability || 60);
    setProbBar('probUrgency', 'fillUrgency', cp.urgencySeverityProbability || 90);

    // Suspects
    const suspectsBox = document.getElementById('incSuspectsBox');
    const tagsBox = document.getElementById('incSuspectsTags');
    const suspects = data.suspectsFound || {};
    const allSuspects = [...(suspects.phones || []), ...(suspects.upiIds || []), ...(suspects.links || [])];

    if (allSuspects.length > 0) {
      suspectsBox.style.display = 'block';
      tagsBox.innerHTML = '';
      allSuspects.forEach(s => {
        const pill = document.createElement('span');
        pill.className = 'suspect-tag-pill';
        pill.textContent = s;
        tagsBox.appendChild(pill);
      });
    } else {
      suspectsBox.style.display = 'none';
    }

    // Recovery Tutorials Timeline
    const timeline = document.getElementById('incRecoveryTimeline');
    timeline.innerHTML = '';
    (data.recoveryRoadmap || []).forEach(step => {
      const card = document.createElement('div');
      card.className = `timeline-step-card ${step.severity === 'CRITICAL' ? 'severity-critical' : ''}`;
      card.innerHTML = `
        <div class="timeline-step-title-row">
          <span class="timeline-step-title">${step.icon || '🛡️'} Step ${step.stepNumber}: ${step.title}</span>
          <span class="preset-badge ${step.severity === 'CRITICAL' ? 'badge-phone' : 'badge-whatsapp'}">${step.severity}</span>
        </div>
        <ul class="timeline-step-instructions">
          ${step.instructions.map(inst => `<li>${inst}</li>`).join('')}
        </ul>
      `;
      timeline.appendChild(card);
    });

    area.scrollIntoView({ behavior: 'smooth' });

    // Voice AI Narration
    if (voiceAi.isAutoNarrateEnabled && !voiceAi.isMuted) {
      voiceAi.speak(`Incident analyzed! Identified as ${data.detectedCategory} with a ${overallProb}% risk severity. Step 1: ${data.recommendedNextStep}`);
    }
  }

  function setProbBar(numId, fillId, val) {
    const numEl = document.getElementById(numId);
    const fillEl = document.getElementById(fillId);
    if (numEl) numEl.textContent = `${val.toFixed(1)}%`;
    if (fillEl) fillEl.style.width = `${val}%`;
  }

  // --- Complaint Generator Form ---
  function setupComplaintGenerator() {
    const complaintForm = document.getElementById('complaintForm');
    const outputCard = document.getElementById('complaintOutputCard');
    const outputPre = document.getElementById('complaintDraftPre');
    const btnCopy = document.getElementById('btnCopyComplaint');
    const btnEmail = document.getElementById('btnEmailPolice');

    if (complaintForm) {
      complaintForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
          victimName: document.getElementById('compVictimName').value.trim(),
          victimPhone: document.getElementById('compVictimPhone').value.trim(),
          victimEmail: document.getElementById('compVictimEmail').value.trim(),
          victimAddress: document.getElementById('compVictimAddress').value.trim(),
          bankName: document.getElementById('compBankName').value.trim(),
          accountNumberMasked: document.getElementById('compAccountMasked').value.trim(),
          amountLost: document.getElementById('compAmountLost').value.trim(),
          utrNumber: document.getElementById('compUtrNumber').value.trim(),
          scammerPhone: document.getElementById('compScammerPhone').value.trim(),
          scammerUpiOrAccount: document.getElementById('compScammerUpi').value.trim(),
          incidentStory: document.getElementById('compIncidentStory').value.trim()
        };

        showLoading('Drafting Formal Legal Complaint Letter...');
        try {
          const res = await fetch('/api/complaint/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.complaintText) {
            outputPre.textContent = data.complaintText;
            outputCard.style.display = 'block';

            // Configure Email Button with pre-filled mailto
            const mailtoSubject = encodeURIComponent(`URGENT: Financial Cyber Fraud Incident Report - Ref ${data.refId}`);
            const mailtoBody = encodeURIComponent(data.complaintText);
            btnEmail.href = `mailto:cybercrime-incident@mha.gov.in?subject=${mailtoSubject}&body=${mailtoBody}`;

            outputCard.scrollIntoView({ behavior: 'smooth' });

            if (!voiceAi.isMuted) {
              voiceAi.speak('Your formal cyber crime complaint letter has been generated. You can copy the text or email it directly to the Cyber Crime Cell.');
            }
          }
        } catch (err) {
          alert('Failed to generate complaint letter. Please try again.');
        } finally {
          hideLoading();
        }
      });
    }

    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        if (!outputPre) return;
        navigator.clipboard.writeText(outputPre.textContent).then(() => {
          btnCopy.textContent = '✓ Copied to Clipboard!';
          setTimeout(() => btnCopy.textContent = '📋 Copy Letter', 2500);
        });
      });
    }
  }

  // --- Helplines Directory Loader ---
  async function loadHelplinesDirectory() {
    const container = document.getElementById('helplinesDirectoryList');
    if (!container) return;

    try {
      const res = await fetch('/api/helplines');
      const data = await res.json();
      if (!data.success || !data.helplines) return;

      container.innerHTML = '';
      data.helplines.forEach(h => {
        const card = document.createElement('div');
        card.className = 'helpline-card';

        // Pre-filled mailto link
        const mailSubject = encodeURIComponent(h.emailTemplate ? h.emailTemplate.subject : 'Cyber Crime Report');
        const mailBody = encodeURIComponent(h.emailTemplate ? h.emailTemplate.body : 'Incident details...');
        const mailtoHref = `mailto:${h.email}?subject=${mailSubject}&body=${mailBody}`;

        card.innerHTML = `
          <div class="helpline-card-header">
            <span class="helpline-flag">${h.flag}</span>
            <div>
              <h3>${h.country} - ${h.organization}</h3>
              <span class="helpline-org">${h.category}</span>
            </div>
          </div>
          <p class="helpline-desc">${h.description}</p>

          <div class="helpline-steps-list">
            <b>Emergency Protocol:</b>
            ${h.emergencySteps.map(s => `<span>• ${s}</span>`).join('')}
          </div>

          <div class="helpline-actions-row">
            <a href="tel:${h.phone}" class="helpline-call-btn">
              <span>📞</span> Call ${h.displayPhone}
            </a>
            <a href="${mailtoHref}" class="helpline-email-btn">
              <span>✉️</span> Email (${h.email})
            </a>
            <a href="${h.portalUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
              <span>🌐</span> Official Portal
            </a>
          </div>
        `;
        container.appendChild(card);
      });
    } catch (e) {
      console.warn('Helpline directory load error:', e);
    }
  }

  // --- Live Community Stats ---
  async function loadLiveStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (!data.success) return;

      const blockedCounter = document.getElementById('statThreatsBlocked');
      const campaignsCounter = document.getElementById('statActiveCampaigns');
      if (blockedCounter) blockedCounter.textContent = Number(data.totalThreatsBlocked).toLocaleString();
      if (campaignsCounter) campaignsCounter.textContent = data.activeScamCampaigns;

      const tickerList = document.getElementById('liveReportsTicker');
      if (tickerList && data.latestReports) {
        tickerList.innerHTML = '';
        data.latestReports.forEach(rep => {
          const item = document.createElement('div');
          item.className = 'ticker-item';
          item.innerHTML = `
            <span class="ticker-time">${rep.reportedAt}</span>
            <span class="ticker-badge badge-${rep.type.toLowerCase()}">${rep.type}</span>
            <span class="ticker-target">${rep.target}</span>
            <span class="ticker-cat">${rep.category}</span>
          `;
          tickerList.appendChild(item);
        });
      }
    } catch (e) {
      console.warn('Stats fetch error:', e);
    }
  }

  // --- Loading Overlay ---
  function showLoading(msg = 'Scanning with Cyber AI...') {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'globalLoader';
      loader.className = 'global-loader-overlay';
      loader.innerHTML = `
        <div class="loader-box">
          <div class="loader-spinner"></div>
          <div class="loader-text" id="loaderMsg">${msg}</div>
        </div>
      `;
      document.body.appendChild(loader);
    } else {
      document.getElementById('loaderMsg').textContent = msg;
      loader.style.display = 'flex';
    }
  }

  function hideLoading() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
  }
});
