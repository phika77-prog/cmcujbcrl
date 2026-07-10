const contentApi = window.ResearchPortalContent;

const calendarDays = document.getElementById('calendarDays');
const calendarDetails = document.getElementById('calendarDetails');
const calendarMonthLabel = document.getElementById('calendarMonthLabel');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const announcementStats = document.getElementById('announcementStats');
const announcementList = document.getElementById('announcementList');

let announcementsByDate = {};
let visibleAnnouncements = [];
let currentDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedDate = null;

function formatMonthLabel(date) {
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, '0')}월`;
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getAnnouncementStatus(item) {
  const deadline = parseDateValue(item.deadline);
  const postDate = parseDateValue(item.postDate);
  const today = startOfDay(new Date());

  if (!deadline) {
    return null;
  }

  const deadlineDate = startOfDay(deadline);
  if (deadlineDate < today) {
    return null;
  }

  const oneWeekLater = new Date(today);
  oneWeekLater.setDate(today.getDate() + 7);

  if (deadlineDate <= oneWeekLater) {
    return '마감임박';
  }

  if (!postDate || startOfDay(postDate) <= today) {
    return '접수중';
  }

  return '공고예정';
}

function getVisibleAnnouncements(announcements) {
  return announcements
    .map((item) => ({ ...item, status: getAnnouncementStatus(item) }))
    .filter((item) => item.status)
    .sort((left, right) => {
      const leftDate = parseDateValue(left.deadline) || new Date(2100, 0, 1);
      const rightDate = parseDateValue(right.deadline) || new Date(2100, 0, 1);
      return leftDate - rightDate;
    });
}

function buildAnnouncementsByDate(announcements) {
  return announcements.reduce((accumulator, item) => {
    const deadline = parseDateValue(item.deadline);
    if (!deadline) {
      return accumulator;
    }

    const key = toDateKey(deadline);
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(item);
    return accumulator;
  }, {});
}

function renderCalendar() {
  calendarMonthLabel.textContent = formatMonthLabel(currentDate);
  calendarDays.innerHTML = '';

  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const prevDays = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let index = 0; index < totalCells; index += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar__day';

    let dayNumber;
    let date;
    let otherMonth = false;

    if (index < firstDay) {
      dayNumber = prevDays - firstDay + index + 1;
      date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, dayNumber);
      otherMonth = true;
    } else if (index >= firstDay + daysInMonth) {
      dayNumber = index - firstDay - daysInMonth + 1;
      date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, dayNumber);
      otherMonth = true;
    } else {
      dayNumber = index - firstDay + 1;
      date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
    }

    if (otherMonth) {
      button.classList.add('other-month');
    }

    const today = new Date();
    if (!otherMonth && date.toDateString() === today.toDateString()) {
      button.classList.add('today');
    }

    const dateKey = toDateKey(date);
    const items = announcementsByDate[dateKey] || [];

    button.innerHTML = `
      <span class="calendar__day-number">${dayNumber}</span>
      ${items.slice(0, 2).map((item) => `<span class="calendar__event calendar__event--deadline">${item.title}</span>`).join('')}
    `;

    button.addEventListener('click', () => {
      selectedDate = dateKey;
      renderDetails(dateKey);
      document.querySelectorAll('.calendar__day').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
    });

    calendarDays.appendChild(button);
  }

  if (!selectedDate || !announcementsByDate[selectedDate]) {
    const fallbackDate = toDateKey(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    selectedDate = announcementsByDate[fallbackDate] ? fallbackDate : Object.keys(announcementsByDate)[0] || fallbackDate;
  }
  renderDetails(selectedDate);
}

function renderDetails(dateKey) {
  const date = new Date(dateKey);
  const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const items = announcementsByDate[label] || [];

  const heading = document.createElement('h3');
  heading.textContent = `${date.getMonth() + 1}월 ${date.getDate()}일 일정`;

  const detailList = document.createElement('div');
  detailList.className = 'calendar__detail-list';

  if (items.length === 0) {
    detailList.innerHTML = '<p class="calendar__empty">해당 날짜에는 표시할 공고가 없습니다.</p>';
  } else {
    items.forEach((item) => {
      const detailItem = document.createElement('div');
      detailItem.className = 'calendar__detail-item';
      detailItem.innerHTML = `
        <strong>${item.title}</strong>
        <small>${item.status || '접수 가능'} · ${item.deadline || '기한 미정'} · ${item.dept || item.agency || '기관 미정'}</small>
      `;
      detailList.appendChild(detailItem);
    });
  }

  calendarDetails.innerHTML = '';
  calendarDetails.appendChild(heading);
  calendarDetails.appendChild(detailList);
}

prevMonthBtn.addEventListener('click', () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  renderCalendar();
});

renderCalendar();

async function loadAnnouncements() {
  try {
    const response = await fetch('./widget/announcements.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('announcement data fetch failed');
    }
    const data = await response.json();
    const announcements = Array.isArray(data.announcements) ? data.announcements : [];
    visibleAnnouncements = getVisibleAnnouncements(announcements);
    announcementsByDate = buildAnnouncementsByDate(visibleAnnouncements);
    renderCalendar();
    renderAnnouncementStats(visibleAnnouncements);
    renderAnnouncementList(visibleAnnouncements);
  } catch (error) {
    if (announcementStats) {
      announcementStats.innerHTML = '<div class="empty-state">공고 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>';
    }
    if (announcementList) {
      announcementList.innerHTML = '<div class="empty-state">공고 데이터를 불러오지 못했습니다.</div>';
    }
  }
}

function renderAnnouncementStats(announcements) {
  if (!announcementStats) {
    return;
  }

  const grouped = {
    all: announcements.length,
    active: announcements.filter((item) => item.status === '접수중').length,
    urgent: announcements.filter((item) => item.status === '마감임박').length,
    upcoming: announcements.filter((item) => item.status === '공고예정').length,
  };

  const cards = [
    { key: 'all', label: '전체 공고', value: grouped.all },
    { key: 'active', label: '접수 중', value: grouped.active },
    { key: 'urgent', label: '마감 임박', value: grouped.urgent },
    { key: 'upcoming', label: '공고 예정', value: grouped.upcoming },
  ];

  announcementStats.innerHTML = cards.map((card) => `
    <button class="announcement-stat" type="button" data-filter="${card.key}">
      <div class="announcement-stat__label">${card.label}</div>
      <div class="announcement-stat__value">${card.value}</div>
    </button>
  `).join('');

  announcementStats.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      const filtered = filter === 'all'
        ? announcements
        : announcements.filter((item) => {
            if (filter === 'active') return item.status === '접수중';
            if (filter === 'urgent') return item.status === '마감임박';
            return item.status === '공고예정';
          });
      renderAnnouncementList(filtered);
    });
  });
}

function renderAnnouncementList(items) {
  if (!announcementList) {
    return;
  }

  if (!items.length) {
    announcementList.innerHTML = '<div class="empty-state">현재 표시할 공고가 없습니다.</div>';
    return;
  }

  announcementList.innerHTML = items.slice(0, 8).map((item) => `
    <article class="announcement-item">
      <div class="announcement-item__title">${item.title || '제목 없음'}</div>
      <div class="announcement-item__meta">${item.status || '접수 가능'} · ${item.deadline || '기한 미정'} · ${item.dept || item.agency || '기관 미정'}</div>
      <a class="announcement-item__link" href="${item.url || '#'}" target="_blank" rel="noreferrer">공고문 보기</a>
    </article>
  `).join('');
}

loadAnnouncements();

function getFormFields(section) {
  return contentApi.getSectionConfig(section).fields;
}

function renderItemSummary(section, item) {
  if (section === 'notices') {
    return item.title || '제목 없음';
  }
  if (section === 'achievements') {
    return item.title || '제목 없음';
  }
  if (section === 'patents') {
    return item.registrationNumber || '등록번호 없음';
  }
  if (section === 'equipment') {
    return item.name || '장비명 없음';
  }
  if (section === 'msds') {
    return item.name || '물질명 없음';
  }
  return '';
}

function renderItemMeta(section, item) {
  if (section === 'notices') {
    return `${item.date || ''} · ${item.summary || ''}`.trim();
  }
  if (section === 'achievements') {
    return `${item.publisher || ''} · ${item.year || ''}`.trim();
  }
  if (section === 'patents') {
    return `${item.inventor || ''} · ${item.status || ''}`.trim();
  }
  if (section === 'equipment') {
    return `${item.manager || ''} · ${item.description || ''}`.trim();
  }
  if (section === 'msds') {
    return `${item.pdfUrl || ''}`.trim();
  }
  return '';
}

function populateForm(form, section, item) {
  form.querySelector('input[name="id"]').value = item.id;
  getFormFields(section).forEach((field) => {
    const input = form.querySelector(`[name="${field.key}"]`);
    if (input) {
      input.value = item[field.key] || '';
    }
  });
}

function renderContentSection(section) {
  const listEl = document.getElementById(`${section}List`);
  const adminEl = document.getElementById(`${section}Admin`);
  if (!listEl || !adminEl) {
    return;
  }

  const content = contentApi.loadContent();
  const items = contentApi.getSectionItems(content, section);

  listEl.innerHTML = '';
  adminEl.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = '등록된 항목이 없습니다.';
    listEl.appendChild(empty);
  } else {
    items.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'content-card';
      card.innerHTML = `
        <div class="content-card__header">
          <div>
            <div class="content-card__title">${renderItemSummary(section, item)}</div>
            <div class="content-card__meta">${renderItemMeta(section, item)}</div>
          </div>
          <div class="content-card__actions">
            <button class="btn-edit" type="button" data-action="edit" data-section="${section}" data-id="${item.id}">수정</button>
            <button class="btn-delete" type="button" data-action="delete" data-section="${section}" data-id="${item.id}">삭제</button>
          </div>
        </div>
      `;
      listEl.appendChild(card);
    });
  }

  const form = document.createElement('form');
  form.className = 'content-form';
  form.dataset.section = section;
  form.innerHTML = `
    <h3>${contentApi.getSectionLabel(section)} 등록/수정</h3>
    ${getFormFields(section).map((field) => {
      const id = `${section}-${field.key}`;
      const inputMarkup = field.type === 'textarea'
        ? `<textarea id="${id}" name="${field.key}" rows="3"></textarea>`
        : field.type === 'number'
          ? `<input id="${id}" name="${field.key}" type="number" />`
          : field.type === 'date'
            ? `<input id="${id}" name="${field.key}" type="date" />`
            : field.type === 'url'
              ? `<input id="${id}" name="${field.key}" type="url" />`
              : `<input id="${id}" name="${field.key}" type="text" />`;
      return `<label for="${id}">${field.label}${inputMarkup}</label>`;
    }).join('')}
    <input type="hidden" name="id" value="" />
    <div class="content-form__actions">
      <button class="btn-submit" type="submit">저장</button>
      <button type="button" data-action="cancel">취소</button>
    </div>
  `;

  adminEl.appendChild(form);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const item = { id: formData.get('id') || contentApi.createEmptyItem(section).id };
    getFormFields(section).forEach((field) => {
      item[field.key] = formData.get(field.key) || '';
    });

    const nextContent = contentApi.upsertItem(content, section, item);
    contentApi.saveContent(nextContent);
    renderContentSection(section);
  });

  listEl.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.dataset.action === 'edit') {
      const selected = items.find((entry) => entry.id === target.dataset.id);
      if (!selected) {
        return;
      }
      populateForm(form, section, selected);
      return;
    }

    if (target.dataset.action === 'delete') {
      if (!window.confirm('정말 삭제하시겠습니까?')) {
        return;
      }
      const nextContent = contentApi.removeItem(content, section, target.dataset.id);
      contentApi.saveContent(nextContent);
      renderContentSection(section);
    }
  });

  form.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.dataset.action === 'cancel') {
      form.reset();
      form.querySelector('input[name="id"]').value = '';
    }
  });
}

['notices', 'achievements', 'patents', 'equipment', 'msds'].forEach((section) => {
  renderContentSection(section);
});
