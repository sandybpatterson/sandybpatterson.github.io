// ─────────────────────────────────────────────────────────────────────────
// audio-player.js — lightweight player for a single pre-recorded audio file.
//
// This is deliberately NOT reader.js. reader.js is the shared Web Speech API
// reader for every book chapter on the shelf (voice picker, word
// highlighting, Media Session lock-screen integration) and stays untouched.
// This script is for the opposite case: a Sandy's Blog post that ships real
// recorded audio instead of a synthesized reading. No voices, no
// highlighting, just a play button, a scrub bar, and step speed control.
//
// Usage: drop this one <script> tag in the page, plus a mount point:
//   <div id="sbp-audio-player" data-audio-src="https://.../episode.mp3"></div>
// The script finds that div, injects the player UI into it, and wires it up
// to a native <audio> element. If the div or its data-audio-src is missing,
// it does nothing.
// ─────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  const MOUNT_ID = 'sbp-audio-player';
  let audio = null;
  let speed = 1.0;
  let dragging = false;

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .sbp-audio-player {
        display: flex;
        align-items: center;
        gap: 1rem;
        background: #111;
        border: 1px solid #1e1e1e;
        border-radius: 10px;
        padding: 0.9rem 1.2rem;
        margin: 0 0 28px;
      }
      .sbp-audio-play {
        flex-shrink: 0;
        width: 46px;
        height: 46px;
        border-radius: 50%;
        border: 1px solid #c9a84c;
        background: none;
        color: #c9a84c;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.15s;
        padding: 0;
      }
      .sbp-audio-play:hover { background: rgba(201,168,76,0.12); }
      .sbp-audio-play svg { width: 18px; height: 18px; }

      .sbp-audio-progress-wrap {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .sbp-audio-progress-track {
        height: 20px;
        position: relative;
        cursor: pointer;
      }
      .sbp-audio-progress-track::before {
        content: '';
        position: absolute;
        left: 0; right: 0; top: 50%;
        transform: translateY(-50%);
        height: 4px;
        background: #2a2a2a;
        border-radius: 2px;
      }
      .sbp-audio-progress-fill {
        position: absolute;
        left: 0; top: 50%;
        transform: translateY(-50%);
        height: 4px;
        width: 0%;
        background: #c9a84c;
        border-radius: 2px;
        pointer-events: none;
      }
      .sbp-audio-progress-thumb {
        position: absolute;
        top: 50%; left: 0%;
        transform: translate(-50%, -50%);
        width: 13px; height: 13px;
        border-radius: 50%;
        background: #c9a84c;
        box-shadow: 0 0 6px rgba(0,0,0,0.6);
        cursor: grab;
        transition: left 0.1s linear;
      }
      .sbp-audio-progress-thumb.dragging {
        cursor: grabbing;
        transform: translate(-50%, -50%) scale(1.35);
        transition: none;
      }
      .sbp-audio-time {
        font-family: 'Courier New', monospace;
        font-size: 0.68rem;
        letter-spacing: 0.05em;
        color: #888;
      }

      .sbp-audio-speed {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .sbp-audio-step-btn {
        width: 24px; height: 24px;
        border-radius: 4px;
        border: 1px solid #3a3a3a;
        background: none;
        color: #888;
        font-family: inherit;
        font-size: 0.85rem;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }
      .sbp-audio-step-btn:hover {
        border-color: #c9a84c;
        color: #c9a84c;
        background: rgba(201,168,76,0.08);
      }
      .sbp-audio-speed-display {
        min-width: 42px;
        height: 24px;
        padding: 0 6px;
        border-radius: 4px;
        border: 1px solid #3a3a3a;
        background: none;
        color: #888;
        font-family: 'Courier New', monospace;
        font-size: 0.68rem;
        letter-spacing: 0.05em;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }
      .sbp-audio-speed-display:hover {
        border-color: #c9a84c;
        color: #c9a84c;
        background: rgba(201,168,76,0.08);
      }

      @media (max-width: 520px) {
        .sbp-audio-player { flex-wrap: wrap; }
        .sbp-audio-progress-wrap { order: 3; flex-basis: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  function buildHTML() {
    return `
      <button class="sbp-audio-play" id="sbp-audio-play-btn" aria-label="Play">
        <svg id="sbp-audio-play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        <svg id="sbp-audio-pause-icon" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
      </button>
      <div class="sbp-audio-progress-wrap">
        <div class="sbp-audio-progress-track" id="sbp-audio-progress-track" title="Drag to scrub">
          <div class="sbp-audio-progress-fill" id="sbp-audio-progress-fill"></div>
          <div class="sbp-audio-progress-thumb" id="sbp-audio-progress-thumb"></div>
        </div>
        <span class="sbp-audio-time" id="sbp-audio-time">0:00 / 0:00</span>
      </div>
      <div class="sbp-audio-speed">
        <button class="sbp-audio-step-btn" id="sbp-audio-speed-down" aria-label="Decrease speed">&minus;</button>
        <button class="sbp-audio-speed-display" id="sbp-audio-speed-display" title="Tap to jump +0.5&times;">1.0&times;</button>
        <button class="sbp-audio-step-btn" id="sbp-audio-speed-up" aria-label="Increase speed">+</button>
      </div>
    `;
  }

  // Step speed control: same behavior as reader.js's — step buttons move by
  // 0.1, clamped to [0.5, 3.0]; tapping the display itself jumps by 0.5.
  function setSpeed(newSpeed) {
    speed = Math.round(Math.max(0.5, Math.min(3.0, newSpeed)) * 10) / 10;
    document.getElementById('sbp-audio-speed-display').textContent = `${speed.toFixed(1)}×`;
    if (audio) audio.playbackRate = speed;
  }

  function updateProgressUI(fraction) {
    const pct = Math.max(0, Math.min(1, fraction)) * 100;
    document.getElementById('sbp-audio-progress-fill').style.width = pct + '%';
    document.getElementById('sbp-audio-progress-thumb').style.left = pct + '%';
  }

  function updateTimeUI() {
    if (!audio) return;
    document.getElementById('sbp-audio-time').textContent =
      `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  }

  function setPlayingUI(isPlaying) {
    document.getElementById('sbp-audio-play-icon').style.display = isPlaying ? 'none' : '';
    document.getElementById('sbp-audio-pause-icon').style.display = isPlaying ? '' : 'none';
    document.getElementById('sbp-audio-play-btn').setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
  }

  function togglePlayPause() {
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  }

  function bindEvents(mount) {
    audio = new Audio();
    audio.preload = 'metadata';
    audio.src = mount.dataset.audioSrc;

    document.getElementById('sbp-audio-play-btn').addEventListener('click', togglePlayPause);

    audio.addEventListener('play', () => setPlayingUI(true));
    audio.addEventListener('pause', () => setPlayingUI(false));
    audio.addEventListener('ended', () => setPlayingUI(false));
    audio.addEventListener('loadedmetadata', updateTimeUI);
    audio.addEventListener('timeupdate', () => {
      if (dragging) return;
      updateProgressUI(audio.duration ? audio.currentTime / audio.duration : 0);
      updateTimeUI();
    });

    const track = document.getElementById('sbp-audio-progress-track');
    const thumb = document.getElementById('sbp-audio-progress-thumb');

    function getFraction(clientX) {
      const rect = track.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }
    function seekTo(fraction) {
      if (audio.duration) audio.currentTime = fraction * audio.duration;
      updateProgressUI(fraction);
      updateTimeUI();
    }

    track.addEventListener('click', (e) => {
      if (e.target === thumb) return;
      seekTo(getFraction(e.clientX));
    });

    thumb.addEventListener('mousedown', (e) => {
      dragging = true;
      thumb.classList.add('dragging');
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      updateProgressUI(getFraction(e.clientX));
    });
    document.addEventListener('mouseup', (e) => {
      if (!dragging) return;
      dragging = false;
      thumb.classList.remove('dragging');
      seekTo(getFraction(e.clientX));
    });

    thumb.addEventListener('touchstart', () => {
      dragging = true;
      thumb.classList.add('dragging');
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      updateProgressUI(getFraction(e.touches[0].clientX));
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      if (!dragging) return;
      dragging = false;
      thumb.classList.remove('dragging');
      seekTo(getFraction(e.changedTouches[0].clientX));
    });

    document.getElementById('sbp-audio-speed-down').addEventListener('click', () => setSpeed(speed - 0.1));
    document.getElementById('sbp-audio-speed-up').addEventListener('click', () => setSpeed(speed + 0.1));
    document.getElementById('sbp-audio-speed-display').addEventListener('click', () => setSpeed(speed + 0.5));
  }

  function init() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount || !mount.dataset.audioSrc) return;
    injectStyles();
    mount.innerHTML = buildHTML();
    bindEvents(mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
