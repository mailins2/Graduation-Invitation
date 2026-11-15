const intro = document.getElementById('intro');
const openButton = document.getElementById('open');
const page = document.querySelector('.page');
const bgMusic = document.getElementById('bg-music');
const musicToggle = document.getElementById('music-toggle');
const musicIcon = document.getElementById('music-icon');
const musicLabel = document.getElementById('music-label');
const cd = document.getElementById('cd');
const form = document.getElementById('rsvpForm');
const formStatus = document.getElementById('formStatus');
const confettiLayer = document.getElementById('confettiLayer');
const wishesStatus = document.getElementById('wishesStatus');
const wishesList = document.getElementById('wishesList');
const submitButton = form ? form.querySelector('button[type="submit"]') : null;

const MUSIC_TARGET_VOLUME = 0.7;
const MUSIC_FADE_DURATION = 5000;
const PRESENTATION_SCROLL_SPEED = 60;
const PRESENTATION_SCROLL_DELAY = 3000;
let volumeFadeFrame = 0;

const WISHES_API_URL = 'https://script.google.com/macros/s/AKfycbz7Ms0kww6hckwfG-tES6nCyJRUxf6oNdlAqMo8nOhfAmdnDH8PDIwafykYryntOQyc/exec';
const GOOGLE_FORM_RESPONSE_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfpAotLKUgohBgPrUXKBj30xZz9D3Vyfm-ufVK_KfBicF8axA/formResponse';
const GOOGLE_FORM_ENTRIES = {
  name: 'entry.1386943477',
  message: 'entry.1221149099',
  attendance: 'entry.420995005'
};

function createConfetti() {
  if (!confettiLayer) return;

  const palette = ['#f7abb0', '#f6c18d', '#f4d859', '#8ec9dc', '#a8d9a3', '#d7b7e6'];

  for (let i = 0; i < 32; i += 1) {
    const piece = document.createElement('span');
    const size = (Math.random() * 10 + 8).toFixed(2);
    const duration = (Math.random() * 8 + 8).toFixed(2);
    const delay = (Math.random() * 6).toFixed(2);
    const drift = `${(Math.random() * 180 - 90).toFixed(2)}px`;
    const left = (Math.random() * 100).toFixed(2);
    piece.className = 'confetti';
    piece.style.left = `${left}%`;
    piece.style.width = `${size}px`;
    piece.style.height = `${(+size * 1.8).toFixed(2)}px`;
    piece.style.background = palette[Math.floor(Math.random() * palette.length)];
    piece.style.animationDuration = `${duration}s`;
    piece.style.animationDelay = `${delay}s`;
    piece.style.setProperty('--drift', drift);

    confettiLayer.appendChild(piece);
  }
}

function fadeMusicToTarget() {
  if (!bgMusic) return;

  if (volumeFadeFrame) cancelAnimationFrame(volumeFadeFrame);

  const startingVolume = bgMusic.volume;
  let startTime;
  const updateVolume = (time) => {
    if (bgMusic.paused) {
      volumeFadeFrame = 0;
      return;
    }

    if (startTime === undefined) startTime = time;
    const progress = Math.min((time - startTime) / MUSIC_FADE_DURATION, 1);
    bgMusic.volume = startingVolume + (MUSIC_TARGET_VOLUME - startingVolume) * progress;

    if (progress < 1) {
      volumeFadeFrame = requestAnimationFrame(updateVolume);
    } else {
      volumeFadeFrame = 0;
    }
  };

  volumeFadeFrame = requestAnimationFrame(updateVolume);
}

async function playMusicWithFade(startMuted = false) {
  if (!bgMusic) return false;

  if (startMuted) bgMusic.volume = 0;

  try {
    const playPromise = bgMusic.play();
    fadeMusicToTarget();
    await playPromise;
    return true;
  } catch (error) {
    if (bgMusic.paused && error instanceof DOMException && error.name === 'AbortError') {
      return false;
    }

    if (musicLabel) musicLabel.textContent = 'Không phát được';
    console.error('Unable to play background music:', error);
    return false;
  }
}

