const mobileNav = () => {
  const hearderBtn = document.querySelector('.js-bars');
  const mobileNav = document.querySelector('.js-mobile-nav');
  const mobileLinks = document.querySelectorAll('.js-mobile-nav-link');

  let isMobileNavOpen = false;
  
  hearderBtn.addEventListener('click', () => {
    isMobileNavOpen = !isMobileNavOpen;
    if (isMobileNavOpen) {
      mobileNav.style.display = 'flex';
      document.body.style.overflowY = 'hidden';
    } else {
      mobileNav.style.display = 'none';
      document.body.style.overflowY = 'auto';
    }
  });

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      isMobileNavOpen = false;
      mobileNav.style.display = 'none';
      document.body.style.overflowY = 'auto';
    });
  });
};

export default mobileNav;