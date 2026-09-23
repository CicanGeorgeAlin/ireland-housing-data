(() => {
  const links = document.querySelectorAll('.action');
  links.forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const topic = link.textContent.trim();
    const target = topic.toLowerCase() === 'rent'
      ? document.getElementById('rent-pathway')
      : document.getElementById('topics');
    if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
    window.dispatchEvent(new CustomEvent('housing-path-selected',{detail:{topic}}));
  }));
})();