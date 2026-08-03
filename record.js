import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const authPanel = document.querySelector('#auth-panel');
const editorPanel = document.querySelector('#editor-panel');
const authMessage = document.querySelector('#auth-message');
const postMessage = document.querySelector('#post-message');
const saveButton = document.querySelector('#save-button');
const writingLibrary = document.querySelector('#writing-library');
const writingList = document.querySelector('#writing-list');
const today = new Date().toISOString().slice(0, 10);
const writingMode = new URLSearchParams(location.search).get('mode') === 'writing';
document.querySelector('[name="eventDate"]').value = today;
if (writingMode) {
  document.querySelector('#record-title').innerHTML = '읽고 쓰며<br><em>기록하기</em>';
  document.querySelector('#record-intro-copy').innerHTML = '책을 읽고 마음에 남은 생각을 글로 기록하세요.<br>이 글은 그림 갤러리에 전시되지 않습니다.';
  document.querySelector('#image-field').hidden = true;
  document.querySelector('#publish-field').hidden = true;
  document.querySelector('[name="published"]').checked = false;
  document.querySelector('[name="category"]').value = '쓰기';
  document.querySelector('[name="body"]').placeholder = '읽고 생각한 것, 오래 남기고 싶은 문장을 적어주세요.';
}

const UPLOAD_TIMEOUT_MS = 90000;
const MAX_IMAGE_EDGE = 2200;

function withTimeout(promise, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), UPLOAD_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

async function prepareImageForWeb(file) {
  if (!file.type.startsWith('image/')) throw new Error('그림 파일만 올릴 수 있습니다.');
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('그림을 준비하지 못했습니다.')), 'image/jpeg', 0.86));
    const name = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

async function loadWritingPosts(user) {
  if (!writingMode || !user) return;
  writingLibrary.hidden = false;
  writingList.innerHTML = '<p class="writing-empty">저장한 글을 불러오는 중입니다.</p>';
  const { data, error } = await supabase.from('archive_posts').select('id,title,body,category,event_date,created_at').eq('author_id', user.id).eq('published', true).is('image_url', null).order('event_date', { ascending: false }).order('created_at', { ascending: false });
  if (error) {
    writingList.innerHTML = '<p class="writing-empty">글을 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.</p>';
    return;
  }
  if (!data.length) {
    writingList.innerHTML = '<p class="writing-empty">아직 저장한 글이 없습니다. 첫 문장을 남겨보세요.</p>';
    return;
  }
  writingList.innerHTML = data.map((post) => '<article class="writing-item"><small>' + escapeHtml(post.event_date || '') + ' · ' + escapeHtml(post.category || '쓰기') + '</small><h3>' + escapeHtml(post.title) + '</h3><p>' + escapeHtml(post.body || '') + '</p></article>').join('');
}

function showEditor(user) {
  authPanel.hidden = true;
  editorPanel.hidden = false;
  document.querySelector('#signed-in-email').textContent = user.email;
  if (writingMode) loadWritingPosts(user);
}
function showLogin() { authPanel.hidden = false; editorPanel.hidden = true; }

const { data: { session } } = await supabase.auth.getSession();
if (session) showEditor(session.user);

document.querySelector('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault(); authMessage.textContent = '로그인 중입니다.';
  const form = new FormData(event.currentTarget);
  const { data, error } = await supabase.auth.signInWithPassword({ email: form.get('email'), password: form.get('password') });
  if (error) { authMessage.textContent = '이메일 또는 비밀번호를 다시 확인해 주세요.'; return; }
  showEditor(data.user);
});

document.querySelector('#signup-button').addEventListener('click', async () => {
  const form = new FormData(document.querySelector('#login-form'));
  if (!form.get('email') || !form.get('password')) { authMessage.textContent = '먼저 이메일과 비밀번호를 적어 주세요.'; return; }
  authMessage.textContent = '계정을 만드는 중입니다.';
  const { error } = await supabase.auth.signUp({ email: form.get('email'), password: form.get('password'), options: { emailRedirectTo: `${location.origin}/record.html` } });
  authMessage.textContent = error ? '계정을 만들지 못했습니다. 비밀번호를 6자 이상으로 적어 주세요.' : '이메일로 확인 링크를 보냈습니다. 링크를 누른 뒤 다시 로그인해 주세요.';
});

document.querySelector('#signout-button').addEventListener('click', async () => { await supabase.auth.signOut(); showLogin(); });

document.querySelector('#post-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const postForm = event.currentTarget;
  saveButton.disabled = true;
  let uploadedPath = null;
  try {
    postMessage.textContent = '기록을 확인하는 중입니다.';
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('로그인이 필요합니다. 다시 로그인해 주세요.');
    const form = new FormData(postForm);
    const image = form.get('image');
    let imageUrl = null;
    if (image && image.size) {
      postMessage.textContent = '그림을 웹용 크기로 준비하는 중입니다.';
      const webImage = await prepareImageForWeb(image);
      const safeName = webImage.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      uploadedPath = `${user.id}/${Date.now()}-${safeName}`;
      postMessage.textContent = '그림을 저장소에 올리는 중입니다. 큰 그림도 보통 1분 안에 끝납니다.';
      const { error: uploadError } = await withTimeout(supabase.storage.from('archive-images').upload(uploadedPath, webImage, { cacheControl: '3600', contentType: webImage.type }), '그림 전송이 90초 안에 끝나지 않았습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
      if (uploadError) throw new Error('그림을 저장소에 올리지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
      imageUrl = supabase.storage.from('archive-images').getPublicUrl(uploadedPath).data.publicUrl;
    }
    postMessage.textContent = '글과 그림을 함께 저장하는 중입니다.';
    const { error } = await withTimeout(supabase.from('archive_posts').insert({ title: form.get('title'), category: form.get('category'), event_date: form.get('eventDate'), body: form.get('body'), image_url: imageUrl, published: writingMode ? true : form.get('published') === 'on', author_id: user.id }), '기록 저장이 90초 안에 끝나지 않았습니다. 잠시 뒤 다시 시도해 주세요.');
    if (error) throw new Error('기록을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
    postForm.reset();
    document.querySelector('[name="eventDate"]').value = today;
    postMessage.textContent = writingMode ? '글쓰기 기록에 저장했습니다. 아래 나의 글 기록에서 확인할 수 있습니다.' : '저장했습니다. 공개 기록은 갤러리에 바로 나타납니다.';
    if (writingMode) await loadWritingPosts(user);
  } catch (error) {
    console.error(error);
    if (uploadedPath) await supabase.storage.from('archive-images').remove([uploadedPath]);
    postMessage.textContent = error.message || '저장 중 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요.';
  } finally {
    saveButton.disabled = false;
  }
});
