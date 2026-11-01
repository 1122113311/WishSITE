(() => {
  const categories = {
    sleep: { title: 'Сон и уют', icon: '🛏️', description: 'Всё, что поможет устроить уютное место для отдыха.', products: [] },
    clothes: { title: 'Одежда', icon: '👕', description: 'Мягкие и удобные вещи для первых прогулок и дома.', products: [] },
    bathing: { title: 'Купание и уход', icon: '🛁', description: 'Небольшие полезности для ежедневной заботы.', products: [] },
    walks: { title: 'Прогулки', icon: '🚼', description: 'Вещи для поездок, прогулок и путешествий втроём.', products: [] },
    play: { title: 'Игры и развитие', icon: '🧸', description: 'Первые игрушки и идеи для весёлого знакомства с миром.', products: [] },
    other: { title: 'Разное', icon: '✨', description: 'То, чему пока не нашлось отдельной гоночной трассы.', products: [] }
  };

  const catalogReady = fetch('products.json?v=cloud-shape-2', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error('Не удалось загрузить список товаров.');
      return response.json();
    })
    .then((catalog) => {
      Object.keys(categories).forEach((key) => {
        categories[key].products = Array.isArray(catalog[key]) ? catalog[key] : [];
      });
    })
    .catch((error) => {
      console.warn(error.message);
    });

  const loadReservationState = async () => {
    if (!window.WishReservations?.isConfigured()) return { configured: false, reservations: [] };
    try {
      return { configured: true, reservations: await window.WishReservations.listPublic() };
    } catch (error) {
      console.warn('Не удалось загрузить бронирования:', error.message);
      return { configured: false, reservations: [], error: error.message };
    }
  };

  const productMarkup = (products, categoryKey, reservationState) => {
    if (!products.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-products';
      empty.textContent = 'Товары появятся здесь, когда мы добавим их в список 🏁';
      return empty;
    }
    const list = document.createElement('ul');
    list.className = 'products';
    products.forEach((product) => {
      const item = document.createElement('li');
      item.className = 'product-item';
      if (product.image) {
        const image = document.createElement('img');
        image.className = 'product-image';
        image.src = product.image;
        image.alt = '';
        image.loading = 'lazy';
        item.append(image);
      }
      const name = document.createElement('strong');
      name.textContent = product.name;
      item.append(name);
      if (product.description) {
        const description = document.createElement('p');
        description.textContent = product.description;
        item.append(description);
      }
      if (product.price) {
        const price = document.createElement('span');
        price.className = 'product-price';
        price.textContent = `Цена: ${product.price}`;
        item.append(price);
      }
      if (product.url) {
        const link = document.createElement('a');
        link.href = product.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Посмотреть товар';
        item.append(link);
      }
      const productId = String(product.id || '');
      const reserved = reservationState.reservations.some((entry) => entry.category === categoryKey && entry.product_id === productId);
      const actions = document.createElement('div');
      actions.className = 'product-actions';
      const reserve = document.createElement('button');
      reserve.type = 'button';
      reserve.className = 'reserve-button';
      reserve.textContent = reserved ? 'Забронировано' : 'Забронировать';
      reserve.disabled = reserved || !reservationState.configured || !productId;
      if (!reservationState.configured) reserve.title = 'Бронирование станет доступно после настройки';
      if (!productId) reserve.title = 'Для этого товара не задан идентификатор';
      const reserveStatus = document.createElement('span');
      reserveStatus.className = 'reserve-status';
      reserveStatus.setAttribute('role', 'status');
      reserve.addEventListener('click', async () => {
        reserve.disabled = true;
        reserve.textContent = 'Бронируем…';
        reserveStatus.textContent = '';
        try {
          const result = await window.WishReservations.reserve({ category: categoryKey, productId, productName: product.name });
          reserve.textContent = result.alreadyReserved ? 'Уже забронировано' : 'Забронировано';
          reserve.disabled = true;
        } catch (error) {
          reserve.disabled = false;
          reserve.textContent = 'Забронировать';
          reserveStatus.textContent = 'Не удалось забронировать. Попробуйте ещё раз.';
          console.warn(error.message);
        }
      });
      actions.append(reserve, reserveStatus);
      item.append(actions);
      list.append(item);
    });
    return list;
  };

  let activeCategoryKey = null;
  let reservationRefreshRunning = false;

  const renderActiveCategory = async () => {
    const category = categories[activeCategoryKey];
    if (!category) return;
    const dialog = document.querySelector('.product-dialog');
    const isMobileCategoryPage = document.body.classList.contains('category-page');
    if (!isMobileCategoryPage && !dialog?.open) return;
    const reservationState = await loadReservationState();
    const list = isMobileCategoryPage
      ? document.querySelector('.mobile-category-card .product-list')
      : dialog.querySelector('.product-list');
    list.replaceChildren(productMarkup(category.products, activeCategoryKey, reservationState));
  };

  const refreshActiveCategory = async () => {
    if (reservationRefreshRunning) return;
    reservationRefreshRunning = true;
    try {
      await renderActiveCategory();
    } finally {
      reservationRefreshRunning = false;
    }
  };

  const mobile = window.matchMedia('(max-width: 700px)');
  document.querySelectorAll('.category-card[data-category]').forEach((card) => {
    card.addEventListener('click', async () => {
      await catalogReady;
      const key = card.dataset.category;
      if (mobile.matches) {
        window.location.href = `category.html?category=${encodeURIComponent(key)}&v=cloud-catalog-9494789`;
        return;
      }
      const category = categories[key];
      const dialog = document.querySelector('.product-dialog');
      if (!category || !dialog) return;
      activeCategoryKey = key;
      dialog.querySelector('#dialog-title').textContent = category.title;
      dialog.querySelector('.dialog-icon').textContent = category.icon;
      dialog.querySelector('.dialog-description').textContent = category.description;
      dialog.showModal();
      await refreshActiveCategory();
    });
  });

  const dialog = document.querySelector('.product-dialog');
  if (dialog) {
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  window.addEventListener('focus', refreshActiveCategory);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshActiveCategory();
  });
  window.setInterval(() => {
    if (!document.hidden) refreshActiveCategory();
  }, 15000);

  if (document.body.classList.contains('category-page')) {
    const key = new URLSearchParams(window.location.search).get('category');
    const category = categories[key];
    if (!category) {
      window.location.replace('wishes.html?v=cloud-catalog-9494789');
      return;
    }
    catalogReady.then(() => {
      activeCategoryKey = key;
      document.title = `${category.title} — список для Саши`;
      document.querySelector('.mobile-category-icon').textContent = category.icon;
      document.querySelector('.mobile-category-heading h1').textContent = category.title;
      document.querySelector('.mobile-category-description').textContent = category.description;
      return refreshActiveCategory();
    });
  }
})();

