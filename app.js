import { MAIL_WEB_APP_URL } from "./config.js";
const video = document.querySelector('#video');
const livePreview = document.querySelector('#livePreview');
const liveCtx = livePreview.getContext('2d');
let cameraLoop = 0;
let hasLiveFrame = false;
const canvas = document.querySelector('#preview');
const ctx = canvas.getContext('2d');
const status = document.querySelector('#status');
const countdown = document.querySelector('#countdown');
const progress = document.querySelector('#progress');
const start = document.querySelector('#start');
const shoot = document.querySelector('#shoot');
const retry = document.querySelector('#retry');
const download = document.querySelector('#download');
const send = document.querySelector('#send');
const form = document.querySelector('#mailForm');
const email = document.querySelector('#email');
let stream;
let busy = false;
let photos = [];
let ready = false;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const message = text => { status.textContent = text; };
function drawCover(source, x, y, w, h) {
  const sw = source.videoWidth || source.width;
  const sh = source.videoHeight || source.height;
  const scale = Math.max(w / sw, h / sh);
  const cw = w / scale, ch = h / scale;
  ctx.drawImage(source, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, w, h);
}

function coverTo(context, source, width, height) {
  const sw = source.videoWidth || source.width;
  const sh = source.videoHeight || source.height;
  const scale = Math.max(width / sw, height / sh);
  context.drawImage(source, (sw - width / scale) / 2, (sh - height / scale) / 2,
    width / scale, height / scale, 0, 0, width, height);
}
function drawLive() {
  const width = livePreview.width, height = livePreview.height;
  liveCtx.clearRect(0, 0, width, height);
  if (video.videoWidth) coverTo(liveCtx, video, width, height);
  hasLiveFrame = true;
}
function updateCamera() {
  if (!stream) return;
  cameraLoop = requestAnimationFrame(updateCamera);
  if (video.readyState >= 2) drawLive();
}

