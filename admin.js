(() => {
  const owner = '1122113311';
  const repo = `${owner}/WishSITE`;
  const api = 'https://api.github.com';
  const labels = {
    sleep: 'Сон и уют', clothes: 'Одежда', bathing: 'Купание и уход',
    walks: 'Прогулки', play: 'Игры и развитие', other: 'Разное'
  };
  const loginForm = document.querySelector('#login-form');
  const tokenInput = document.querySelector('#github-token');
  const workspace = document.querySelector('#admin-workspace');
  const status = document.querySelector('#admin-status');
  const productForm = document.querySelector('#product-form');
  const productList = document.querySelector('#admin-product-list');
  let token = '';
  let fileSha = '';
  let catalog = {};
  let signedInLogin = '';

  const setStatus = (message, kind = '') => {
    status.textContent = message;
    status.className = `admin-status ${kind}`.trim();
  };

  const githubRequest = async (path, options = {}) => {
    const response = await fetch(`${api}${path}`, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `GitHub ответил с ошибкой ${response.status}.`);
    return data;
  };

  const decodeBase64 = (value) => {
    const binary = atob(value.replace(/\s/g, ''));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };

  const encodeBase64 = (value) => {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  };

  const loadCatalog = async () => {
    const file = await githubRequest(`/repos/${repo}/contents/products.json?ref=main`);
    fileSha = file.sha;
    catalog = JSON.parse(decodeBase64(file.content));
    Object.keys(labels).forEach((key) => {
      if (!Array.isArray(catalog[key])) catalog[key] = [];
    });
  };

  const renderProducts = () => {
    productList.replaceChildren();
    Object.entries(labels).forEach(([key, label]) => {
      const products = catalog[key] || [];
      const group = document.createElement('section');
      group.className = 'admin-product-group';
      const heading = document.createElement('h4');
      heading.textContent = `${label} · ${products.length}`;
      group.append(heading);
      if (!products.length) {
        const empty = document.createElement('p');
        empty.className = 'admin-empty';
        empty.textContent = 'Пока нет товаров';
        group.append(empty);
      }
      products.forEach((product) => {
        const card = document.createElement('article');
        card.className = 'admin-product-row';
        const details = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = product.name;
        details.append(name);
        if (product.price) {
          const price = document.createElement('span');
          price.className = 'admin-row-price';
          price.textContent = product.price;
          details.append(price);
        }
        if (product.description) {
          const description = document.createElement('p');
          description.textContent = product.description;
          details.append(description);
        }
        if (product.url) {
          const link = document.createElement('a');
          link.href = product.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'Ссылка на товар ↗';
          details.append(link);
        }
        const actions = document.createElement('div');
        actions.className = 'admin-row-actions';
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'admin-secondary-button';
        edit.textContent = 'Изменить';
        edit.addEventListener('click', () => beginEdit(key, product));
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'admin-delete-button';
        remove.textContent = 'Убрать';
        remove.addEventListener('click', () => {
          catalog[key] = catalog[key].filter((entry) => entry.id !== product.id);
          renderProducts();
          setStatus('Товар убран из черновика. Нажми «Сохранить на сайте», чтобы опубликовать изменение.', 'is-pending');
        });
        actions.append(edit, remove);
        card.append(details, actions);
        group.append(card);
      });
      productList.append(group);
    });
  };

  const beginEdit = (category, product) => {
    productForm.elements.id.value = product.id;
    productForm.elements.category.value = category;
    productForm.elements.name.value = product.name || '';
    productForm.elements.price.value = product.price || '';
    productForm.elements.url.value = product.url || '';
    productForm.elements.image.value = product.image || '';
    productForm.elements.description.value = product.description || '';
    document.querySelector('#form-title').textContent = 'Изменить товар';
    document.querySelector('#save-product-button').textContent = 'Сохранить правку';
    document.querySelector('#cancel-edit-button').hidden = false;
    productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resetEditor = () => {
    productForm.reset();
    productForm.elements.id.value = '';
    document.querySelector('#form-title').textContent = 'Добавить товар';
    document.querySelector('#save-product-button').textContent = 'Добавить товар';
    document.querySelector('#cancel-edit-button').hidden = true;
  };

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    token = tokenInput.value.trim();
    tokenInput.value = '';
    if (!token) return;
    loginForm.querySelector('button').disabled = true;
    setStatus('Проверяю доступ к репозиторию…');
    try {
      const user = await githubRequest('/user');
      if (user.login.toLowerCase() !== owner.toLowerCase()) {
        throw new Error(`Этот GitHub-токен принадлежит аккаунту ${user.login}, а панель закреплена за владельцем сайта.`);
      }
      signedInLogin = user.login;
      await loadCatalog();
      document.querySelector('#signed-in-as').textContent = `Вошли как ${signedInLogin}`;
      workspace.hidden = false;
      loginForm.hidden = true;
      renderProducts();
      setStatus('Доступ подтверждён. Добавляй товары и сохраняй изменения.', 'is-success');
    } catch (error) {
      token = '';
      setStatus(`${error.message} Проверь токен и его разрешения Contents: Read and write.`, 'is-error');
    } finally {
      loginForm.querySelector('button').disabled = false;
    }
  });

  productForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = productForm.elements;
    const oldId = form.id.value;
    const previousCategory = Object.keys(labels).find((key) => (catalog[key] || []).some((product) => product.id === oldId));
    const product = {
      id: oldId || (crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}`),
      name: form.name.value.trim(),
      price: form.price.value.trim(),
      url: form.url.value.trim(),
      image: form.image.value.trim(),
      description: form.description.value.trim()
    };
    if (previousCategory) catalog[previousCategory] = catalog[previousCategory].filter((item) => item.id !== oldId);
    const category = form.category.value;
    catalog[category] = catalog[category] || [];
    catalog[category].push(product);
    resetEditor();
    renderProducts();
    setStatus('Товар добавлен в черновик. Нажми «Сохранить на сайте», чтобы опубликовать.', 'is-pending');
  });

  document.querySelector('#cancel-edit-button').addEventListener('click', resetEditor);

  document.querySelector('#publish-button').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    setStatus('Сохраняю список в GitHub…');
    try {
      const result = await githubRequest(`/repos/${repo}/contents/products.json`, {
        method: 'PUT',
        body: JSON.stringify({
          message: 'Update baby wish list products',
          content: encodeBase64(`${JSON.stringify(catalog, null, 2)}\n`),
          sha: fileSha,
          branch: 'main'
        })
      });
      fileSha = result.content.sha;
      setStatus('Список сохранён. GitHub Pages опубликует изменения автоматически — обычно это занимает около минуты.', 'is-success');
    } catch (error) {
      setStatus(`${error.message} Черновик остался в этой вкладке, его можно сохранить повторно.`, 'is-error');
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector('#logout-button').addEventListener('click', () => {
    token = '';
    signedInLogin = '';
    fileSha = '';
    catalog = {};
    workspace.hidden = true;
    loginForm.hidden = false;
    resetEditor();
    setStatus('Вы вышли. Токен забыт.');
  });
})();

