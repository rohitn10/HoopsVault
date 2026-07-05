const STORAGE_KEYS = {
  users: 'hoopsvault-users',
  listings: 'hoopsvault-listings',
  messages: 'hoopsvault-messages',
  currentUser: 'hoopsvault-current-user'
};

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

function updateAuthState() {
  const currentUser = getCurrentUser();
  const userBadge = document.getElementById('userBadge');
  const authLink = document.getElementById('authLink');
  if (!userBadge || !authLink) return;

  if (currentUser) {
    userBadge.textContent = `Hi, ${currentUser.name}`;
    authLink.textContent = 'Log out';
    authLink.href = '#';
    authLink.addEventListener('click', (event) => {
      event.preventDefault();
      localStorage.removeItem(STORAGE_KEYS.currentUser);
      window.location.reload();
    }, { once: true });
  } else {
    userBadge.textContent = '';
    authLink.textContent = 'Sign in';
    authLink.href = '/login';
  }
}

function renderHomeStats() {
  const listings = getStoredData(STORAGE_KEYS.listings);
  const users = getStoredData(STORAGE_KEYS.users);
  const messages = getStoredData(STORAGE_KEYS.messages);

  document.getElementById('listingCount').textContent = listings.length.toString();
  document.getElementById('sellerCount').textContent = users.length.toString();
  document.getElementById('messageCount').textContent = messages.length.toString();
}

function renderMarketplace() {
  const listings = getStoredData(STORAGE_KEYS.listings);
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

function handleLogin() {
  const signInForm = document.getElementById('signInForm');
  const registerForm = document.getElementById('registerForm');

  if (signInForm) {
    signInForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = signInForm.email.value.trim();
      const password = signInForm.password.value;
      const users = getStoredData(STORAGE_KEYS.users);
      const user = users.find((entry) => entry.email === email && entry.password === password);

      if (!user) {
        showFormMessage('signInMessage', 'Unable to sign in. Please check your email and password and try again.', 'error');
        return;
      }

      setCurrentUser(user);
      window.location.href = '/';
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = registerForm.name.value.trim();
      const email = registerForm.email.value.trim();
      const password = registerForm.password.value;
      const users = getStoredData(STORAGE_KEYS.users);

      if (users.some((entry) => entry.email === email)) {
        showFormMessage('registerMessage', 'An account with that email already exists.', 'error');
        return;
      }

      const newUser = { id: Date.now(), name, email, password, role: 'seller' };
      users.push(newUser);
      saveStoredData(STORAGE_KEYS.users, users);
      setCurrentUser(newUser);
      window.location.href = '/';
    });
  }
}

function showFormMessage(elementId, message, type) {
  const messageBox = document.getElementById(elementId);
  if (!messageBox) return;
  messageBox.className = `alert ${type}`;
  messageBox.textContent = message;
}

function handleListingCreation() {
  const form = document.getElementById('listingForm');
  if (!form) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = '/login';
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const listings = getStoredData(STORAGE_KEYS.listings);
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
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      description: form.description.value.trim(),
      createdAt: new Date().toISOString()
    };

    listings.unshift(newListing);
    saveStoredData(STORAGE_KEYS.listings, listings);
    showFormMessage('listingMessage', 'Listing published and added to the marketplace.', 'success');
    form.reset();
  });
}

function renderListingDetail() {
  const detailContainer = document.getElementById('listingDetail');
  const messageForm = document.getElementById('messageForm');
  if (!detailContainer) return;

  const params = new URLSearchParams(window.location.search);
  const listingId = params.get('id');
  const listings = getStoredData(STORAGE_KEYS.listings);
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
        <span>Listed by ${listing.sellerName}</span>
      </div>
    </div>
  `;

  if (messageForm) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      messageForm.innerHTML = '<p class="helper-text">Sign in to start a conversation with the seller.</p><a class="button small primary" href="/login">Sign in</a>';
      return;
    }

    messageForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const messages = getStoredData(STORAGE_KEYS.messages);
      const newMessage = {
        id: `message-${Date.now()}`,
        listingId: listing.id,
        senderId: currentUser.id,
        senderName: currentUser.name,
        receiverId: listing.sellerId,
        receiverName: listing.sellerName,
        text: messageForm.message.value.trim(),
        createdAt: new Date().toISOString()
      };
      messages.unshift(newMessage);
      saveStoredData(STORAGE_KEYS.messages, messages);
      showFormMessage('messageStatus', 'Message sent to the seller.', 'success');
      messageForm.reset();
    });
  }
}

function renderMessages() {
  const currentUser = getCurrentUser();
  const container = document.getElementById('messagesList');
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = '<div class="empty-state"><h3>Sign in to view messages</h3><p>Use your collector account to track conversations.</p></div>';
    return;
  }

  const messages = getStoredData(STORAGE_KEYS.messages).filter((message) => message.senderId === currentUser.id || message.receiverId === currentUser.id);
  if (!messages.length) {
    container.innerHTML = '<div class="empty-state"><h3>No messages yet</h3><p>Once a buyer or seller starts a conversation, it will appear here.</p></div>';
    return;
  }

  container.innerHTML = `
    <div class="message-list">
      ${messages.map((message) => `
        <div class="message-item">
          <strong>${message.senderName} → ${message.receiverName}</strong>
          <p>${message.text}</p>
          <span class="helper-text">${new Date(message.createdAt).toLocaleString()}</span>
        </div>
      `).join('')}
    </div>
  `;
}

ensureSeedData();
updateAuthState();

if (document.body.dataset.page === 'home') {
  renderHomeStats();
}

if (document.body.dataset.page === 'marketplace') {
  renderMarketplace();
}

if (document.body.dataset.page === 'login') {
  handleLogin();
}

if (document.body.dataset.page === 'create-listing') {
  handleListingCreation();
}

if (document.body.dataset.page === 'listing') {
  renderListingDetail();
}

if (document.body.dataset.page === 'messages') {
  renderMessages();
}
