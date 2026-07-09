const calendarDays = document.getElementById('calendarDays');
const calendarDetails = document.getElementById('calendarDetails');

const scheduleMap = {
  1: ['IRB 제출'],
  15: ['연구비 신청', '중간보고'],
  20: ['논문 검토'],
};

function renderCalendar() {
  const days = [];
  const leadingEmpty = 3;
  const totalDays = 31;

  for (let i = 0; i < leadingEmpty; i += 1) {
    days.push('<div></div>');
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const label = scheduleMap[day] ? '•' : '';
    days.push(`<button type="button" data-day="${day}">${day}<br /><small>${label}</small></button>`);
  }

  calendarDays.innerHTML = days.join('');

  calendarDays.querySelectorAll('button[data-day]').forEach((button) => {
    button.addEventListener('click', () => {
      calendarDays.querySelectorAll('button').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      const day = Number(button.dataset.day);
      const items = scheduleMap[day] || ['등록된 일정이 없습니다.'];
      calendarDetails.innerHTML = `
        <h3>${day}일 일정</h3>
        <ul>
          ${items.map((item) => `<li>${item}</li>`).join('')}
        </ul>
      `;
    });
  });
}

renderCalendar();
