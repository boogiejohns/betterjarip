// 연재 에세이: posts.json(정적 파일) 기반 목록 · 전문 보기 (+ 글별 댓글).
// 기고문(Supabase)과 달리, 매일 자동 커밋되는 posts.json만 읽는다.
import { esc, renderBody } from './db.js';
import { initComments } from './comments.js';

const listView = document.getElementById('post-list');
const singleView = document.getElementById('post-single');

const TYPE_LABEL = { A: '사례 소개', B: '우리의 해석', C: '기고' };

const fmtDay = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));
  return m ? `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일` : String(d ?? '');
};

const excerpt = (body, n = 120) => {
  const t = String(body).replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
};

let cache = null;
async function getPosts() {
  if (cache) return cache;
  const res = await fetch('posts.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('posts.json HTTP ' + res.status);
  const data = await res.json();
  // 최신 날짜 먼저. 같은 날짜 안에서는 파일 순서(A→B→C) 유지.
  data.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  cache = data;
  return data;
}

function refHTML(p, full = false) {
  if (!p.refTitle) return '';
  const label = p.refLink
    ? `<a href="${esc(p.refLink)}" target="_blank" rel="noopener">${esc(p.refTitle)}</a>`
    : esc(p.refTitle);
  const note = full && p.refNote ? ` · ${esc(p.refNote)}` : '';
  return `<p class="art-full__meta">참고 원문: ${label}${note}</p>`;
}

async function showList() {
  singleView.hidden = true;
  listView.hidden = false;
  try {
    const posts = await getPosts();
    if (!posts.length) {
      listView.innerHTML = `<p class="archive__empty">아직 등록된 글이 없습니다. 곧 채워집니다.</p>`;
      return;
    }
    listView.innerHTML = posts
      .map(
        (p) => `
        <article class="art-card">
          <h2><a href="?id=${encodeURIComponent(p.id)}">${esc(p.title)}</a></h2>
          <p class="art-card__meta">${esc(TYPE_LABEL[p.type] || '에세이')} · ${esc(p.author || '팀 포레')} · ${fmtDay(p.date)}</p>
          <p class="art-card__excerpt">${esc(excerpt(p.body))}</p>
          <a class="art-card__more" href="?id=${encodeURIComponent(p.id)}">전문 읽기 →</a>
        </article>`
      )
      .join('');
  } catch (e) {
    listView.innerHTML = `<p class="archive__empty">글을 불러오지 못했습니다.</p>`;
    console.error('[posts] list', e);
  }
}

async function showSingle(id) {
  listView.hidden = true;
  singleView.hidden = false;
  singleView.innerHTML = `<p class="archive__empty">불러오는 중…</p>`;

  let post = null;
  try {
    post = (await getPosts()).find((p) => p.id === id) || null;
  } catch (e) {
    console.error('[posts] single', e);
  }
  if (!post) {
    singleView.innerHTML = `<p class="archive__empty">글을 찾을 수 없습니다. <a href="posts.html">목록으로</a></p>`;
    return;
  }

  document.title = `${post.title} — 자립준비청년 공론화`;
  singleView.innerHTML = `
    <a class="back-link" href="posts.html">← 연재 목록</a>
    <article class="art-full">
      <h1>${esc(post.title)}</h1>
      <p class="art-full__meta">${esc(TYPE_LABEL[post.type] || '에세이')} · ${esc(post.author || '팀 포레')} · ${fmtDay(post.date)}</p>
      ${refHTML(post, true)}
      <div class="art-full__body">${renderBody(post.body)}</div>
    </article>
    <section class="comments" id="post-comments">
      <h2 class="comments__title">의견 <span class="comment-count">0</span></h2>
      <form class="comment-form">
        <div class="comment-form__row">
          <input name="author" placeholder="이름" maxlength="40" required aria-label="이름" />
          <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
        </div>
        <textarea name="body" placeholder="이 글에 대한 생각을 남겨주세요." maxlength="2000" required aria-label="댓글 내용"></textarea>
        <div class="comment-form__foot">
          <span class="comment-status" role="status"></span>
          <button type="submit" class="btn btn--primary">등록</button>
        </div>
      </form>
      <ul class="comment-list"></ul>
    </section>`;

  initComments('post-' + post.id, document.getElementById('post-comments'));
}

const params = new URLSearchParams(location.search);
const id = params.get('id');
if (id) showSingle(id);
else showList();
