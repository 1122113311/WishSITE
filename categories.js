(() => {
  const categories = {
    sleep: { title: 'Сон и уют', icon: '🛏️', description: 'Всё, что поможет устроить уютное место для отдыха.', products: [] },
    clothes: { title: 'Одежда', icon: '👕', description: 'Мягкие и удобные вещи для первых прогулок и дома.', products: [] },
    bathing: { title: 'Купание и уход', icon: '🛁', description: 'Небольшие полезности для ежедневной заботы.', products: [] },
    walks: { title: 'Прогулки', icon: '🚼', description: 'Вещи для поездок, прогулок и путешествий втроём.', products: [] },
    play: { title: 'Игры и развитие', icon: '🧸', description: 'Первые игрушки и идеи для весёлого знакомства с миром.', products: [] },
    other: { title: 'Разное', icon: '✨', description: 'То, чему пока не нашлось отдельной гоночной трассы.', products: [] }
  };

  const productMarkup = (products) => {
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
        price.textContent = product.price;
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
      list.append(item);
    });
    return list;
  };

  const mobile = window.matchMedia('(max-width: 700px)');
  document.querySelectorAll('.category-card[data-category]').forEach((card) => {
    card.addEventListener('click', () => {
      const key = card.dataset.category;
      if (mobile.matches) {
        window.location.href = `category.html?category=${encodeURIComponent(key)}&v=cloud-catalog-9494789`;
        return;
      }
      const category = categories[key];
      const dialog = document.querySelector('.product-dialog');
      if (!category || !dialog) return;
      dialog.querySelector('#dialog-title').textContent = category.title;
      dialog.querySelector('.dialog-icon').textContent = category.icon;
      dialog.querySelector('.dialog-description').textContent = category.description;
      const list = dialog.querySelector('.product-list');
      list.replaceChildren(productMarkup(category.products));
      dialog.showModal();
    });
  });

  const dialog = document.querySelector('.product-dialog');
  if (dialog) {
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  if (document.body.classList.contains('category-page')) {
    const key = new URLSearchParams(window.location.search).get('category');
    const category = categories[key];
    if (!category) {
      window.location.replace('wishes.html?v=cloud-catalog-9494789');
      return;
    }
    document.title = `${category.title} — список для Саши`;
    document.querySelector('.mobile-category-icon').textContent = category.icon;
    document.querySelector('.mobile-category-heading h1').textContent = category.title;
    document.querySelector('.mobile-category-description').textContent = category.description;
    document.querySelector('.mobile-category-card .product-list').append(productMarkup(category.products));
  }
})();

