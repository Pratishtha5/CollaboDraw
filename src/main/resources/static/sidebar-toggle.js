const sidebar = document.getElementById('sidebar');
const logo = sidebar.querySelector('.logo');

logo.style.cursor = 'pointer';
logo.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});
