const STORAGE_KEYS = {
  users: 'hoopsvault-users',
  listings: 'hoopsvault-listings',
  messages: 'hoopsvault-messages',
  currentUser: 'hoopsvault-current-user'
};

const supabaseConfig = window.__SUPABASE_CONFIG__ || {};
const supabaseClient = supabaseConfig.url && supabaseConfig.publishable_key && window.supabase
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.publishable_key)
  : null;

let currentMode = 'local';

async function initSupabase() {
  if (!supabaseClient) return;
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      currentMode = 'supabase';
      console.info('Supabase auth is ready.');
    }
  } catch (error) {
    console.warn('Supabase unavailable, falling back to local mode.', error);
  }
}

function getStoredData(key) {
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function saveStoredData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getCurrentUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.currentUser);
  return raw ? JSON.parse(raw) : null;
}

async function syncSupabaseSession() {
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user) {
    currentMode = 'supabase';
    const user = {
      id: session.user.id,
      name: session.user.user_metadata?.full_name || session.user.email || 'Collector',
      email: session.user.email,
      role: 'seller'
    };
    setCurrentUser(user);
  }
}

function setCurrentUser(user) {
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
}

function ensureSeedData() {
  if (!getStoredData(STORAGE_KEYS.users).length) {
    saveStoredData(STORAGE_KEYS.users, [
      { id: 1, name: 'Ava', email: 'ava@hoopsvault.test', password: 'password123', role: 'seller' },
      { id: 2, name: 'Marcus', email: 'marcus@hoopsvault.test', password: 'password123', role: 'buyer' }
    ]);
  }

  if (!getStoredData(STORAGE_KEYS.listings).length) {
    saveStoredData(STORAGE_KEYS.listings, [
      {
        id: 'listing-1',
        title: 'LeBron James 2003 Topps Chrome',
        player: 'LeBron James',
        set: 'Topps Chrome',
        category: 'Vintage',
        grade: 'PSA 9',
        condition: 'Near Mint',
        price: 2850,
        platform: 'eBay',
        sellerId: 1,
        sellerName: 'Ava',
        description: 'Sharp corners and a premium glossy finish that stands out in any collection.',
        createdAt: '2026-07-01'
      },
      {
        id: 'listing-2',
        title: 'Kobe Bryant 1996 Flair',
        player: 'Kobe Bryant',
        set: 'Flair',
        category: 'Modern',
        grade: 'CGC 8.5',
        condition: 'Excellent',
        price: 1120,
        platform: 'Facebook Marketplace',
        sellerId: 1,
        sellerName: 'Ava',
        description: 'Classic vintage look with a clean surface and strong print quality.',
        createdAt: '2026-07-02'
      },
      {
        id: 'listing-3',
        title: 'Giannis Antetokounmpo 2013 Prizm',
        player: 'Giannis Antetokounmpo',
        set: 'Prizm',
        category: 'Collectors',
        grade: 'PSA 8',
        condition: 'Very Good',
        price: 640,
        platform: 'eBay',
        sellerId: 2,
        sellerName: 'Marcus',
        description: 'A popular modern card that pairs well with a young star collection.',
        createdAt: '2026-07-03'
      }
    ]);
  }

  if (!getStoredData(STORAGE_KEYS.messages).length) {
    saveStoredData(STORAGE_KEYS.messages, [
      {
        id: 'message-1',
        listingId: 'listing-1',
        senderId: 2,
        senderName: 'Marcus',
        receiverId: 1,
        receiverName: 'Ava',
        text: 'Is this still available for pickup this week?',
        createdAt: '2026-07-03T09:00:00Z'
      }
    ]);
  }
}

function formatPrice(value) {
  return `$${Number(value).toLocaleString()}`;
}

async function getListingsData() {
  if (supabaseClient) {
    const { data, error } = await supabaseClient.from('listings').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      return data;
    }
    console.warn('Supabase listings query failed, using local fallback.', error);
  }
  return getStoredData(STORAGE_KEYS.listings);
}

