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

// 아이보리 종이와 크레파스 글자, 색종이 장식으로 사진 프레임을 그립니다.
const crayonColors = ['#f97d67', '#f6ba4c', '#4daf98', '#526ed3'];
function confetti() {
  const colors = ['#f97d67','#f7c156','#62c5ac','#6d80e8','#ed9fb6'];
  for (let i = 0; i < 90; i++) {
    const x = (i * 127 + 29) % 680 + 20;
    const y = i < 48 ? (i * 43) % 105 + 20 : (i * 37) % 95 + 960;
    ctx.save(); ctx.translate(x, y); ctx.rotate((i % 9) * .37);
    ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(-2, -6, 4, 12); ctx.restore();
  }
}
function doodleChild(x, y, shirt) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#656461';
  ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.arc(0, -16, 20, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-19, -23); ctx.lineTo(-12, -37); ctx.lineTo(-4, -29);
  ctx.lineTo(5, -38); ctx.lineTo(13, -29); ctx.lineTo(21, -35);
  ctx.moveTo(-17, 15); ctx.lineTo(-30, 25); ctx.moveTo(17, 15); ctx.lineTo(30, 25);
  ctx.moveTo(-7, 49); ctx.lineTo(-10, 64); ctx.moveTo(7, 49); ctx.lineTo(10, 64); ctx.stroke();
  ctx.fillStyle = '#656461';
  for (const eye of [-7,7]) { ctx.beginPath(); ctx.arc(eye,-17,2,0,Math.PI*2); ctx.fill(); }
  ctx.beginPath(); ctx.arc(0,-10,8,.15,Math.PI-.15); ctx.stroke();
  ctx.fillStyle = shirt; ctx.beginPath(); ctx.moveTo(-16,5); ctx.lineTo(16,5);
  ctx.lineTo(20,47); ctx.lineTo(-20,47); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawPhoto(i, x, y) {
  const width = 290, height = 335;
  ctx.fillStyle = crayonColors[i]; ctx.fillRect(x - 8, y - 8, width + 16, height + 16);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, width, height);
  if (photos[i]) drawCover(photos[i], x, y, width, height);
  ctx.restore();
}
function render() {
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#fffcf3'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#c8bba913';
  for (let y = 7; y < h; y += 11) for (let x = 9; x < w; x += 13) {
    ctx.fillRect(x + (y % 5), y, 1.5, 1.5);
  }
  confetti();
  ctx.textAlign = 'center'; ctx.font = '900 74px system-ui, sans-serif';
  const syllables = ['해','솔','네','컷'];
  for (let i = 0; i < syllables.length; i++) {
    ctx.save(); ctx.translate(220 + 95 * i, 174 + (i % 2 ? 5 : -3));
    ctx.rotate((i % 2 ? 1 : -1) * .045);
    ctx.fillStyle = crayonColors[i]; ctx.fillText(syllables[i], 0, 0); ctx.restore();
  }
  drawPhoto(0, 55, 230); drawPhoto(1, 375, 230);
  drawPhoto(2, 55, 595); drawPhoto(3, 375, 595);
  doodleChild(265, 982, '#a7d7ec'); doodleChild(360, 982, '#f5b8c6');
  doodleChild(455, 982, '#b8d89a');
  ctx.fillStyle = '#62615b'; ctx.font = '22px system-ui, sans-serif';
  ctx.fillText(new Date().toLocaleDateString('ko-KR'), w / 2, 1056);
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