function presentSections() {
  if (!page || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();

  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo(0, 0);

  const startPosition = window.scrollY;
  const endPosition = Math.max(0, root.scrollHeight - window.innerHeight);
  const distance = endPosition - startPosition;

  if (distance <= 0) {
    root.style.scrollBehavior = previousScrollBehavior;
    return Promise.resolve();
  }

  const duration = (distance / PRESENTATION_SCROLL_SPEED) * 1000;
  return new Promise((resolve) => {
    let startTime;
    let scrollFrame = 0;
    let finished = false;
    const finishScrolling = () => {
      if (finished) return;
      finished = true;
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      window.removeEventListener('wheel', finishScrolling);
      window.removeEventListener('touchstart', finishScrolling);
      window.removeEventListener('pointerdown', finishScrolling);
      window.removeEventListener('keydown', stopOnScrollKey);
      root.style.scrollBehavior = previousScrollBehavior;
      resolve();
    };
    const stopOnScrollKey = (event) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) {
        finishScrolling();
      }
    };

    window.addEventListener('wheel', finishScrolling, { passive: true });
    window.addEventListener('touchstart', finishScrolling, { passive: true });
    window.addEventListener('pointerdown', finishScrolling);
    window.addEventListener('keydown', stopOnScrollKey);

    const scroll = (time) => {
      if (startTime === undefined) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      window.scrollTo(0, startPosition + distance * progress);

      if (progress < 1) {
        scrollFrame = requestAnimationFrame(scroll);
      } else {
        finishScrolling();
      }
    };

    scrollFrame = requestAnimationFrame(scroll);
  });
}

if (openButton) {
  openButton.addEventListener('click', async () => {
    openButton.disabled = true;
    if (intro) intro.classList.add('hidden');
    playMusicWithFade(true);
    await new Promise((resolve) => setTimeout(resolve, PRESENTATION_SCROLL_DELAY));
    await presentSections();
  });
}

if (musicToggle && bgMusic) {
  const syncMusicLabel = () => {
    if (!musicIcon || !musicLabel) return;
    const isPlaying = !bgMusic.paused;
    musicIcon.textContent = isPlaying ? '❚❚' : '♫';
    musicLabel.textContent = isPlaying ? 'Tắt nhạc' : 'Bật nhạc';
    musicToggle.setAttribute('aria-pressed', String(isPlaying));
    musicToggle.setAttribute('aria-label', isPlaying ? 'Tắt nhạc nền' : 'Bật nhạc nền');
  };

  musicToggle.addEventListener('click', async () => {
    if (bgMusic.paused) {
      const started = await playMusicWithFade();
      if (started) syncMusicLabel();
    } else {
      bgMusic.pause();
    }
  });

  bgMusic.addEventListener('play', syncMusicLabel);
  bgMusic.addEventListener('pause', syncMusicLabel);
}