async function saveListingData(listing) {
  if (supabaseClient && currentMode === 'supabase') {
    const { data, error } = await supabaseClient.from('listings').insert([listing]).select().single();
    if (!error && data) {
      return data;
    }
    console.warn('Supabase listing insert failed, using local fallback.', error);
  }

  const listings = getStoredData(STORAGE_KEYS.listings);
  listings.unshift(listing);
  saveStoredData(STORAGE_KEYS.listings, listings);
  return listing;
}

async function getMessagesData(userId) {
  if (supabaseClient && currentMode === 'supabase') {
    const { data, error } = await supabaseClient
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data;
    }
    console.warn('Supabase messages query failed, using local fallback.', error);
  }

  return getStoredData(STORAGE_KEYS.messages).filter((message) => message.senderId === userId || message.receiverId === userId);
}

async function saveMessageData(message) {
  if (supabaseClient && currentMode === 'supabase') {
    const { data, error } = await supabaseClient.from('messages').insert([message]).select().single();
    if (!error && data) {
      return data;
    }
    console.warn('Supabase message insert failed, using local fallback.', error);
  }

  const messages = getStoredData(STORAGE_KEYS.messages);
  messages.unshift(message);
  saveStoredData(STORAGE_KEYS.messages, messages);
  return message;
}

async function updateAuthState() {
  const currentUser = getCurrentUser();
  const userBadge = document.getElementById('userBadge');
  const authLink = document.getElementById('authLink');
  const loginLink = document.getElementById('loginLink');
  const signupLink = document.getElementById('signupLink');
  if (!userBadge || !authLink) return;

  if (currentUser) {
    userBadge.textContent = `Hi, ${currentUser.name}`;
    authLink.textContent = 'Log out';
    authLink.href = '#';
    authLink.style.display = 'inline-flex';
    if (loginLink) loginLink.style.display = 'none';
    if (signupLink) signupLink.style.display = 'none';
    authLink.addEventListener('click', async (event) => {
      event.preventDefault();
      if (supabaseClient && currentMode === 'supabase') {
        await supabaseClient.auth.signOut();
      }
      localStorage.removeItem(STORAGE_KEYS.currentUser);
      window.location.reload();
    }, { once: true });
  } else {
    userBadge.textContent = '';
    authLink.style.display = 'none';
    if (loginLink) loginLink.style.display = 'inline-flex';
    if (signupLink) signupLink.style.display = 'inline-flex';
  }
}

async function renderHomeStats() {
  const listings = await getListingsData();
  const users = getStoredData(STORAGE_KEYS.users);
  const messages = getStoredData(STORAGE_KEYS.messages);

  const listingCount = document.getElementById('listingCount');
  const sellerCount = document.getElementById('sellerCount');
  const messageCount = document.getElementById('messageCount');

  if (listingCount) listingCount.textContent = listings.length.toString();
  if (sellerCount) sellerCount.textContent = users.length.toString();
  if (messageCount) messageCount.textContent = messages.length.toString();
}

async function renderMarketplace() {
  const listings = await getListingsData();
  const cardGrid = document.getElementById('listingGrid');
  const filters = document.getElementById('filters');
  const searchInput = document.getElementById('searchInput');

  if (!cardGrid || !filters || !searchInput) return;

  const categories = ['All', ...new Set(listings.map((listing) => listing.category))];
  filters.innerHTML = categories
    .map((category) => `
      <button class="filter-btn ${category === 'All' ? 'active' : ''}" data-category="${category}">
        ${category}
      </button>
    `)
    .join('');

  function renderCards() {
    const query = searchInput.value.toLowerCase();
    const activeCategory = document.querySelector('.filter-btn.active')?.dataset.category || 'All';

    const visible = listings.filter((listing) => {
      const matchesCategory = activeCategory === 'All' || listing.category === activeCategory;
      const matchesQuery = `${listing.title} ${listing.player} ${listing.sellerName}`.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });

    if (!visible.length) {
      cardGrid.innerHTML = '<div class="empty-state"><h3>No matches yet</h3><p>Try another player or category.</p></div>';
      return;
    }

    cardGrid.innerHTML = visible
      .map(
        (listing) => `
          <article class="card">
            <div class="card-top">
              <div class="card-icon">🏀</div>
              <span class="badge">${listing.grade}</span>
            </div>
            <h3>${listing.title}</h3>
            <p>${listing.description}</p>
            <div class="card-meta">
              <span>${listing.category}</span>
              <span>${listing.condition}</span>
              <span>${listing.platform}</span>
            </div>
            <div class="price-row">
              <strong>${formatPrice(listing.price)}</strong>
              <a class="button small secondary" href="/listing?id=${listing.id}">View</a>
            </div>
          </article>
        `
      )
      .join('');
  }

  renderCards();
  filters.addEventListener('click', (event) => {
    const button = event.target.closest('.filter-btn');
    if (!button) return;
    document.querySelectorAll('.filter-btn').forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    renderCards();
  });
  searchInput.addEventListener('input', renderCards);
}

