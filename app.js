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

// 칠판과 분필 장식으로 완성 사진 프레임을 그립니다.
function cherry(x, y, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.strokeStyle = '#a7ce74'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -23); ctx.quadraticCurveTo(-9, -7, -19, 7);
  ctx.moveTo(0, -23); ctx.quadraticCurveTo(12, -6, 19, 7); ctx.stroke();
  ctx.fillStyle = '#a9d575'; ctx.beginPath(); ctx.ellipse(10, -27, 14, 6, -.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ef686d';
  for (const cx of [-20, 20]) {
    ctx.beginPath(); ctx.arc(cx, 15, 13, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function chalkFlower(x, y, color) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.lineWidth = 4;
  for (let i = 0; i < 5; i++) {
    ctx.save(); ctx.rotate(i * 2 * Math.PI / 5);
    ctx.beginPath(); ctx.ellipse(0, -13, 7, 12, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
function chalkChild(x, y, color) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#dde9d1';
  ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.arc(0, -17, 17, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-12, -34); ctx.lineTo(-7, -42);
  ctx.moveTo(1, -36); ctx.lineTo(4, -44); ctx.moveTo(10, -32); ctx.lineTo(17, -38);
  ctx.moveTo(-18, 19); ctx.lineTo(-31, 30); ctx.moveTo(18, 19); ctx.lineTo(31, 30);
  ctx.moveTo(-7, 50); ctx.lineTo(-12, 64); ctx.moveTo(7, 50); ctx.lineTo(12, 64); ctx.stroke();
  ctx.fillStyle = '#eef0da';
  for (const eye of [-7, 7]) { ctx.beginPath(); ctx.arc(eye, -19, 1.8, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.arc(0, -13, 7, .15, Math.PI - .15); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-15, 6); ctx.lineTo(15, 6);
  ctx.lineTo(20, 48); ctx.lineTo(-20, 48); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#f9edd8'; ctx.beginPath(); ctx.moveTo(-8, 15); ctx.lineTo(3, 37); ctx.lineTo(10, 17); ctx.stroke();
  ctx.restore();
}
function drawPhoto(i, x, y) {
  const width = 290, height = 335;
  ctx.fillStyle = '#f8f5e8'; ctx.fillRect(x - 7, y - 7, width + 14, height + 14);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
  ctx.fillStyle = '#fcfaf2'; ctx.fillRect(x, y, width, height);
  if (photos[i]) drawCover(photos[i], x, y, width, height);
  ctx.restore();
}
function render() {
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#2d543f'; ctx.fillRect(0, 0, w, h);
  // 일정한 분필 알갱이 무늬: 매번 그려도 사진 결과가 달라지지 않습니다.
  ctx.fillStyle = '#f6f4d50a';
  for (let y = 8; y < h; y += 13) for (let x = 11; x < w; x += 17) {
    ctx.fillRect(x + ((y * 7) % 8), y, 2, 2);
  }
  ctx.strokeStyle = '#c0d1be99'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.strokeRect(22, 23, w - 44, h - 46);
  cherry(w / 2, 68, .82);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9ad';
  ctx.font = '900 64px system-ui, sans-serif'; ctx.fillText('해솔 네컷', w / 2, 173);
  ctx.strokeStyle = '#e4bbcf'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(245, 190); ctx.quadraticCurveTo(360, 209, 475, 190); ctx.stroke();
  drawPhoto(0, 55, 230); drawPhoto(1, 375, 230);
  drawPhoto(2, 55, 595); drawPhoto(3, 375, 595);
  chalkFlower(38, 577, '#edb7c8'); chalkFlower(684, 573, '#e9d998');
  chalkChild(290, 987, '#a2c777'); chalkChild(430, 987, '#e6aabf');
  chalkFlower(88, 997, '#ebaabc'); chalkFlower(631, 995, '#a8c97b');
  ctx.fillStyle = '#e4e9d3'; ctx.font = '22px system-ui, sans-serif';
  ctx.fillText(new Date().toLocaleDateString('ko-KR'), w / 2, 1053);
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
