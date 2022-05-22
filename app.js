const BASE_URL = 'https://ptf-web-dizajn-2022.azurewebsites.net';

const stringToNode = (data) => new DOMParser().parseFromString(data, 'text/html').body.childNodes[0];

class BaseRequest {
  static settings = {
    baseUrl: BASE_URL,
    defaultHeaders: {
      'content-type': 'application/json; charset=utf-8'
    }
  }

  static async base(method, url, data = null, headers = {}) {
    return await fetch(
      `${BaseRequest.settings.baseUrl}${url}`,
      {
        method: method,
        body: data ? JSON.stringify(data) : null,
        headers: new Headers({
          ...BaseRequest.settings.defaultHeaders,
          ...headers
        })
      }
    )
      .then(res => {
        if (res?.status == 200) return res.json();
        return res;
      });
  }

  static async get(url) { return BaseRequest.base('GET', url); }
  static async post(url, data) { return BaseRequest.base('POST', url, data) }
  static async put(url, data) { return BaseRequest.base('PUT', url, data) }
  static async delete(url) { return BaseRequest.base('DELETE', url) }
}

class BookApis {
  static async list() { return BaseRequest.get('/books'); }
  static async update(data) { return BaseRequest.put(`/books`, data); }
  static async create(data) { return BaseRequest.post(`/books`, data); }
  static async delete(id) { return BaseRequest.delete(`/books/${id}`); }
}

class AuthorApis {
  static async list() { return BaseRequest.get('/authors'); }
  static async create(data) { return BaseRequest.post(`/authors`, data); }
}


const BOOKS = {
  init: () => {
    BOOKS.root = document.getElementById('books');
    BOOKS.controller.list()
      .then(async books => {
        BOOKS.data = await books.map(book => new Card(book));
        await BOOKS.render();
      })
  },
  data: [],
  root: null,
  controller: BookApis,
  render: () => {
    BOOKS.root.innerHTML = '';
    BOOKS?.data.forEach((book, index) => BOOKS.root.innerHTML += book.render(true, index / 10));
    BOOKS?.data.forEach(book => book.initEvents());
  },
  addBook: (book) => {
    let card = new Card(book)

    let exists = BOOKS.data.find(bk => bk.id == book?.id);
    if(exists) BOOKS.data.map(bk => {
      if(bk.id == book?.id) return book;
      return bk;
    })
    else BOOKS.data.push(card);
    BOOKS.root.appendChild(stringToNode(card.render(true, 0)));
    card.initEvents();
  }
}

class Card {
  id = undefined;
  author = undefined;
  image = undefined;
  name = undefined;
  genre = undefined;
  root = undefined;

  constructor(data) {
    for (let key in data) this[key] = data[key];
  }

  initEvents() {
    if (!this.root) this.root = document.getElementById(this.id);

    this.root.addEventListener('click', () => {
      if (this.root.classList.contains('selected')) {
        this.root.classList.remove('selected');
        this.root.classList.add('collapsing');
      }
      else {
        BOOKS?.data?.filter(bk => bk?.id != this.id)?.forEach(bk => {
          if (bk.root) {
            if (bk.root.classList.contains('selected')) {
              bk.root.classList.remove('selected');
              bk.root.classList.add('collapsing');
            }
          }
        });

        this.root.classList.add('selected');
      }
    });

    this.root.addEventListener('animationend', () => {
      if (this.root.classList.contains('collapsing'))
        this.root.classList.remove('collapsing');

      if (this.root.classList.contains('slide-right')) {
        this.root.classList.remove('slide-right');
        this.root.style = undefined;
      }
    });

    this.root.querySelector('#delete-book-button').addEventListener('click', (event) => {
      event.stopPropagation();
      deleteBookModalRender(this);
    });
    this.root.querySelector('#edit-book-button').addEventListener('click', (event) => {
      event.stopPropagation();
      editBookModalRender(this);
    });
  }

  remove() {
    this.root.remove();
  }