async function handleLogin() {
  const signInForm = document.getElementById('signInForm');
  const registerForm = document.getElementById('registerForm');

  if (signInForm) {
    signInForm.onsubmit = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const email = signInForm.elements.email.value.trim();
      const password = signInForm.elements.password.value;

      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
          if (!error && data.user) {
            currentMode = 'supabase';
            setCurrentUser({
              id: data.user.id,
              name: data.user.user_metadata?.full_name || data.user.email || 'Collector',
              email: data.user.email,
              role: 'seller'
            });
            window.location.href = '/';
            return;
          }

          showFormMessage('signInMessage', error?.message || 'Unable to sign in. Please try again.', 'error');
          return;
        } catch (error) {
          console.warn('Supabase sign-in unavailable', error);
        }
      }

      const users = getStoredData(STORAGE_KEYS.users);
      const user = users.find((entry) => entry.email === email && entry.password === password);
      if (!user) {
        showFormMessage('signInMessage', 'Unable to sign in. Please check your email and password and try again.', 'error');
        return;
      }
      setCurrentUser(user);
      window.location.href = '/';
    };
  }

  if (registerForm) {
    registerForm.onsubmit = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const name = registerForm.elements.name.value.trim();
      const email = registerForm.elements.email.value.trim();
      const password = registerForm.elements.password.value;
      const users = getStoredData(STORAGE_KEYS.users);

      if (users.some((entry) => entry.email === email)) {
        showFormMessage('registerMessage', 'An account with that email already exists.', 'error');
        return;
      }

      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } }
          });

          if (!error && data.user) {
            currentMode = 'supabase';
            const newUser = { id: data.user.id, name, email, role: 'seller' };
            users.push(newUser);
            saveStoredData(STORAGE_KEYS.users, users);
            setCurrentUser(newUser);
            window.location.assign('/');
            return;
          }

          showFormMessage('registerMessage', error?.message || 'Unable to create account.', 'error');
          return;
        } catch (error) {
          console.warn('Supabase sign-up unavailable', error);
        }
      }

      const newUser = { id: Date.now(), name, email, password, role: 'seller' };
      users.push(newUser);
      saveStoredData(STORAGE_KEYS.users, users);
      setCurrentUser(newUser);
      window.location.assign('/');
    };
  }
}

function showFormMessage(elementId, message, type) {
  const messageBox = document.getElementById(elementId);
  if (!messageBox) return;
  messageBox.className = `alert ${type}`;
  messageBox.textContent = message;
  messageBox.style.display = 'block';
}

function handleListingCreation() {
  const form = document.getElementById('listingForm');
  if (!form) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = '/login';
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const newListing = {
      id: `listing-${Date.now()}`,
      title: form.title.value.trim(),
      player: form.player.value.trim(),
      set: form.set.value.trim(),
      category: form.category.value,
      grade: form.grade.value,
      condition: form.condition.value,
      price: Number(form.price.value),
      platform: form.platform.value,
      seller_id: currentUser.id,
      seller_name: currentUser.name,
      description: form.description.value.trim(),
      created_at: new Date().toISOString()
    };

    await saveListingData(newListing);
    showFormMessage('listingMessage', 'Listing published and added to the marketplace.', 'success');
    form.reset();
  });
}