// 첨부된 연두색 2×2 네컷 프레임을 캔버스 도형으로 재현합니다.
function clover(x, y, size, color = '#85d448') {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(angle) * size * .42, Math.sin(angle) * size * .42,
      size * .42, size * .34, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath(); ctx.arc(0, 0, size * .18, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function sparkle(x, y, size, color = '#80cf43') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
  ctx.fillStyle = color; ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();
}
function character(x, y, scale) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.fillStyle = '#a9e95a';
  // 네잎클로버처럼 둥근 머리와 작은 몸
  for (const [cx, cy] of [[-28,-23],[28,-23],[-28,18],[28,18]]) {
    ctx.beginPath(); ctx.arc(cx, cy, 33, 0, Math.PI * 2); ctx.fill();
  }
  ctx.beginPath(); ctx.ellipse(0, 45, 38, 23, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#85cf3c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-32, -29); ctx.lineTo(-41, -38);
  ctx.moveTo(32, -29); ctx.lineTo(41, -38); ctx.stroke();
  ctx.fillStyle = '#346322';
  for (const ex of [-10, 10]) {
    ctx.beginPath(); ctx.arc(ex, -1, 2.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#346322'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 3, 7, .15, Math.PI - .15); ctx.stroke();
  ctx.restore();
}
function drawPhoto(i, x, y) {
  const width = 304, height = 368;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, width, height);
  if (photos[i]) drawCover(photos[i], x, y, width, height);
  ctx.restore();
}
function render() {
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#c4f47b'; ctx.fillRect(0, 0, w, h);
  // 사진 네 장은 참고 이미지의 흰 사각형과 같은 2×2 구성입니다.
  drawPhoto(0, 40, 135); drawPhoto(1, 376, 135);
  drawPhoto(2, 40, 535); drawPhoto(3, 376, 535);
  clover(306, 66, 17, '#a5e761');
  clover(360, 66, 17, '#95dc50');
  clover(414, 66, 17, '#a5e761');
  clover(39, 185, 16); sparkle(40, 222, 14);
  sparkle(681, 400, 16); clover(39, 637, 15);
  sparkle(681, 880, 13); clover(681, 911, 16);
  character(164, 1027, 1.04);
  character(360, 1027, 1.04);
  character(555, 1027, 1.04);
  clover(42, 1033, 22); clover(680, 1033, 22);
  progress.textContent = `${photos.length} / 4 촬영`;
}

function reset() {
  photos = []; ready = false; busy = false; email.value = '';
  shoot.disabled = !stream; retry.disabled = true; send.disabled = true; download.disabled = true;
  render(); message('준비됐어요. 네 장 촬영을 눌러 주세요.');
}
start.addEventListener('click', async () => {
  try {
    cancelAnimationFrame(cameraLoop); stream?.getTracks().forEach(track => track.stop());
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
    hasLiveFrame = false; video.srcObject = stream;
    await video.play(); start.disabled = true; shoot.disabled = false;
    cameraLoop = requestAnimationFrame(updateCamera);
    document.querySelector('#cameraHint').textContent = '화면에는 거울처럼 보이고 사진도 같은 방향으로 저장돼요.';
    message('준비됐어요. 네 장 촬영을 눌러 주세요.');
  } catch { message('카메라를 열 수 없어요. 브라우저 권한과 HTTPS 연결을 확인해 주세요.'); }
});
shoot.addEventListener('click', async () => {
  if (busy || !stream || video.videoWidth === 0 || !hasLiveFrame) return;
  busy = true; shoot.disabled = true; retry.disabled = true; send.disabled = true;
  photos = []; ready = false; render();
  try {
    for (let i = 0; i < 4; i++) {
      message(`${i + 1}번째 사진 준비!`);
      for (let n = 3; n > 0; n--) { countdown.textContent = n; await pause(1000); }
      countdown.textContent = '찰칵!';
      const shot = document.createElement('canvas'); shot.width = 600; shot.height = 340;
      const shotCtx = shot.getContext('2d');
      shotCtx.translate(600, 0); shotCtx.scale(-1, 1);
      coverTo(shotCtx, livePreview, 600, 340);
      photos.push(shot); render(); await pause(400); countdown.textContent = '';
    }
    ready = true; send.disabled = false; download.disabled = false; message('완성! 이메일을 입력해 사진을 보내세요.');
  } finally { countdown.textContent = ''; busy = false; retry.disabled = false; }
});
retry.addEventListener('click', reset);
download.addEventListener('click', () => {
  if (!photos.length) return;
  const link = document.createElement('a');
  link.download = 'festival-four-cuts.jpg';
  link.href = canvas.toDataURL('image/jpeg', .85);
  link.click();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!ready || busy || !form.reportValidity()) return;
  if (!/^https:\/\/script\.google\.com\/(?:macros|a\/macros\/[^/]+)\/s\/[^/]+\/exec$/.test(MAIL_WEB_APP_URL)) {
    message('관리자 설정이 필요합니다. config.js에 배포된 웹 앱 주소를 입력해 주세요.'); return;
  }
  // 일반 HTML 폼 제출: 별도 결과 탭에 서버의 성공/실패를 표시합니다.
  form.action = MAIL_WEB_APP_URL;
  form.method = 'POST';
  form.target = '_blank';
  document.querySelector('#photoData').value = canvas.toDataURL('image/jpeg', .82).split(',')[1];
  document.querySelector('#email').value = email.value.trim();
  HTMLFormElement.prototype.submit.call(form);
  document.querySelector('#photoData').value = '';
  message('전송 결과가 새 탭에 표시됩니다. 결과를 확인한 뒤 다음 팀은 다시 찍기를 눌러 주세요.');
});
window.addEventListener('pagehide', () => { cancelAnimationFrame(cameraLoop); stream?.getTracks().forEach(track => track.stop()); });
render();