  render(slide = false, delay = 0.1) {
    return `
      <div class="card ${slide ? 'slide-right' : ''}" id="${this.id}" style="animation-delay: ${delay}s;">
        <div class="image-section">
          <img src="${this.image}" alt="...image"/>
        </div>
        <div class="info-section">
          <h4 class="name">${this.name}</h4>
          <h5 class="author" id=${this.author?.id}>${this.author?.name}</h5>
          <div class="genres">
            <span>${this.genre}</span>
          </div>
        </div>
        <div class="actions-section">
          <button class="button small" id="edit-book-button">edit</button>
          <button class="button small" id="delete-book-button">delete</button>
        </div>
      </div>`
  }
}


const deleteBookModalRender = async (book) => {
  await document.body.append(await stringToNode(
    `<div class="modal-wrapper visible" id="modal-delete-book">
      <div class="modal">
        <div class="modal-header">
          Delete Book
        </div>
        <div class="modal-body">
          Are you sure you want to delete "${book?.name}"?
        </div>
        <div class="modal-footer">
          <button class="button" id="button-modal-cancel">Cancel</button>
          <button class="button" id="button-modal-confirm">Confirm</button>
        </div>
      </div>
      <div class="modal-background"></div>
    </div>`
  ));

  let root = document.getElementById('modal-delete-book');

  root.querySelector('#button-modal-cancel').addEventListener('click', () => { root.remove() });
  root.querySelector('#button-modal-confirm').addEventListener('click', async () => {
    root.querySelector('#button-modal-confirm').innerText = '';
    root.querySelector('#button-modal-confirm').append(stringToNode(`<div class="spinner"></div>`));

    try {
      await BookApis.delete(book?.id);
      BOOKS?.data?.find(bk => bk?.id == book?.id).remove();
      BOOKS.data = BOOKS?.data?.filter(bk => bk?.id != book?.id);
      root.remove();
    }
    catch (err) {
      root.querySelector('#button-modal-confirm').innerText = 'Confirm';
      root.querySelector('#button-modal-confirm .spinner')?.remove();
    }
  });
}

const createBookModalRender = async () => {
  await document.body.append(await stringToNode(
    `<div class="modal-wrapper visible" id="modal-create-book">
      <div class="modal">
        <div class="modal-header">
          New Book
        </div>
        <div class="modal-body">
          <div class="input-field">
            <h4>Book name</h4>
            <input name="name" class="text-input"/>
            <p class="error-message"></p>
          </div>
          <div class="input-field">
            <div class="row">
              <div class="input">
                <h4>Book image</h4>
                <input name="image" id="image-perview-input" class="text-input"/>
              </div>
              <img class="image-perview" id="image-perview" src="#" alt=""/>
            </div>
            <p class="error-message"></p>
          </div>
          <div class="input-field">
            <h4>Book genre</h4>
            <input name="genre" class="text-input"/>
            <p class="error-message"></p>
          </div>
          <div class="input-field">
            <h4>Book Author</h4>
            <input name="author" class="text-input"/>
            <p class="error-message"></p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="button" id="button-modal-cancel">Cancel</button>
          <button class="button" id="button-modal-create">Create</button>
        </div>
      </div>
      <div class="modal-background"></div>
    </div>`
  ));

  let root = document.getElementById('modal-create-book');

  root.querySelector('#image-perview-input').addEventListener('change', () => {
    let img = root.querySelector('#image-perview');
    let value = root.querySelector('#image-perview-input').value;
    img.setAttribute('src', value);
  });

  root.querySelector('#button-modal-cancel').addEventListener('click', () => { root.remove() });
  root.querySelector('#button-modal-create').addEventListener('click', async () => {
    let data = {};

    let inputFields = root.querySelectorAll('.input-field');

    let valid = true;
    for (let i = 0; i < inputFields.length; i++) {
      let inputField = inputFields[i];

      let value = inputField.querySelector('input').value;
      let key = inputField.querySelector('input').getAttribute('name');

      if (!value || value.length == '') {
        inputField.querySelector('.error-message').innerText = 'This field is required!';
        valid = false;
      }

      data[key] = value;
    }
    if (!valid) return;

    let authors = await AuthorApis.list();

    let author = await authors.find(ath => ath.name == data.author);
    if (!author) {
      await AuthorApis.create({ name: data.author });
      authors = await AuthorApis.list();
      author = authors.find(ath => ath.name == data.author);
    }
    delete data.author;
    data['authorId'] = author?.id;


    await BookApis.create(data);
    let bookList = await BookApis.list();
    for (let i = 0; i < bookList.length; i++) {
      let exists = false;
      for (let q = 0; q < BOOKS.data.length; q++) {
        if (bookList[i]?.id == BOOKS.data[q]?.id) {
          exists = true;
          break;
        }
      }

      if (exists) continue;

      BOOKS.addBook(bookList[i]);
      root.remove();
      return;
    }
  });
}

