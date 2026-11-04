/* Renderiza las publicaciones aprobadas desde data/site-content.json. */
(() => {
  const byId = (id) => document.getElementById(id);
  const safeDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(date);
  };
  const make = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  const card = (entry, label, { image = true, region = false, video = false, link = false } = {}) => {
    const article = make('article', 'card');
    article.append(make('span', 'num', label + (entry.date ? ' / ' + safeDate(entry.date) : '')));
    if (image && entry.image) {
      const img = make('img', 'media-photo');
      img.src = entry.image;
      img.alt = entry.imageAlt || 'Imagen institucional autorizada';
      img.loading = 'lazy';
      article.append(img);
    }
    article.append(make('h3', '', entry.title || 'Publicación institucional'));
    if (region && entry.region) {
      const place = make('p');
      const strong = make('strong', '', 'Región: ');
      place.append(strong, document.createTextNode(entry.region));
      article.append(place);
    }
    if (entry.summary) article.append(make('p', '', entry.summary));
    if (link && entry.sourceUrl) {
      try {
        const url = new URL(entry.sourceUrl);
        if (url.protocol === 'https:' || url.protocol === 'http:') {
          const a = make('a', '', 'Ver comunicado oficial ↗');
          a.href = url.href;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          article.append(a);
        }
      } catch (_) { /* omite enlaces inválidos */ }
    }
    if (video && entry.videoUrl) {
      const embed = youtubeEmbed(entry.videoUrl);
      if (embed) {
        const frameWrap = make('div', 'video-embed');
        const frame = make('iframe');
        frame.src = embed;
        frame.title = entry.title || 'Video de prevención';
        frame.loading = 'lazy';
        frame.allowFullscreen = true;
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        frameWrap.append(frame);
        article.prepend(frameWrap);
      } else {
        const a = make('a', '', 'Ver video institucional ↗');
        a.href = entry.videoUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        article.append(a);
      }
    }
    return article;
  };
  function youtubeEmbed(raw) {
    try {
      const url = new URL(raw);
      let id = '';
      if (url.hostname.endsWith('youtu.be')) id = url.pathname.slice(1);
      else if (url.hostname.includes('youtube.com')) {
        if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
        else if (url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2] || '';
        else if (url.pathname.startsWith('/shorts/')) id = url.pathname.split('/')[2] || '';
      }
      return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? 'https://www.youtube-nocookie.com/embed/' + id : '';
    } catch (_) { return ''; }
  }
  const render = (targetId, entries, label, options = {}, emptyText = 'Próximamente se publicará contenido aprobado.') => {
    const target = byId(targetId);
    if (!target) return;
    target.replaceChildren();
    const items = Array.isArray(entries) ? entries.slice() : [];
    if (options.sortByDate) items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    if (options.limit) items.splice(options.limit);
    if (!items.length) {
      target.append(make('p', 'empty-feed', emptyText));
      return;
    }
    for (const item of items) target.append(card(item, label, options));
  };
  fetch('/data/site-content.json', { cache: 'no-store' })
    .then((response) => { if (!response.ok) throw new Error('No se pudo leer el contenido'); return response.json(); })
    .then((data) => {
      const newsItems = Array.isArray(data.news) ? data.news.slice().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)) : [];
      render('news-feed', newsItems, 'COMUNICADO OFICIAL', { sortByDate: true, limit: 3, link: true }, 'Las nuevas noticias aprobadas aparecerán aquí.');
      if (newsItems.length) {
        const banner = byId('latest-news-banner');
        const latest = newsItems[0];
        byId('latest-news-title').textContent = latest.title || 'Nueva publicación';
        byId('latest-news-summary').textContent = latest.summary || '';
        const latestLink = byId('latest-news-link');
        if (latest.sourceUrl) {
          try { const url = new URL(latest.sourceUrl); if (url.protocol === 'https:' || url.protocol === 'http:') { latestLink.href = url.href; latestLink.target = '_blank'; latestLink.rel = 'noopener noreferrer'; latestLink.textContent = 'Leer comunicado ↗'; } } catch (_) { /* usa ancla local */ }
        }
        banner.hidden = false;
      }
      render('operations-feed', data.operations, 'OPERATIVO', { sortByDate: true, region: true }, 'Los operativos autorizados para difusión aparecerán aquí.');
      render('cases-feed', data.cases, 'CASO RESUELTO', { sortByDate: true }, 'Los casos aprobados para difusión aparecerán aquí.');
      render('videos-feed', data.videos, 'VIDEO DE PREVENCIÓN', { video: true, image: false }, 'Los videos institucionales aparecerán aquí.');
    })
    .catch(() => {
      for (const id of ['news-feed', 'operations-feed', 'cases-feed', 'videos-feed']) {
        const target = byId(id);
        if (target && !target.children.length) target.append(make('p', 'empty-feed', 'El contenido se mostrará cuando el sitio esté conectado al panel editorial.'));
      }
    });
})();

