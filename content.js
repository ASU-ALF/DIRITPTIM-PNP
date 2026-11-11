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
    const fullDetails = typeof entry.details === 'string' ? entry.details.trim() : '';
    if (fullDetails) {
      const disclosure = make('details', 'card-details');
      disclosure.append(make('summary', '', 'Leer más'));
      disclosure.append(make('p', 'card-details-body', fullDetails));
      article.append(disclosure);
    }
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
  const safeContentUrl = (raw) => {
    if (!raw) return '';
    try {
      const url = new URL(raw, window.location.origin);
      if (url.protocol === 'https:' || (url.protocol === 'http:' && url.origin === window.location.origin)) return url.href;
    } catch (_) { /* omite URL inválidas */ }
    return '';
  };
  const defaultWelcome = {
    enabled: true,
    title: 'Bienvenido/a a DIRITPTIM PNP',
    message: 'Este espacio reúne información de prevención, orientación y publicaciones institucionales autorizadas sobre la trata de personas. Si alguien está en peligro inmediato, comunícate con los canales oficiales de emergencia.',
    buttonText: 'Conoce las señales de alerta',
    buttonUrl: '#reconocer'
  };
  const showAnnouncement = (announcement, kicker = 'AVISO IMPORTANTE') => {
    if (!announcement || announcement.enabled !== true) return;
    const titleText = (announcement.title || '').trim();
    const messageText = (announcement.message || '').trim();
    if (!titleText && !messageText) return;
    try {
      if (window.sessionStorage.getItem('diritptim-pnp-announcement-dismissed') === '1') return;
    } catch (_) { /* continúa si el navegador bloquea el almacenamiento */ }

    const previousFocus = document.activeElement;
    const overlay = make('div', 'announcement-overlay');
    const dialog = make('section', 'announcement-dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'announcement-title');
    dialog.setAttribute('aria-describedby', 'announcement-message');
    dialog.tabIndex = -1;

    const closeButton = make('button', 'announcement-close', '×');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Cerrar aviso');
    const close = () => {
      try { window.sessionStorage.setItem('diritptim-pnp-announcement-dismissed', '1'); } catch (_) { /* no bloquea el cierre */ }
      overlay.remove();
      document.body.classList.remove('announcement-open');
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
    closeButton.addEventListener('click', close);
    dialog.append(closeButton, make('span', 'announcement-kicker', kicker));

    const heading = make('h2', '', titleText || 'Aviso institucional');
    heading.id = 'announcement-title';
    const message = make('p', '', messageText);
    message.id = 'announcement-message';
    dialog.append(heading, message);

    const imageUrl = safeContentUrl(announcement.image);
    if (imageUrl) {
      const image = make('img');
      image.src = imageUrl;
      image.alt = announcement.imageAlt || '';
      image.loading = 'eager';
      dialog.append(image);
    }

    const buttonUrl = safeContentUrl(announcement.buttonUrl);
    const buttonText = (announcement.buttonText || '').trim();
    if (buttonUrl && buttonText) {
      const action = make('a', 'btn gold announcement-action', buttonText);
      action.href = buttonUrl;
      if (new URL(buttonUrl).origin !== window.location.origin) {
        action.target = '_blank';
        action.rel = 'noopener noreferrer';
      }
      dialog.append(action);
    }

    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = Array.from(dialog.querySelectorAll('button:not([disabled]), a[href]'));
        if (!focusable.length) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });
    overlay.append(dialog);
    document.body.append(overlay);
    document.body.classList.add('announcement-open');
    closeButton.focus();
  };
  const showWhatsAppButton = (settings) => {
    if (!settings || settings.enabled !== true) return;
    const phone = String(settings.phone || '').replace(/\D/g, '');
    if (!/^\d{8,15}$/.test(phone)) return;
    const initialMessage = 'Hola, deseo orientación general sobre prevención de la trata de personas. No compartiré datos personales ni información urgente por este chat.';
    const link = make('a', 'whatsapp-float');
    link.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(initialMessage);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'WhatsApp institucional para consultas generales. No es un canal de emergencia.');
    link.title = 'Consultas generales. No es un canal de emergencia ni de denuncia confidencial.';
    const icon = make('span', 'whatsapp-icon', '☎');
    icon.setAttribute('aria-hidden', 'true');
    const copy = make('span', 'whatsapp-copy');
    copy.append(make('span', 'whatsapp-label', 'WhatsApp · consultas generales'));
    const hours = (settings.hours || '').trim();
    if (hours) copy.append(make('small', 'whatsapp-hours', 'Horario: ' + hours));
    link.append(icon, copy);
    document.body.append(link);
  };
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
  const setCopy = (id, value) => {
    const target = byId(id);
    if (target && typeof value === 'string') target.textContent = value;
  };
  const renderContactCards = (targetId, entries, emptyText) => {
    const target = byId(targetId);
    if (!target || !Array.isArray(entries)) return;
    target.replaceChildren();
    if (!entries.length) {
      target.append(make('p', 'empty-feed', emptyText));
      return;
    }
    for (const entry of entries) {
      const article = make('article', 'card');
      article.append(make('span', 'num', entry.category || 'CANAL INSTITUCIONAL'));
      article.append(make('h3', '', entry.title || 'Canal de atención'));
      if (entry.description) article.append(make('p', '', entry.description));
      const phone = String(entry.phone || '').trim();
      const digits = phone.replace(/\D/g, '');
      const email = String(entry.email || '').trim();
      let href = '';
      let actionText = String(entry.buttonText || '').trim();
      if (phone && /^\d{3,15}$/.test(digits)) {
        href = 'tel:' + digits;
        article.append(make('p', 'contact-phone', phone));
        if (!actionText) actionText = 'Llamar';
      } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        href = 'mailto:' + email;
        article.append(make('p', 'contact-phone', email));
        if (!actionText) actionText = 'Enviar correo';
      } else {
        href = safeContentUrl(entry.url);
        if (!actionText) actionText = 'Abrir canal oficial ↗';
      }
      if (href) {
        const action = make('a', 'btn gold contact-action', actionText);
        action.href = href;
        if (href.startsWith('https://') && new URL(href).origin !== window.location.origin) {
          action.target = '_blank';
          action.rel = 'noopener noreferrer';
        }
        article.append(action);
      } else {
        article.append(make('span', 'tag', 'Canal por confirmar'));
      }
      target.append(article);
    }
  };
  const renderContactSection = (data, key, sectionId, titleId, introId, feedId, noteTitleId, noteMessageId, emptyText) => {
    const settings = data[key];
    const section = byId(sectionId);
    if (!settings || typeof settings !== 'object' || !section) return;
    if (settings.enabled === false) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    if (Object.hasOwn(settings, 'title')) setCopy(titleId, String(settings.title || ''));
    if (Object.hasOwn(settings, 'intro')) setCopy(introId, String(settings.intro || ''));
    renderContactCards(feedId, settings.items, emptyText);
    const noteTitle = byId(noteTitleId);
    const noteMessage = byId(noteMessageId);
    const note = noteTitle ? noteTitle.closest('.notice') : null;
    if (note && (Object.hasOwn(settings, 'noteTitle') || Object.hasOwn(settings, 'noteMessage'))) {
      if (Object.hasOwn(settings, 'noteTitle')) noteTitle.textContent = String(settings.noteTitle || '');
      if (Object.hasOwn(settings, 'noteMessage') && noteMessage) noteMessage.textContent = String(settings.noteMessage || '');
      note.hidden = !((noteTitle && noteTitle.textContent.trim()) || (noteMessage && noteMessage.textContent.trim()));
    }
  };
  const materialCard = (entry, fallbackLabel = 'MATERIAL INFORMATIVO') => {
    const article = make('article', 'card');
    article.append(make('span', 'num', entry.category || fallbackLabel));
    article.append(make('h3', '', entry.title || 'Material informativo'));
    if (entry.description) article.append(make('p', '', entry.description));
    const fileUrl = safeContentUrl(entry.file);
    const externalUrl = safeContentUrl(entry.url);
    const resourceUrl = fileUrl || externalUrl;
    if (resourceUrl) {
      const text = String(entry.buttonText || (fileUrl ? 'Descargar material' : 'Abrir recurso ↗')).trim();
      const action = make('a', 'btn gold contact-action', text || 'Descargar material');
      action.href = resourceUrl;
      if (fileUrl && new URL(fileUrl).origin === window.location.origin) action.download = '';
      else {
        action.target = '_blank';
        action.rel = 'noopener noreferrer';
      }
      article.append(action);
    } else {
      article.append(make('span', 'tag', 'Archivo por cargar'));
    }
    return article;
  };
  const renderMaterialsSection = (data) => {
    const settings = data.materialsSection;
    const section = byId('materiales');
    const target = byId('materials-feed');
    if (!settings || typeof settings !== 'object' || !section || !target) return;
    if (settings.enabled === false) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    if (Object.hasOwn(settings, 'title')) setCopy('materials-title', String(settings.title || ''));
    if (Object.hasOwn(settings, 'intro')) setCopy('materials-intro', String(settings.intro || ''));
    target.replaceChildren();
    const guide = settings.featuredGuide && typeof settings.featuredGuide === 'object' ? settings.featuredGuide : {
      enabled: true,
      category: 'GUÍA INFORMATIVA',
      title: 'Señales de alerta y cómo actuar',
      description: 'Resumen imprimible con recomendaciones generales y pautas para proteger la privacidad.',
      file: '/guia-prevencion.html',
      buttonText: 'Descargar guía'
    };
    if (guide.enabled !== false) target.append(materialCard(guide, 'GUÍA INFORMATIVA'));
    const items = Array.isArray(settings.items) ? settings.items : [];
    for (const item of items) target.append(materialCard(item));
    if (!target.children.length) target.append(make('p', 'empty-feed', 'Todavía no hay materiales publicados. Puedes agregarlos desde el panel de administración.'));
  };
  const renderEmergencyNotice = (settings) => {
    const notice = byId('emergency-notice');
    if (!settings || typeof settings !== 'object' || !notice) return;
    if (settings.enabled === false) {
      notice.hidden = true;
      return;
    }
    notice.hidden = false;
    if (Object.hasOwn(settings, 'title')) setCopy('emergency-notice-title', String(settings.title || ''));
    if (Object.hasOwn(settings, 'message')) setCopy('emergency-notice-message', String(settings.message || ''));
  };
  fetch('/data/site-content.json', { cache: 'no-store' })
    .then((response) => { if (!response.ok) throw new Error('No se pudo leer el contenido'); return response.json(); })
    .then((data) => {
      const hasActiveAnnouncement = data.announcement && data.announcement.enabled === true && ((data.announcement.title || '').trim() || (data.announcement.message || '').trim());
      if (hasActiveAnnouncement) {
        showAnnouncement(data.announcement);
      } else {
        const welcome = data.welcome && typeof data.welcome === 'object' ? data.welcome : defaultWelcome;
        showAnnouncement(welcome, 'BIENVENIDO/A');
      }
      renderEmergencyNotice(data.emergencyNotice);
      renderContactSection(data, 'emergencyContacts', 'emergencias', 'emergency-contacts-title', 'emergency-contacts-intro', 'emergency-contacts-feed', 'emergency-contacts-note-title', 'emergency-contacts-note-message', 'Los contactos oficiales aparecerán aquí cuando se agreguen desde el panel.');
      renderContactSection(data, 'consultations', 'consultas', 'consultations-title', 'consultations-intro', 'consultations-feed', 'consultations-note-title', 'consultations-note-message', 'Los canales de consulta aparecerán aquí cuando se agreguen desde el panel.');
      renderMaterialsSection(data);
      showWhatsAppButton(data.whatsapp);
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

