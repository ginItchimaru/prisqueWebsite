import '../styles/modern-normalize.css';
import '../styles/general.css';
import '../styles/components/header.css';
import '../styles/components/hero.css';
import '../styles/components/events.css';
import '../styles/components/topics.css';
import '../styles/components/products.css';
import '../styles/components/flyer.css';
import '../styles/components/about.css';
import '../styles/components/contact.css';
import '../styles/components/footer.css';
import '../styles/components/mobile-nav.css';
import '../styles/utils.css';

import mobileNav from './utils/mobile-nav';
import darkMode from './utils/dark-mode';
import lazyLoading from './utils/lazy-loading';
import events from './utils/events';
import flyer from './utils/flyer';

mobileNav();
darkMode();
lazyLoading();
events();
flyer();