async function renderListingDetail() {
  const detailContainer = document.getElementById('listingDetail');
  const messageForm = document.getElementById('messageForm');
  if (!detailContainer) return;

  const params = new URLSearchParams(window.location.search);
  const listingId = params.get('id');
  const listings = await getListingsData();
  const listing = listings.find((item) => item.id === listingId);

  if (!listing) {
    detailContainer.innerHTML = '<div class="empty-state"><h3>Listing not found</h3><p>That card listing does not exist yet.</p></div>';
    return;
  }

  detailContainer.innerHTML = `
    <div class="detail-card">
      <p class="eyebrow">${listing.platform}</p>
      <h2>${listing.title}</h2>
      <p>${listing.description}</p>
      <div class="card-meta">
        <span>${listing.player}</span>
        <span>${listing.set}</span>
        <span>${listing.category}</span>
        <span>${listing.grade}</span>
        <span>${listing.condition}</span>
      </div>
      <div class="price-row">
        <strong>${formatPrice(listing.price)}</strong>
        <span>Listed by ${listing.seller_name || listing.sellerName}</span>
      </div>
    </div>
  `;

  if (messageForm) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      messageForm.innerHTML = '<p class="helper-text">Sign in to start a conversation with the seller.</p><a class="button small primary" href="/login">Sign in</a>';
      return;
    }

    messageForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const newMessage = {
        id: `message-${Date.now()}`,
        listing_id: listing.id,
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        receiver_id: listing.seller_id || listing.sellerId,
        receiver_name: listing.seller_name || listing.sellerName,
        text: messageForm.message.value.trim(),
        created_at: new Date().toISOString()
      };
      await saveMessageData(newMessage);
      showFormMessage('messageStatus', 'Message sent to the seller.', 'success');
      messageForm.reset();
    });
  }
}

async function renderMessages() {
  const currentUser = getCurrentUser();
  const container = document.getElementById('messagesList');
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = '<div class="empty-state"><h3>Sign in to view messages</h3><p>Use your collector account to track conversations.</p></div>';
    return;
  }

  const messages = await getMessagesData(currentUser.id);
  if (!messages.length) {
    container.innerHTML = '<div class="empty-state"><h3>No messages yet</h3><p>Once a buyer or seller starts a conversation, it will appear here.</p></div>';
    return;
  }

  container.innerHTML = `
    <div class="message-list">
      ${messages.map((message) => `
        <div class="message-item">
          <strong>${message.sender_name || message.senderName} → ${message.receiver_name || message.receiverName}</strong>
          <p>${message.text}</p>
          <span class="helper-text">${new Date(message.created_at || message.createdAt).toLocaleString()}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function initMobileMenu() {
  const header = document.querySelector('.topbar');
  if (!header || header.querySelector('.nav-toggle')) return;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-toggle';
  toggle.setAttribute('aria-label', 'Toggle navigation menu');
  toggle.innerHTML = '<span></span><span></span><span></span>';

  const mobileMenu = document.createElement('div');
  mobileMenu.className = 'mobile-menu';

  const linkWrapper = document.createElement('div');
  linkWrapper.className = 'mobile-menu-links';
  const actionWrapper = document.createElement('div');
  actionWrapper.className = 'mobile-menu-actions';

  const navLinks = header.querySelector('.nav-links');
  const navActions = header.querySelector('.nav-actions');

  if (navLinks) {
    linkWrapper.appendChild(navLinks.cloneNode(true));
  }
  if (navActions) {
    actionWrapper.appendChild(navActions.cloneNode(true));
  }

  mobileMenu.appendChild(linkWrapper);
  mobileMenu.appendChild(actionWrapper);
  header.appendChild(toggle);
  header.appendChild(mobileMenu);

  toggle.addEventListener('click', () => {
    const open = header.classList.toggle('mobile-menu-open');
    toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  });
}

function initializePageHandlers() {
  if (document.body.dataset.page === 'home') {
    void renderHomeStats();
  }

  if (document.body.dataset.page === 'marketplace') {
    void renderMarketplace();
  }

  if (document.body.dataset.page === 'login') {
    void handleLogin();
  }

  if (document.body.dataset.page === 'signup') {
    void handleLogin();
  }

  if (document.body.dataset.page === 'create-listing') {
    handleListingCreation();
  }

  if (document.body.dataset.page === 'listing') {
    void renderListingDetail();
  }

  if (document.body.dataset.page === 'messages') {
    void renderMessages();
  }
}

function initializeApp() {
  ensureSeedData();
  initSupabase();
  syncSupabaseSession();
  void updateAuthState();
  initMobileMenu();
  initializePageHandlers();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