function updateCountdown() {
  if (!cd) return;

  const targetDate = new Date(cd.dataset.date);
  const diff = targetDate.getTime() - Date.now();

  const days = document.getElementById('days');
  const hours = document.getElementById('hours');
  const minutes = document.getElementById('minutes');
  const seconds = document.getElementById('seconds');

  if (!days || !hours || !minutes || !seconds) return;

  if (Number.isNaN(diff) || diff <= 0) {
    days.textContent = '00';
    hours.textContent = '00';
    minutes.textContent = '00';
    seconds.textContent = '00';
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const dayCount = Math.floor(totalSeconds / 86400);
  const hourCount = Math.floor((totalSeconds % 86400) / 3600);
  const minuteCount = Math.floor((totalSeconds % 3600) / 60);
  const secondCount = totalSeconds % 60;

  days.textContent = String(dayCount).padStart(2, '0');
  hours.textContent = String(hourCount).padStart(2, '0');
  minutes.textContent = String(minuteCount).padStart(2, '0');
  seconds.textContent = String(secondCount).padStart(2, '0');
}

if (cd) {
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

function getWishes() {
  return new Promise((resolve, reject) => {
    if (!WISHES_API_URL) {
      reject(new Error('Google Apps Script URL is not configured.'));
      return;
    }

    const callbackName = `wishesCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const querySeparator = WISHES_API_URL.includes('?') ? '&' : '?';
    const timeout = setTimeout(() => {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      reject(new Error('Timed out while loading wishes.'));
    }, 15000);

    window[callbackName] = (result) => {
      clearTimeout(timeout);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);

      if (!result || !result.ok || !Array.isArray(result.wishes) || !Number.isFinite(result.totalResponses)) {
        reject(new Error('The wishes service returned an invalid response.'));
        return;
      }

      resolve(result);
    };

    script.onerror = () => {
      clearTimeout(timeout);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      reject(new Error('Unable to load wishes.'));
    };
    script.src = `${WISHES_API_URL}${querySeparator}callback=${encodeURIComponent(callbackName)}&_=${Date.now()}`;
    document.head.appendChild(script);
  });
}

function renderWishes(wishes) {
  if (!wishesList || !wishesStatus) return;

  wishesList.textContent = '';
  if (wishes.length === 0) {
    wishesStatus.textContent = 'Chưa có lời chúc nào. Hãy là người đầu tiên gửi lời chúc nhé!';
    return;
  }

  const fragment = document.createDocumentFragment();
  wishes.forEach((wish) => {
    const item = document.createElement('li');
    const message = document.createElement('p');
    const author = document.createElement('span');

    item.className = 'wish-item';
    message.className = 'wish-message';
    message.textContent = wish.message || '';
    author.className = 'wish-author';
    author.textContent = wish.name || 'Khách mời';
    item.appendChild(author);
    item.appendChild(message);
    fragment.appendChild(item);
  });

  wishesList.appendChild(fragment);
  wishesStatus.textContent = `${wishes.length} lời chúc`;
}

async function loadWishes() {
  if (!wishesList || !wishesStatus) return;
  if (!WISHES_API_URL) {
    wishesStatus.textContent = 'Chưa kết nối nơi lưu lời chúc.';
    return;
  }

  try {
    const result = await getWishes();
    renderWishes(result.wishes);
  } catch (error) {
    wishesStatus.textContent = 'Không tải được lời chúc. Vui lòng thử tải lại trang.';
    console.error('Failed to load shared wishes:', error);
  }
}

async function submitGoogleForm(name, message, attendance) {
  const previous = await getWishes();
  const submittedAt = Date.now();
  const attendanceText = attendance === 'yes'
    ? 'Có, mình sẽ đến chung vui!'
    : 'Tiếc quá, mình không đến được';
  const data = new URLSearchParams({
    [GOOGLE_FORM_ENTRIES.name]: name,
    [GOOGLE_FORM_ENTRIES.message]: message,
    [GOOGLE_FORM_ENTRIES.attendance]: attendanceText
  });

  await fetch(GOOGLE_FORM_RESPONSE_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: data
  });

  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const result = await getWishes();
    const newWishIsVisible = !message || result.wishes.some((wish) => (
      wish.name === name
      && wish.message === message
      && wish.timestamp >= submittedAt - 10000
    ));
    if (result.totalResponses > previous.totalResponses && newWishIsVisible) {
      return result.wishes;
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  throw new Error('The submitted response was not found in the linked Google Sheet.');
}

if (wishesList) loadWishes();

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = (formData.get('name') || '').toString().trim();
    const attendance = formData.get('attendance');
    const message = (formData.get('message') || '').toString().trim();

    if (!name) {
      formStatus.textContent = 'Vui lòng nhập tên của bạn trước khi gửi.';
      return;
    }

    if (!attendance) {
      formStatus.textContent = 'Vui lòng chọn xác nhận tham dự.';
      return;
    }

    if (!WISHES_API_URL) {
      formStatus.textContent = 'Form chưa được kết nối nơi lưu lời chúc.';
      return;
    }

    if (submitButton) submitButton.disabled = true;
    try {
      formStatus.textContent = 'Đang gửi...';
      renderWishes(await submitGoogleForm(name, message, attendance));

      formStatus.textContent = attendance === 'yes'
        ? `Cảm ơn ${name}! Mình sẽ chờ bạn đến dự cùng buổi lễ.`
        : `Cảm ơn ${name}! Chúc bạn luôn bình an và hẹn gặp lại.`;

      form.reset();
    } catch (error) {
      formStatus.textContent = 'Chưa gửi được lời chúc. Vui lòng thử lại sau.';
      console.error('Failed to save shared wish:', error);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

createConfetti();
