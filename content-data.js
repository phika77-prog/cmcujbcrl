(function () {
  const STORAGE_KEY = 'research-portal-content-v1';

  const SECTION_DEFS = {
    notices: {
      label: '공지사항',
      fields: [
        { key: 'title', label: '제목', type: 'text' },
        { key: 'date', label: '작성일', type: 'date' },
        { key: 'summary', label: '내용', type: 'textarea' },
      ],
    },
    achievements: {
      label: '연구업적',
      fields: [
        { key: 'title', label: '제목', type: 'text' },
        { key: 'publisher', label: '출판/저널', type: 'text' },
        { key: 'year', label: '연도', type: 'number' },
      ],
    },
    patents: {
      label: '특허',
      fields: [
        { key: 'registrationNumber', label: '등록번호', type: 'text' },
        { key: 'inventor', label: '발명자', type: 'text' },
        { key: 'status', label: '상태', type: 'text' },
        { key: 'pdfUrl', label: 'PDF URL', type: 'url' },
      ],
    },
    equipment: {
      label: '연구장비',
      fields: [
        { key: 'name', label: '장비명', type: 'text' },
        { key: 'description', label: '설명', type: 'textarea' },
        { key: 'manager', label: '담당자', type: 'text' },
        { key: 'reservationUrl', label: '예약 URL', type: 'url' },
        { key: 'manualUrl', label: '매뉴얼 URL', type: 'url' },
      ],
    },
    msds: {
      label: 'MSDS',
      fields: [
        { key: 'name', label: '물질명', type: 'text' },
        { key: 'pdfUrl', label: 'PDF URL', type: 'url' },
      ],
    },
  };

  const DEFAULT_CONTENT = {
    notices: [
      {
        id: 'notice-1',
        title: '연구윤리 교육',
        date: '2026-07-01',
        summary: '다음 주 연구윤리 교육 일정이 공지되었습니다.',
      },
      {
        id: 'notice-2',
        title: '연구과제 공모',
        date: '2026-06-20',
        summary: '연구과제 공모 안내가 게시되었습니다.',
      },
    ],
    achievements: [
      {
        id: 'achievement-1',
        title: 'SCI 논문',
        publisher: 'Nature',
        year: 2026,
      },
      {
        id: 'achievement-2',
        title: 'Cancer Research',
        publisher: 'Cancer Research',
        year: 2025,
      },
    ],
    patents: [
      {
        id: 'patent-1',
        registrationNumber: 'KR2026-000123',
        inventor: '김연구, 박의사',
        status: '등록 완료',
        pdfUrl: 'https://example.com/patent.pdf',
      },
    ],
    equipment: [
      {
        id: 'equipment-1',
        name: 'Confocal Microscope',
        description: '공초점 현미경입니다.',
        manager: '박민수',
        reservationUrl: '#',
        manualUrl: '#',
      },
    ],
    msds: [
      { id: 'msds-1', name: 'PLA', pdfUrl: 'https://example.com/pla.pdf' },
      { id: 'msds-2', name: 'ABS', pdfUrl: 'https://example.com/abs.pdf' },
    ],
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createId(section) {
    return `${section}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function createEmptyItem(section) {
    const item = { id: createId(section) };
    const config = SECTION_DEFS[section];
    config.fields.forEach((field) => {
      item[field.key] = '';
    });
    return item;
  }

  function getDefaultContent() {
    return clone(DEFAULT_CONTENT);
  }

  function loadContent(storageKey = STORAGE_KEY) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return getDefaultContent();
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return getDefaultContent();
      }
      const parsed = JSON.parse(raw);
      return {
        notices: parsed.notices || [],
        achievements: parsed.achievements || [],
        patents: parsed.patents || [],
        equipment: parsed.equipment || [],
        msds: parsed.msds || [],
      };
    } catch (error) {
      console.error('Failed to load content:', error);
      return getDefaultContent();
    }
  }

  function saveContent(content, storageKey = STORAGE_KEY) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return content;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(content));
    return content;
  }

  function upsertItem(content, section, item) {
    const next = clone(content);
    const items = next[section] || [];
    const existingIndex = items.findIndex((entry) => entry.id === item.id);
    if (existingIndex >= 0) {
      items[existingIndex] = item;
    } else {
      items.push(item);
    }
    next[section] = items;
    return next;
  }

  function removeItem(content, section, id) {
    const next = clone(content);
    next[section] = (next[section] || []).filter((entry) => entry.id !== id);
    return next;
  }

  function getSectionConfig(section) {
    return SECTION_DEFS[section];
  }

  function getSectionItems(content, section) {
    return content[section] || [];
  }

  function getSectionLabel(section) {
    return SECTION_DEFS[section]?.label || section;
  }

  window.ResearchPortalContent = {
    STORAGE_KEY,
    SECTION_DEFS,
    DEFAULT_CONTENT,
    createEmptyItem,
    getDefaultContent,
    loadContent,
    saveContent,
    upsertItem,
    removeItem,
    getSectionConfig,
    getSectionItems,
    getSectionLabel,
  };
})();