const editBookModalRender = async (book) => {
  await document.body.append(await stringToNode(
    `<div class="modal-wrapper visible" id="modal-edit-book">
      <div class="modal">
        <div class="modal-header">
          Edit Book
        </div>
        <div class="modal-body">
          <div class="input-field">
            <h4>Book name</h4>
            <input value="${book?.name}" name="name" class="text-input"/>
            <p class="error-message"></p>
          </div>
          <div class="input-field">
            <div class="row">
              <div class="input">
                <h4>Book image</h4>
                <input value="${book?.image}" name="image" id="image-perview-input" class="text-input"/>
              </div>
              <img class="image-perview" id="image-perview" src="${book?.image}" alt=""/>
            </div>
            <p class="error-message"></p>
          </div>
          <div class="input-field">
            <h4>Book genre</h4>
            <input value="${book?.genre}" name="genre" class="text-input"/>
            <p class="error-message"></p>
          </div>
          <div class="input-field">
            <h4>Book Author</h4>
            <input value="${book?.author?.name}" name="author" class="text-input"/>
            <p class="error-message"></p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="button" id="button-modal-cancel">Cancel</button>
          <button class="button" id="button-modal-update">Update</button>
        </div>
      </div>
      <div class="modal-background"></div>
    </div>`
  ));

  let root = document.getElementById('modal-edit-book');

  root.querySelector('#image-perview-input').addEventListener('change', () => {
    let img = root.querySelector('#image-perview');
    let value = root.querySelector('#image-perview-input').value;
    img.setAttribute('src', value);
  });

  root.querySelector('#button-modal-cancel').addEventListener('click', () => { root.remove() });
  root.querySelector('#button-modal-update').addEventListener('click', async () => {
    let data = {
      bookId: book?.id
    };
    let inputFields = root.querySelectorAll('.input-field');

    let valid = true;
    for (let i = 0; i < inputFields.length; i++) {
      let inputField = inputFields[i];

      let value = inputField.querySelector('input').value;
      let key = inputField.querySelector('input').getAttribute('name');

      if (!value || value.length == '') {
        inputField.querySelector('.error-message').innerText = 'This field is required!';
        valid = false;
      }

      data[key] = value;
    }
    if (!valid) return;

    let authors = await AuthorApis.list();

    let author = await authors.find(ath => ath.name == data.author);
    if (!author) {
      await AuthorApis.create({ name: data.author });
      authors = await AuthorApis.list();
      author = authors.find(ath => ath.name == data.author);
    }
    delete data.author;
    data.authorId = author?.id;

    await BookApis.update(data);
    await book.remove();

    BOOKS.addBook({
      ...{
        id: book?.id,
        author: author,
        image: book?.image, 
        name: book?.name,
        genre: book?.genre
      },
      id: data?.bookId,
      image: data?.image,
      name: data?.name,
      genre: data?.genre
    });
    root.remove();
  });
}

let modalData = {}
const toggleModal = (modalId) => {
  let modal = document.getElementById(modalId);
  if (modal.classList.contains('visible'))
    modal.classList.remove('visible')
  else
    modal.classList.add('visible')
}

window.onload = () => {
  BOOKS?.init();
}