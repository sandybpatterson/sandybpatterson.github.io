// reader.js — Drop into /stories/ folder alongside each story HTML
// Handles: voice selection, play/pause/stop, speed, progress, multilingual translation
// Uses: Web Speech API (voices) + MyMemory API (translation, free, no key needed)
//
// HOW IT WORKS AT A GLANCE:
//   1. On load, it pulls all <p> text out of the story body into an array.
//   2. It injects a sticky reader bar at the top of the page (styles + HTML built in JS).
//   3. Play queues every paragraph as a separate SpeechSynthesisUtterance so the
//      browser reads them one after another, highlighting each as it goes.
//   4. If the user picks a different language, the paragraphs are translated via the
//      MyMemory API before playback restarts.
//
// IIFE (Immediately Invoked Function Expression): the entire script is wrapped in
// (function(){ ... })() so that none of its variables leak into the global scope.
// This means it's safe to drop onto any page without naming conflicts.

(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────────────────────────
  // Each entry defines a language option in the UI.
  //   code:       the ISO 639-1 language code sent to the MyMemory translation API
  //   label:      display name shown in the language panel
  //   flag:       emoji flag for the language button
  //   speechLang: the BCP-47 tag used to filter Web Speech API voices
  //               (e.g. 'en-US' will prefer voices whose lang starts with 'en')
  // Apple novelty/special-effect voices built into macOS and iOS.
  // These appear in getVoices() but are not useful for reading — hide them.
  const NOVELTY_VOICES = new Set([
    'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles',
    'cellos', 'fred', 'good news', 'jester', 'junior', 'kathy',
    'organ', 'superstar', 'whisper', 'ralph', 'wobble', 'zarvox'
  ]);

  function isIOS() {
    return /iPhone|iPad|iPod/.test(navigator.userAgent);
  }

  // Returns true if the user has any non-novelty, non-Samantha English voice installed.
  // Samantha is the only pre-installed iOS English voice — anything else means
  // the user has downloaded something better.
  function hasGoodVoice() {
    const usableEnglish = allVoices.filter(v =>
      !NOVELTY_VOICES.has(v.name.toLowerCase()) &&
      v.lang.toLowerCase().startsWith('en')
    );
    return usableEnglish.some(v => {
      const n = v.name.toLowerCase();
      return n !== 'samantha'; // anything other than Samantha counts
    });
  }

  function checkVoiceQuality() {
    if (!isIOS()) return;
    if (hasGoodVoice()) return;
    if (localStorage.getItem('sbp-voice-hint-v2')) return;
    setTimeout(showVoicePrompt, 900);
  }

  function showVoicePrompt() {
    if (document.getElementById('sbp-voice-prompt')) return;
    const reader = document.getElementById('sbp-reader');
    if (!reader) return;

    const el = document.createElement('div');
    el.id = 'sbp-voice-prompt';
    el.className = 'sbp-voice-prompt';
    el.innerHTML = `
      <span class="sbp-vp-text">A much better voice is available for your iPhone — free.</span>
      <button class="sbp-vp-btn sbp-vp-yes" id="sbp-vp-yes">Set up now</button>
      <button class="sbp-vp-btn sbp-vp-no" id="sbp-vp-no">✕</button>
    `;
    reader.appendChild(el);

    document.getElementById('sbp-vp-yes').addEventListener('click', () => {
      el.remove();
      showVoiceInstructions();
    });
    // ✕ just hides for this session — does NOT set localStorage
    document.getElementById('sbp-vp-no').addEventListener('click', () => {
      el.remove();
    });
  }

  function showVoiceInstructions() {
    const overlay = document.createElement('div');
    overlay.id = 'sbp-voice-overlay';
    overlay.className = 'sbp-voice-overlay';
    overlay.innerHTML = `
      <div class="sbp-voice-modal">
        <button class="sbp-voice-close" id="sbp-voice-close">✕</button>
        <p class="sbp-vm-eyebrow">iPhone Voice Setup</p>
        <h2 class="sbp-vm-title">Download a natural&#8209;sounding voice</h2>
        <ol class="sbp-vm-steps">
          <li>Open the <strong>Settings</strong> app ⚙️</li>
          <li>Tap <strong>Accessibility</strong></li>
          <li>Tap <strong>Vision</strong> → <strong>Read &amp; Speak</strong><br><span class="sbp-vm-alt">On newer iOS: <strong>Spoken Content</strong></span></li>
          <li>Tap <strong>Voices</strong> → <strong>English</strong></li>
          <li>Find a voice with <em>Enhanced</em> — tap ⬇ to download if needed</li>
          <li>Tap the voice <strong>name</strong> to set it as your default</li>
        </ol>
        <p class="sbp-vm-note">iPhone ignores voice changes from web pages and always uses your iOS default. Setting it as default here is what actually changes what you hear. Can't find Voices? Search <strong>"voices"</strong> in the Settings search bar.</p>
        <label class="sbp-vm-toggle-row">
          <span class="sbp-vm-toggle-label">Don't remind me again</span>
          <span class="sbp-toggle">
            <input type="checkbox" id="sbp-vm-noremind">
            <span class="sbp-toggle-track"><span class="sbp-toggle-thumb"></span></span>
          </span>
        </label>
        <button class="sbp-vm-done" id="sbp-voice-done">Got it</button>
      </div>
    `;
    document.body.appendChild(overlay);

    function close() {
      if (document.getElementById('sbp-vm-noremind')?.checked) {
        localStorage.setItem('sbp-voice-hint-v2', '1');
      }
      overlay.remove();
    }
    document.getElementById('sbp-voice-close').addEventListener('click', close);
    document.getElementById('sbp-voice-done').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  }

  const LANGUAGES = [
    { code: 'en', label: 'English',    flag: '🇺🇸', speechLang: 'en-US' },
    { code: 'es', label: 'Español',    flag: '🇪🇸', speechLang: 'es-ES' },
    { code: 'fr', label: 'Français',   flag: '🇫🇷', speechLang: 'fr-FR' },
    { code: 'de', label: 'Deutsch',    flag: '🇩🇪', speechLang: 'de-DE' },
    { code: 'it', label: 'Italiano',   flag: '🇮🇹', speechLang: 'it-IT' },
    { code: 'pt', label: 'Português',  flag: '🇧🇷', speechLang: 'pt-BR' },
    { code: 'ru', label: 'Русский',    flag: '🇷🇺', speechLang: 'ru-RU' },
    { code: 'ja', label: '日本語',      flag: '🇯🇵', speechLang: 'ja-JP' },
    { code: 'zh', label: '中文',        flag: '🇨🇳', speechLang: 'zh-CN' },
    { code: 'ar', label: 'العربية',     flag: '🇸🇦', speechLang: 'ar-SA' },
    { code: 'ko', label: '한국어',       flag: '🇰🇷', speechLang: 'ko-KR' },
    { code: 'nl', label: 'Nederlands',  flag: '🇳🇱', speechLang: 'nl-NL' },
    { code: 'pl', label: 'Polski',      flag: '🇵🇱', speechLang: 'pl-PL' },
    { code: 'sv', label: 'Svenska',     flag: '🇸🇪', speechLang: 'sv-SE' },
    { code: 'hi', label: 'हिन्दी',       flag: '🇮🇳', speechLang: 'hi-IN' },
    { code: 'tr', label: 'Türkçe',      flag: '🇹🇷', speechLang: 'tr-TR' },
  ];

  // ── STATE ───────────────────────────────────────────────────────────────────
  // All mutable playback state lives here. Using plain let variables rather than
  // an object keeps the read/write syntax simple throughout the script.

  let synth = window.speechSynthesis;   // the browser's speech engine
  let utterances = [];                  // array of SpeechSynthesisUtterance, one per paragraph
  let currentIndex = 0;                 // which paragraph is currently being read
  let isPlaying = false;                // true while speech is actively running
  let isPaused = false;                 // true while synth.pause() is in effect
  let allVoices = [];                   // all voices reported by the browser
  let selectedVoice = null;             // the voice object currently chosen in the dropdown
  let currentLang = 'en';              // active language code
  let translatedParagraphs = [];        // paragraphs in the current language (may equal originalParagraphs)
  let originalParagraphs = [];          // English source text, never overwritten
  let translationCache = {};            // keyed by "lang:first40chars" to avoid re-fetching
  let speed = 1.0;                      // playback rate, controlled by the speed slider
  let translating = false;              // true while an async translation is in progress
  let autoplay = false;                 // true while autoplay-next-chapter is enabled


  // ── EXTRACT STORY TEXT ───────────────────────────────────────────────────────
  // Pulls all readable paragraphs out of the page into a plain string array.
  // The selector chain tries the most specific container first and falls back
  // to document.body so the reader works on any page structure.
  // Paragraphs shorter than 10 characters are filtered out — this skips section
  // breaks (✦ ✦ ✦) and other short decorative elements that aren't prose.
  function extractParagraphs() {
    const container = document.querySelector('.story-body, article, main, .content')
                      || document.body;
    const paras = Array.from(container.querySelectorAll('h1, h2, h3, h4, p'))
      .map(el => el.textContent.trim())
      .filter(t => t.length > 10);
    return paras;
  }


  // ── TRANSLATION ──────────────────────────────────────────────────────────────
  // MyMemory (api.mymemory.translated.net) is a free translation API that
  // requires no API key for basic use. Limits: ~500 chars per request, and
  // roughly 1,000 words/day on the anonymous tier before it rate-limits silently.
  // If a request fails or returns a non-200 status, the original English text
  // is used as a fallback so playback still works.

  async function translateChunk(text, targetLang) {
    // Cache key uses the first 40 chars of the text — enough to uniquely
    // identify a paragraph without bloating the key.
    const cacheKey = `${targetLang}:${text.slice(0, 40)}`;
    if (translationCache[cacheKey]) return translationCache[cacheKey];

    // Long paragraphs are split at word boundaries to stay under the 500-char API limit.
    const chunks = splitIntoChunks(text, 450);
    const translated = [];
    for (const chunk of chunks) {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|${targetLang}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.responseStatus === 200) {
          translated.push(data.responseData.translatedText);
        } else {
          translated.push(chunk); // fall back to English on API error
        }
      } catch {
        translated.push(chunk); // fall back to English on network error
      }
    }
    const result = translated.join(' ');
    translationCache[cacheKey] = result;
    return result;
  }

  // Splits a string into chunks of at most maxLen characters, always breaking
  // at a space so words aren't cut mid-word.
  function splitIntoChunks(text, maxLen) {
    const chunks = [];
    let remaining = text;
    while (remaining.length > maxLen) {
      let cut = remaining.lastIndexOf(' ', maxLen); // find last space before the limit
      if (cut === -1) cut = maxLen;                 // no space found — force a hard cut
      chunks.push(remaining.slice(0, cut));
      remaining = remaining.slice(cut + 1);
    }
    if (remaining.length) chunks.push(remaining);
    return chunks;
  }

  // Translates every paragraph sequentially and updates the progress bar as it goes.
  // Sequential (not parallel) to avoid hammering the free API tier simultaneously.
  async function translateAllParagraphs(targetLang) {
    if (targetLang === 'en') {
      // No translation needed — reset to the original English text.
      translatedParagraphs = [...originalParagraphs];
      return;
    }

    translating = true;
    updateStatus('Translating…');
    translatedParagraphs = [];

    for (let i = 0; i < originalParagraphs.length; i++) {
      const t = await translateChunk(originalParagraphs[i], targetLang);
      translatedParagraphs.push(t);
      updateProgress(i / originalParagraphs.length); // show how far through we are
    }

    translating = false;
    updateStatus('Ready');
  }


  // ── VOICE SELECTION ──────────────────────────────────────────────────────────
  // Browsers expose voices asynchronously — they may not be available immediately
  // on page load, which is why loadVoices() is called both on init and again via
  // onvoiceschanged and a 500ms timeout fallback.

  function loadVoices() {
    allVoices = synth.getVoices();
    populateVoiceSelect();
    checkVoiceQuality();
  }

  // Returns voices sorted by best fit for the given language tag.
  // Priority order:
  //   1. Exact lang match (e.g. voice.lang === 'en-US')
  //   2. Same language family (e.g. 'en-GB', 'en-AU')
  //   3. Any voice at all (last resort)
  // Within each tier, voices with quality keywords (natural, neural, premium,
  // enhanced, hd) are sorted to the top, since those tend to sound best.
  // The system default voice is deprioritized — it's often a low-quality
  // fallback that browsers pick when nothing else matches.
  function getBestVoicesForLang(speechLang) {
    const langPrefix = speechLang.split('-')[0].toLowerCase();
    const usable = allVoices.filter(v => !NOVELTY_VOICES.has(v.name.toLowerCase()));

    let matches = usable.filter(v =>
      v.lang.toLowerCase() === speechLang.toLowerCase()
    );
    if (!matches.length) {
      matches = usable.filter(v =>
        v.lang.toLowerCase().startsWith(langPrefix)
      );
    }
    if (!matches.length) matches = usable;

    return matches.sort((a, b) => {
      if (a.default && !b.default) return 1;  // push system default down
      if (!a.default && b.default) return -1;
      const quality = ['natural', 'neural', 'premium', 'enhanced', 'hd'];
      const aQ = quality.some(q => a.name.toLowerCase().includes(q)) ? 0 : 1;
      const bQ = quality.some(q => b.name.toLowerCase().includes(q)) ? 0 : 1;
      return aQ - bQ || a.name.localeCompare(b.name);
    });
  }

  // Fills the voice <select> dropdown with up to 12 voices for the current language.
  // Brand prefixes (Microsoft, Google, Apple) are stripped from display names
  // because they add noise without being useful to the reader.
  // On iOS, getVoices() returns many names but only two actually work:
  //   1. Samantha — Apple's built-in voice, always addressable directly
  //   2. The system default — whatever the user has set in iOS Settings;
  //      all other voice names silently route here
  // We find these two real slots and discard everything else.
  function getIOSRealVoices() {
    const samantha = allVoices.find(v => v.name.toLowerCase() === 'samantha');
    const systemDefault = allVoices.find(v => v.default) ||
                          allVoices.find(v => !NOVELTY_VOICES.has(v.name.toLowerCase()) &&
                                              v.name.toLowerCase() !== 'samantha' &&
                                              v.lang.toLowerCase().startsWith('en'));
    const real = [];
    if (systemDefault) real.push(systemDefault);
    if (samantha && samantha !== systemDefault) real.push(samantha);
    return real;
  }

  function populateVoiceSelect() {
    if (isIOS()) {
      // iOS ignores the voice property — the system default is used for everything.
      // No dropdown to populate; voice is changed via the "Change voice ›" button.
      selectedVoice = null;
      return;
    }

    const select = document.getElementById('sbp-voice-select');
    if (!select) return;

    const lang = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];
    const voices = getBestVoicesForLang(lang.speechLang);
    select.innerHTML = '';
    voices.forEach((v, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = v.name.replace(/Microsoft|Google|Apple/g, '').trim();
      opt.dataset.voiceUri = v.voiceURI;
      select.appendChild(opt);
    });
    selectedVoice = voices[0] || null;
  }


  // ── PLAYBACK ─────────────────────────────────────────────────────────────────
  // The Web Speech API queue works by calling synth.speak() once per utterance.
  // All utterances for the story are queued at once in playFrom() — the browser
  // then reads them in order, firing onstart/onend callbacks for each.
  // synth.cancel() clears the entire queue, which is why it's called at the top
  // of playFrom() before re-queueing from the new index.

  function buildUtterances() {
    // Pre-wrap all paragraphs NOW so word spans are in the DOM before
    // onboundary fires — onboundary can fire almost simultaneously with onstart.
    getStoryParagraphs().forEach(el => wrapWordsInPara(el));

    utterances = translatedParagraphs.map((text, i) => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = selectedVoice;
      u.rate = speed;
      u.pitch = 1.0;
      u.volume = 1.0;

      u.onstart = () => {
        currentIndex = i;
        highlightParagraph(i);
        updateProgressBar(i / utterances.length);
      };
      u.onboundary = (e) => {
        if (e.name === 'word') highlightWord(e.charIndex);
      };
      u.onend = () => {
        // Only the last paragraph triggers the finished state.
        if (i === utterances.length - 1) {
          stopPlayback();
          if (autoplay) {
            const params = new URLSearchParams(window.location.search);
            const nextNum = parseInt(params.get('c'), 10) + 1;
            if (!isNaN(nextNum)) {
              window.location.href = `chapter.html?c=${nextNum}&autoplay=1`;
              return;
            }
          }
          updateStatus('Finished');
        }
      };
      u.onerror = (e) => {
        // 'interrupted' and 'canceled' fire when synth.cancel() is called intentionally
        // (e.g. user hits stop, or changes voice). Suppress those — only log real errors.
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('TTS error:', e.error);
        }
      };
      return u;
    });
  }

  // Queues utterances starting from 'index' and begins speaking.
  // synth.cancel() is called first to flush any previously queued speech.
  function playFrom(index) {
    synth.cancel();
    isPlaying = true;
    isPaused = false;
    updatePlayButton();

    // Start the silent audio first. iOS won't register Now Playing metadata
    // until the audio session is established, so we set it after play() resolves.
    playSilentAudio().then(() => {
      setupMediaSession();
      setMediaSessionState('playing');
    });

    for (let i = index; i < utterances.length; i++) {
      synth.speak(utterances[i]);
    }
  }

  // Three-state toggle: stopped → playing → paused → playing → ...
  function togglePlayPause() {
    if (translating) return; // block play while translation is in progress

    if (!isPlaying && !isPaused) {
      // Fresh start from the beginning (or wherever currentIndex is after a skip).
      buildUtterances();
      playFrom(currentIndex);
    } else if (isPlaying && !isPaused) {
      synth.pause();
      isPaused = true;
      isPlaying = false;
      updatePlayButton();
      updateStatus('Paused');
      setMediaSessionState('paused');
    } else if (isPaused) {
      synth.resume();
      isPaused = false;
      isPlaying = true;
      updatePlayButton();
      updateStatus('Playing');
      playSilentAudio();
      setMediaSessionState('playing');
    }
  }

  // Full stop: cancels speech, resets index to 0, clears highlight and progress.
  function stopPlayback() {
    synth.cancel();
    isPlaying = false;
    isPaused = false;
    currentIndex = 0;
    clearHighlight();
    updatePlayButton();
    updateProgressBar(0);
    updateStatus('Ready');
    pauseSilentAudio();
    setMediaSessionState('none');
  }


  // ── MEDIA SESSION ────────────────────────────────────────────────────────────
  // Hooks TTS playback into the iOS/Android lock screen media card.
  // iOS Now Playing only tracks <audio>/<video> elements — Web Audio API and
  // speechSynthesis alone do not appear on the lock screen. A silent looping
  // <audio> element holds the audio session open. pauseSilentAudio is only
  // called on full stop; during TTS pause the element keeps running so the
  // lock screen card stays visible.

  let _silentAudio = null;

  function getSilentAudio() {
    if (_silentAudio) return _silentAudio;
    _silentAudio = document.createElement('audio');
    // 100ms silent WAV (8000 Hz, 8-bit, mono) — iOS requires real audio data
    _silentAudio.src = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
    _silentAudio.loop = true;
    _silentAudio.volume = 1.0;
    _silentAudio.preload = 'auto';
    document.body.appendChild(_silentAudio);
    return _silentAudio;
  }

  function playSilentAudio() {
    return getSilentAudio().play().catch(() => {});
  }

  function pauseSilentAudio() {
    if (_silentAudio) _silentAudio.pause();
  }

  function setMediaSessionState(state) {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = state;
  }

  function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    // Pull chapter title from the first meaningful heading on the page
    const heading = document.querySelector('main h1, main h2, main h3, article h1, article h3');
    const chapterTitle = heading?.textContent?.trim() || document.title || 'The Original Bug';

    navigator.mediaSession.metadata = new MediaMetadata({
      title: chapterTitle,
      artist: 'Sandy B. Patterson',
      album: 'The Original Bug',
    });

    navigator.mediaSession.setActionHandler('play', () => {
      if (!isPlaying) togglePlayPause();
      playSilentAudio();
      setMediaSessionState('playing');
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      if (isPlaying) togglePlayPause();
      setMediaSessionState('paused');
      // silent audio keeps running so the lock screen card stays visible
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      stopPlayback();
    });

    // Skip to next / previous chapter
    const params = new URLSearchParams(window.location.search);
    const chNum = parseInt(params.get('c'), 10);

    if (!isNaN(chNum) && chNum > 0) {
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        window.location.href = `chapter.html?c=${chNum - 1}`;
      });
    }
    if (!isNaN(chNum)) {
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        window.location.href = `chapter.html?c=${chNum + 1}&autoplay=1`;
      });
    }
  }

  // Seeks to a position expressed as a fraction (0–1) of the total paragraph count.
  // Restarts playback from that paragraph if something was already playing.
  function skipTo(fraction) {
    const idx = Math.floor(fraction * utterances.length);
    currentIndex = Math.max(0, Math.min(idx, utterances.length - 1));
    if (isPlaying || isPaused) {
      buildUtterances();
      playFrom(currentIndex);
    }
  }


  // ── HIGHLIGHT ────────────────────────────────────────────────────────────────
  // Paragraph-level: adds .sbp-reading to the active <p>.
  // Word-level: wraps each word in a <span data-cs="N"> then adds
  // .sbp-word-active to the span matching the charIndex from onboundary.

  function wrapWordsInPara(paraEl) {
    if (paraEl.dataset.sbpWrapped) return;
    // Trim to match extractParagraphs() so charIndex values from onboundary align.
    const text = paraEl.textContent.trim();
    let pos = 0;
    const html = text.split(/(\s+)/).map(token => {
      const start = pos;
      pos += token.length;
      return /^\s*$/.test(token)
        ? token
        : `<span class="sbp-word" data-cs="${start}">${token}</span>`;
    }).join('');
    paraEl.innerHTML = html;
    paraEl.dataset.sbpWrapped = '1';
  }

  function highlightWord(charIndex) {
    document.querySelectorAll('.sbp-word-active').forEach(el => el.classList.remove('sbp-word-active'));
    // Use the already-highlighted paragraph rather than index matching —
    // avoids any mismatch between utterance index and DOM element order.
    const activePara = document.querySelector('.sbp-reading');
    if (!activePara) return;
    const spans = Array.from(activePara.querySelectorAll('.sbp-word'));
    if (!spans.length) return;
    let best = spans[0];
    for (const span of spans) {
      if (parseInt(span.dataset.cs, 10) <= charIndex) best = span;
      else break;
    }
    best.classList.add('sbp-word-active');
  }

  function highlightParagraph(index) {
    clearHighlight();
    const paras = getStoryParagraphs();
    if (paras[index]) {
      wrapWordsInPara(paras[index]);
      paras[index].classList.add('sbp-reading');
      paras[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function clearHighlight() {
    document.querySelectorAll('.sbp-reading').forEach(el => el.classList.remove('sbp-reading'));
    document.querySelectorAll('.sbp-word-active').forEach(el => el.classList.remove('sbp-word-active'));
  }

  // Must use the same selector and filter as extractParagraphs() so that
  // DOM index i always corresponds to text index i in utterances[].
  function getStoryParagraphs() {
    const container = document.querySelector('.story-body, article, main, .content')
                      || document.body;
    return Array.from(container.querySelectorAll('h1, h2, h3, h4, p'))
      .filter(el => el.textContent.trim().length > 10);
  }


  // ── UI UPDATES ───────────────────────────────────────────────────────────────
  // Small helpers that keep the UI in sync with playback state.
  // Each checks for element existence before acting — safe if called before
  // the reader bar has been injected into the DOM.

  function updatePlayButton() {
    const btn = document.getElementById('sbp-play-btn');
    if (!btn) return;
    if (isPlaying) {
      btn.innerHTML = pauseIcon();
      btn.setAttribute('aria-label', 'Pause');
    } else {
      btn.innerHTML = playIcon();
      btn.setAttribute('aria-label', 'Play');
    }
  }

  function updateStatus(text) {
    const el = document.getElementById('sbp-status');
    if (el) el.textContent = text;
  }

  // fraction is 0–1; updates both the fill bar and the draggable thumb.
  function updateProgressBar(fraction) {
    const pct = Math.round(fraction * 100);
    const bar = document.getElementById('sbp-progress-fill');
    const thumb = document.getElementById('sbp-progress-thumb');
    if (bar) bar.style.width = `${pct}%`;
    if (thumb) thumb.style.left = `${pct}%`;
  }

  // Alias used during translation so the progress bar shows translation progress.
  function updateProgress(fraction) {
    updateProgressBar(fraction);
  }


  // ── LANGUAGE CHANGE ──────────────────────────────────────────────────────────
  // Changing language always stops current playback first, then translates,
  // then optionally restarts if the reader was active. The wasPlaying flag
  // captures state before the stop so playback can resume automatically.
  // Arabic gets special treatment: the page direction is flipped to RTL
  // so the text renders correctly for right-to-left readers.

  async function handleLanguageChange(langCode) {
    const wasPlaying = isPlaying;
    stopPlayback();

    currentLang = langCode;
    populateVoiceSelect(); // swap to voices appropriate for the new language

    document.documentElement.dir = langCode === 'ar' ? 'rtl' : 'ltr';

    await translateAllParagraphs(langCode);

    if (wasPlaying) {
      buildUtterances();
      playFrom(0); // always restart from the top after a language switch
    }
  }


  // ── ICONS ────────────────────────────────────────────────────────────────────
  // Inline SVG functions rather than icon fonts or external images — no extra
  // requests, no dependency, works offline. Strings are returned so they can
  // be assigned to innerHTML wherever needed.

  function playIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>`;
  }
  function pauseIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    </svg>`;
  }
  function stopIcon() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h12v12H6z"/>
    </svg>`;
  }


  // ── INJECT UI ────────────────────────────────────────────────────────────────
  // Rather than requiring a <link> tag in each story HTML file, the reader
  // injects its own <style> block into <head> at runtime. This keeps the
  // reader self-contained — drop in one <script> tag and it works.
  //
  // NOTE: Colors here are hardcoded dark (#0e0e0e, #c8b89a, etc.) because the
  // reader bar is designed to match the permanently-dark story pages.
  // It does NOT use the site's CSS variable system (--bg, --text, etc.) from
  // the template, index.html, or bookshelf.html.

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* ── SBP Reader ── */
      .sbp-reader {
        position: sticky;       /* stays at top of viewport while the user scrolls */
        top: 0;
        z-index: 100;
        background: #0e0e0e;
        border-bottom: 1px solid #2a2a2a;
        padding: 0.75rem 1.5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;        /* wraps to two rows on narrow screens */
        font-family: 'EB Garamond', Georgia, serif;
        box-shadow: 0 2px 24px rgba(0,0,0,0.5);
      }

      .sbp-controls {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex-shrink: 0;         /* controls never shrink or wrap */
      }

      .sbp-btn {
        background: none;
        border: 1px solid #3a3a3a;
        color: #c8b89a;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
        padding: 0;
      }
      .sbp-btn:hover {
        border-color: #c8b89a;
        background: rgba(200,184,154,0.08);
      }
      .sbp-btn.sbp-play {
        width: 46px;            /* play is slightly larger — it's the primary action */
        height: 46px;
        border-color: #c8b89a;
        color: #c8b89a;
      }
      .sbp-btn.sbp-play:hover {
        background: rgba(200,184,154,0.15);
      }

      .sbp-progress-wrap {
        flex: 1;
        min-width: 120px;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        overflow: visible;
      }

      .sbp-progress-track {
        height: 20px;
        background: transparent;
        cursor: pointer;
        position: relative;
      }
      .sbp-progress-track::before {
        content: '';
        position: absolute;
        left: 0; right: 0;
        top: 50%;
        transform: translateY(-50%);
        height: 4px;
        background: #2a2a2a;
        border-radius: 2px;
        pointer-events: none;
      }
      .sbp-progress-fill {
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        height: 4px;
        background: #c8b89a;
        border-radius: 2px;
        width: 0%;
        transition: width 0.25s ease;
        pointer-events: none;
      }
      .sbp-progress-thumb {
        position: absolute;
        top: 50%;
        left: 0%;
        transform: translate(-50%, -50%);
        width: 14px;
        height: 14px;
        background: #c8b89a;
        border-radius: 50%;
        cursor: grab;
        box-shadow: 0 0 6px rgba(0,0,0,0.6);
        transition: left 0.25s ease, transform 0.12s ease;
        z-index: 2;
      }
      .sbp-progress-thumb.dragging {
        cursor: grabbing;
        transform: translate(-50%, -50%) scale(1.35);
        transition: transform 0.12s ease;
      }

      .sbp-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }

      .sbp-status {
        font-size: 0.68rem;
        color: #666;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .sbp-selects {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .sbp-select-wrap {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .sbp-label {
        font-size: 0.6rem;
        color: #555;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      .sbp-select {
        background: #111;
        border: 1px solid #2a2a2a;
        color: #c8b89a;
        font-family: inherit;
        font-size: 0.78rem;
        padding: 0.3rem 0.5rem;
        border-radius: 3px;
        cursor: pointer;
        max-width: 160px;
        transition: border-color 0.15s;
      }
      .sbp-select:hover, .sbp-select:focus {
        border-color: #c8b89a;
        outline: none;
      }

      .sbp-step-speed {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .sbp-step-btn {
        background: none;
        border: 1px solid #3a3a3a;
        color: #888;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 4px;
        font-size: 0.85rem;
        font-family: inherit;
        transition: all 0.15s;
        padding: 0;
        line-height: 1;
        flex-shrink: 0;
      }
      .sbp-step-btn:hover {
        border-color: #c8b89a;
        color: #c8b89a;
        background: rgba(200,184,154,0.08);
      }
      .sbp-speed-display {
        background: none;
        border: 1px solid #3a3a3a;
        color: #888;
        font-size: 0.68rem;
        font-family: 'Courier New', monospace;
        letter-spacing: 0.05em;
        padding: 0 6px;
        height: 24px;
        min-width: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.15s;
        flex-shrink: 0;
      }
      .sbp-speed-display:hover {
        border-color: #c8b89a;
        color: #c8b89a;
        background: rgba(200,184,154,0.08);
      }

      .sbp-lang-btn {
        background: none;
        border: 1px solid #2a2a2a;
        color: #999;
        padding: 0.3rem 0.6rem;
        font-size: 0.72rem;
        border-radius: 3px;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .sbp-lang-btn:hover, .sbp-lang-btn.active {
        border-color: #c8b89a;
        color: #c8b89a;
        background: rgba(200,184,154,0.06);
      }

      .sbp-lang-dropdown {
        position: relative;     /* anchor for the absolutely-positioned panel below */
      }
      .sbp-lang-panel {
        display: none;          /* toggled to grid via .open class */
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        background: #111;
        border: 1px solid #2a2a2a;
        border-radius: 4px;
        padding: 0.4rem;
        z-index: 200;
        width: 220px;
        display: none;
        grid-template-columns: 1fr 1fr;   /* two-column grid of language buttons */
        gap: 0.25rem;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      }
      .sbp-lang-panel.open {
        display: grid;
      }
      .sbp-lang-item {
        background: none;
        border: none;
        color: #999;
        padding: 0.35rem 0.5rem;
        font-size: 0.72rem;
        text-align: left;
        cursor: pointer;
        border-radius: 3px;
        transition: all 0.12s;
        font-family: inherit;
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
      .sbp-lang-item:hover {
        background: rgba(200,184,154,0.08);
        color: #c8b89a;
      }
      .sbp-lang-item.active {
        color: #c8b89a;
        background: rgba(200,184,154,0.06);
      }

      /* Word-level highlight — applied by highlightWord() via onboundary events. */
      .sbp-word-active {
        background: rgba(200, 184, 154, 0.28);
        border-radius: 2px;
        padding: 0 1px;
        transition: background 0.08s ease;
      }

      /* Applied by highlightParagraph() to the currently-spoken <p> element.
         Also defined in Biscuits-warmth2.html's own <style> block — the version
         injected here takes precedence due to !important. The HTML copy is redundant
         and could be removed. */
      .sbp-reading {
        background: rgba(200,184,154,0.06) !important;
        border-left: 2px solid #c8b89a;
        padding-left: 1rem;
        transition: background 0.3s ease;
      }

      /* Spinning indicator shown in the status area while translation is running. */
      .sbp-translating {
        display: inline-block;
        width: 10px;
        height: 10px;
        border: 1px solid #555;
        border-top-color: #c8b89a;
        border-radius: 50%;
        animation: sbp-spin 0.7s linear infinite;
        margin-left: 4px;
        vertical-align: middle;
      }
      @keyframes sbp-spin {
        to { transform: rotate(360deg); }
      }

      .sbp-autoplay-btn {
        background: none;
        border: 1px solid #444;
        color: #888;
        font-size: 0.6rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 999px;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.15s;
      }
      .sbp-autoplay-btn.active {
        border-color: #c8b89a;
        color: #c8b89a;
        background: rgba(200,184,154,0.08);
      }
      .sbp-autoplay-btn:hover {
        border-color: #aaa;
        color: #aaa;
      }
      .sbp-autoplay-btn.active:hover {
        border-color: #c8b89a;
        color: #c8b89a;
      }

      /* ── Voice upgrade prompt (iOS only) ── */
      .sbp-voice-prompt {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex-wrap: wrap;
        padding: 0.5rem 0 0.1rem;
        border-top: 1px solid #1a1a1a;
        margin-top: 0.25rem;
      }
      .sbp-vp-text {
        font-size: 0.72rem;
        color: #888;
        flex: 1;
        min-width: 180px;
      }
      .sbp-vp-btn {
        font-family: inherit;
        font-size: 0.68rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        border-radius: 999px;
        padding: 5px 14px;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .sbp-vp-yes {
        background: #c8b89a;
        color: #0e0e0e;
        border: 1px solid #c8b89a;
      }
      .sbp-vp-yes:hover { background: #ddd0b8; border-color: #ddd0b8; }
      .sbp-vp-no {
        background: none;
        color: #555;
        border: 1px solid #2a2a2a;
      }
      .sbp-vp-no:hover { color: #888; border-color: #444; }

      /* ── Voice setup modal ── */
      .sbp-voice-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.78);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        backdrop-filter: blur(4px);
      }
      .sbp-voice-modal {
        background: #111;
        border: 1px solid #2a2a2a;
        border-radius: 12px;
        padding: 36px 32px 32px;
        max-width: 400px;
        width: 100%;
        position: relative;
      }
      .sbp-voice-close {
        position: absolute;
        top: 14px;
        right: 14px;
        background: none;
        border: none;
        color: #555;
        font-size: 1rem;
        cursor: pointer;
        padding: 4px 8px;
        transition: color 0.15s;
        line-height: 1;
      }
      .sbp-voice-close:hover { color: #c8b89a; }
      .sbp-vm-eyebrow {
        font-family: 'Courier New', monospace;
        font-size: 0.65rem;
        letter-spacing: 0.25em;
        text-transform: uppercase;
        color: #c8b89a;
        margin-bottom: 10px;
      }
      .sbp-vm-title {
        font-family: Georgia, serif;
        font-size: 1.25rem;
        color: #e8e8e8;
        margin-bottom: 24px;
        line-height: 1.3;
      }
      .sbp-vm-steps {
        padding-left: 20px;
        margin-bottom: 20px;
      }
      .sbp-vm-steps li {
        font-family: Georgia, serif;
        font-size: 0.88rem;
        color: #888;
        line-height: 1.75;
      }
      .sbp-vm-steps li strong { color: #e0d8cc; font-weight: 600; }
      .sbp-vm-steps li em { color: #c8b89a; font-style: normal; }
      .sbp-vm-alt { font-size: 0.78rem; color: #555; font-style: italic; }
      .sbp-vm-note {
        font-size: 0.78rem;
        color: #555;
        font-style: italic;
        line-height: 1.6;
        margin-bottom: 24px;
      }
      .sbp-ios-voice-btn {
        background: none;
        border: 1px solid #2a2a2a;
        color: #c8b89a;
        font-family: inherit;
        font-size: 0.72rem;
        padding: 0.3rem 0.6rem;
        border-radius: 3px;
        cursor: pointer;
        transition: border-color 0.15s;
        white-space: nowrap;
      }
      .sbp-ios-voice-btn:hover { border-color: #c8b89a; }

      .sbp-vm-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        cursor: pointer;
        user-select: none;
      }
      .sbp-vm-toggle-label {
        font-size: 0.8rem;
        color: #666;
      }
      .sbp-toggle { position: relative; display: inline-block; }
      .sbp-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
      .sbp-toggle-track {
        display: block;
        width: 40px;
        height: 22px;
        background: #2a2a2a;
        border-radius: 999px;
        border: 1px solid #3a3a3a;
        transition: background 0.2s;
        position: relative;
      }
      .sbp-toggle input:checked + .sbp-toggle-track {
        background: #c8b89a;
        border-color: #c8b89a;
      }
      .sbp-toggle-thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        background: #888;
        border-radius: 50%;
        transition: left 0.2s, background 0.2s;
      }
      .sbp-toggle input:checked + .sbp-toggle-track .sbp-toggle-thumb {
        left: 20px;
        background: #0e0e0e;
      }
      .sbp-vm-done {
        font-family: 'Courier New', monospace;
        font-size: 0.68rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        background: #c8b89a;
        color: #0e0e0e;
        border: none;
        border-radius: 999px;
        padding: 10px 28px;
        cursor: pointer;
        transition: background 0.15s;
        display: block;
        width: 100%;
      }
      .sbp-vm-done:hover { background: #ddd0b8; }

      /* Narrow screens: controls wrap, selects go full-width on second row. */
      @media (max-width: 600px) {
        .sbp-reader {
          padding: 0.6rem 1rem;
          gap: 0.6rem;
        }
        .sbp-selects {
          width: 100%;
        }
        .sbp-select {
          max-width: 130px;
          font-size: 0.72rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Returns the full reader bar HTML as a string.
  // IDs are prefixed 'sbp-' to avoid clashing with any IDs in the host page.
  // aria-label and role attributes are included for screen reader accessibility.
  function buildReaderHTML() {
    return `
      <div class="sbp-reader" id="sbp-reader" role="region" aria-label="Story reader">

        <div class="sbp-controls">
          <button class="sbp-btn sbp-play" id="sbp-play-btn" aria-label="Play">
            ${playIcon()}
          </button>
          <button class="sbp-btn" id="sbp-stop-btn" aria-label="Stop">
            ${stopIcon()}
          </button>
        </div>

        <div class="sbp-progress-wrap">
          <div class="sbp-progress-track" id="sbp-progress-track" title="Drag to scrub">
            <div class="sbp-progress-fill" id="sbp-progress-fill"></div>
            <div class="sbp-progress-thumb" id="sbp-progress-thumb"></div>
          </div>
          <div class="sbp-meta">
            <span class="sbp-status" id="sbp-status">Ready</span>
            <div class="sbp-step-speed">
              <button class="sbp-step-btn" id="sbp-speed-down" aria-label="Decrease speed">−</button>
              <button class="sbp-speed-display" id="sbp-speed-display" title="Tap to jump +0.5×">1.0×</button>
              <button class="sbp-step-btn" id="sbp-speed-up" aria-label="Increase speed">+</button>
              <button class="sbp-autoplay-btn" id="sbp-autoplay" title="Auto-advance to next chapter on finish">Autoplay</button>
            </div>
          </div>
        </div>

        <div class="sbp-selects">
          <div class="sbp-select-wrap">
            <span class="sbp-label">Voice</span>
            ${isIOS()
              ? `<button class="sbp-ios-voice-btn" id="sbp-ios-voice-btn">Change voice ›</button>`
              : `<select class="sbp-select" id="sbp-voice-select" aria-label="Voice"></select>`
            }
          </div>

          <div class="sbp-select-wrap">
            <span class="sbp-label">Language</span>
            <div class="sbp-lang-dropdown" id="sbp-lang-dropdown">
              <button class="sbp-lang-btn" id="sbp-lang-toggle" aria-expanded="false" aria-haspopup="true">
                🇺🇸 English
              </button>
              <div class="sbp-lang-panel" id="sbp-lang-panel" role="menu">
              </div>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  // Populates the language panel grid with one button per LANGUAGES entry.
  // Buttons are given data-lang attributes so a single delegated click handler
  // in bindEvents() can handle all of them without attaching 16 individual listeners.
  function buildLangPanel() {
    const panel = document.getElementById('sbp-lang-panel');
    if (!panel) return;
    panel.innerHTML = LANGUAGES.map(l => `
      <button class="sbp-lang-item ${l.code === 'en' ? 'active' : ''}"
        data-lang="${l.code}" role="menuitem">
        <span>${l.flag}</span> ${l.label}
      </button>
    `).join('');
  }

  // Finds the best insertion point and inserts the reader bar before it.
  // Targets the <header> element first — this places the bar between the nav
  // and the story header, exactly where the HTML comment marks the injection point.
  // Falls back to <main> or .story-body if no <header> exists, then prepends
  // to <body> as a last resort.
  //
  // NOTE: The original selector included 'hr' which incorrectly matched the
  // <hr class="story-rule"> inside the <header>, injecting the bar mid-header.
  function injectReader() {
    const target = document.querySelector('header, main, .story-body, article');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildReaderHTML();
    const reader = wrapper.firstElementChild;

    if (target) {
      target.parentNode.insertBefore(reader, target);
    } else {
      document.body.prepend(reader);
    }
  }


  // ── BIND EVENTS ──────────────────────────────────────────────────────────────
  // All event listeners are attached here, after the reader bar has been injected.
  // Optional chaining (?.) is used throughout so missing elements don't throw.

  function bindEvents() {
    document.getElementById('sbp-play-btn')?.addEventListener('click', togglePlayPause);
    document.getElementById('sbp-stop-btn')?.addEventListener('click', stopPlayback);
    document.getElementById('sbp-ios-voice-btn')?.addEventListener('click', showVoiceInstructions);

    // Scrubber: click on track, or drag the thumb, to seek.
    const track = document.getElementById('sbp-progress-track');
    const thumb = document.getElementById('sbp-progress-thumb');
    let dragging = false;

    function getFraction(clientX) {
      const rect = track.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }
    function doSeek(fraction) {
      updateProgressBar(fraction);
      if (utterances.length) { buildUtterances(); skipTo(fraction); }
    }

    // Click on track (not on thumb)
    track?.addEventListener('click', (e) => {
      if (!dragging) doSeek(getFraction(e.clientX));
    });

    // Mouse drag on thumb
    thumb?.addEventListener('mousedown', (e) => {
      dragging = true;
      thumb.classList.add('dragging');
      thumb.style.transition = 'transform 0.12s ease'; // disable left transition while dragging
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      doSeek(getFraction(e.clientX));
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      thumb?.classList.remove('dragging');
      thumb.style.transition = ''; // restore transition
    });

    // Touch drag on thumb
    thumb?.addEventListener('touchstart', (e) => {
      dragging = true;
      thumb.classList.add('dragging');
      thumb.style.transition = 'transform 0.12s ease';
      e.preventDefault();
    }, { passive: false });
    document.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      doSeek(getFraction(e.touches[0].clientX));
    }, { passive: true });
    document.addEventListener('touchend', () => {
      if (!dragging) return;
      dragging = false;
      thumb?.classList.remove('dragging');
      thumb.style.transition = '';
    });

    // Step speed control: − decreases by 0.1, + increases by 0.1, center tap adds 0.5.
    function setSpeed(newSpeed) {
      speed = Math.round(Math.max(0.5, Math.min(3.0, newSpeed)) * 10) / 10;
      document.getElementById('sbp-speed-display').textContent = `${speed.toFixed(1)}×`;
      if (isPlaying || isPaused) {
        const idx = currentIndex;
        buildUtterances();
        playFrom(idx);
      }
    }
    document.getElementById('sbp-speed-down')?.addEventListener('click', () => setSpeed(speed - 0.1));
    document.getElementById('sbp-speed-up')?.addEventListener('click', () => setSpeed(speed + 0.1));
    document.getElementById('sbp-speed-display')?.addEventListener('click', () => setSpeed(speed + 0.5));

    // Voice dropdown: same pattern — rebuild and restart from the current position.
    document.getElementById('sbp-voice-select')?.addEventListener('change', (e) => {
      if (e.target.value.startsWith('__setup__')) {
        e.target.value = '0';
        showVoiceInstructions();
        return;
      }
      const voices = isIOS()
        ? getIOSRealVoices()
        : getBestVoicesForLang(LANGUAGES.find(l => l.code === currentLang)?.speechLang || 'en-US');
      selectedVoice = voices[parseInt(e.target.value)] || null;
      if (isPlaying || isPaused) {
        const idx = currentIndex;
        buildUtterances();
        playFrom(idx);
      }
    });

    // Language toggle button: opens/closes the panel and updates aria-expanded.
    const toggle = document.getElementById('sbp-lang-toggle');
    const panel = document.getElementById('sbp-lang-panel');
    toggle?.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });

    // Close the language panel when the user clicks anywhere outside it.
    document.addEventListener('click', (e) => {
      if (!document.getElementById('sbp-lang-dropdown')?.contains(e.target)) {
        panel?.classList.remove('open');
        toggle?.setAttribute('aria-expanded', 'false');
      }
    });

    // Delegated click handler for all language buttons — one listener on the panel
    // instead of one per button. e.target.closest('[data-lang]') walks up the DOM
    // to find the button even if the click landed on the flag <span> inside it.
    document.getElementById('sbp-lang-panel')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-lang]');
      if (!btn) return;

      const code = btn.dataset.lang;
      const lang = LANGUAGES.find(l => l.code === code);
      if (!lang) return;

      document.querySelectorAll('.sbp-lang-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      toggle.innerHTML = `${lang.flag} ${lang.label}`;

      panel.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');

      await handleLanguageChange(code);
    });

    // Autoplay toggle: flips the autoplay state and reflects it on the button.
    document.getElementById('sbp-autoplay')?.addEventListener('click', () => {
      autoplay = !autoplay;
      document.getElementById('sbp-autoplay')?.classList.toggle('active', autoplay);
    });

    // Some browsers (Firefox, older Safari) fire onvoiceschanged asynchronously.
    // Registering here ensures the dropdown is repopulated when voices arrive.
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  }


  // ── INIT ─────────────────────────────────────────────────────────────────────
  // Entry point. Checks for Web Speech API support, then wires everything up.
  // loadVoices() is called twice: once immediately (in case voices are already
  // available, as on Chrome desktop) and once after 500ms (for browsers that
  // populate voices asynchronously after a short delay).

  function init() {
    if (!('speechSynthesis' in window)) {
      console.warn('SBP Reader: Web Speech API not supported in this browser.');
      return;
    }

    originalParagraphs = extractParagraphs();
    translatedParagraphs = [...originalParagraphs]; // start with English

    injectStyles();
    injectReader();
    buildLangPanel();
    bindEvents();
    loadVoices();

    setTimeout(loadVoices, 500);   // second call for browsers that load voices async
    setTimeout(loadVoices, 2000);  // third call for iOS which can be slower after install

    // If we arrived here via autoplay navigation, activate the toggle and auto-start.
    // Delay 650ms so voices have time to load before buildUtterances() runs.
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoplay') === '1') {
      autoplay = true;
      document.getElementById('sbp-autoplay')?.classList.add('active');
      setTimeout(() => {
        buildUtterances();
        playFrom(0);
        isPlaying = true;
        updatePlayButton();
        updateStatus('Playing');
      }, 650);
    }

    updateStatus('Ready');
  }

  // If the script loads before the DOM is ready, wait for DOMContentLoaded.
  // If the DOM is already parsed (e.g. script is deferred or at end of body), run now.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
