(() => {
  const links = document.querySelectorAll('.action');
  links.forEach(link => link.addEventListener('click', e => {
    e.preventDefault();
    const topic = link.textContent.trim();
    const target = document.getElementById('topics');
    target.scrollIntoView({behavior:'smooth', block:'start'});
    window.dispatchEvent(new CustomEvent('housing-path-selected',{detail:{topic}}));
  }));
})();