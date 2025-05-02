"use strict";

const form = document.getElementById("form");
const paramsWrap = document.getElementById("add-params");
const bodyWrap = document.getElementById("add-body");
const titlesWrap = document.getElementById("add-titles");
const allResponse = document.getElementById("all-response");
const savedFormsContainer = document.getElementById("saved-forms-wrap");

document
  .getElementById("select-method")
  .addEventListener("change", function () {
    const selectedValue = this.value;

    switch (selectedValue) {
      case "get":
        paramsWrap.style.display = "block";
        bodyWrap.style.display = "none";
        break;
      case "post":
      case "patch":
      case "put":
      case "options":
        bodyWrap.style.display = "block";
        paramsWrap.style.display = "none";
        break;

      default:
        break;
    }
  });

function getNewParam() {
  const paramField = document.getElementById("add-params");

  const newParamWr = document.createElement("div");
  newParamWr.className = "param-wr";
  newParamWr.innerHTML = `
        <input type="text">
        <input type="text">
        <span class="delete-val" onclick="deleteValue(this)">Удалить<span/>
    `;
  paramField.insertBefore(newParamWr, paramField.lastChild);
}

function getNewTitle() {
  const titleField = document.getElementById("add-titles");

  const newTitleWr = document.createElement("div");
  newTitleWr.className = "title-wr";
  newTitleWr.innerHTML = `
        <input type="text">
        <input type="text">
        <span class="delete-val" onclick="deleteValue(this)">Удалить<span/>
    `;
  titleField.insertBefore(newTitleWr, titleField.lastChild);
}

function deleteValue(clickedSpan) {
  const divWr = clickedSpan.parentElement;
  divWr.remove();
}

form.addEventListener("submit", async function (eo) {
  eo.preventDefault();

  const URL = document.getElementById("URL").value;
  const method = document.getElementById("select-method").value;
  const body = document.getElementById("body").value;

  const paramsArray = Array.from(document.querySelectorAll(".param-wr"));
  const params = paramsArray.map((param) => {
    const inputs = Array.from(param.querySelectorAll("input"));
    const newArr = inputs.map((input) => input.value);
    return newArr;
  });
  const paramsObj = params.reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});

  const titlesArray = Array.from(document.querySelectorAll(".title-wr"));
  const titles = titlesArray.map((title) => {
    const inputs = Array.from(title.querySelectorAll("input"));
    const newArr = inputs.map((input) => input.value);
    return newArr;
  });
  const titlesObj = titles.reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});

 const request = {
    method: method,
    url: URL,
    params: paramsObj,
    body: body ? body : "",
    titles: titlesObj
  };

  const serverResponse = await fetch("/run", {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (serverResponse.ok) {

    const serverResponseData = await serverResponse.json();

    const status = serverResponseData.status;
    const headers = serverResponseData.headers;
    const body = serverResponseData.body;

    const bodyText =
      document.createTextNode(
        body
      ); 

    let headersStr = "";
    getheadersUl(headers);

    allResponse.innerHTML = `
      <p class="p-header">Ответ на запрос</p>
      Статус ответа: ${status};
      Заголовки ответа:
      ${headersStr}
      Тело ответа:
      <div id="body-response"></div>
    `;
    document.getElementById("body-response").appendChild(bodyText);

    function getheadersUl(header) {
      for (let k in header) {
        if (header.hasOwnProperty(k)) {
          headersStr += `<p>${k}: ${header[k]}<\p>`;
        }
      }
    }
  }
  if(!serverResponse.ok) {
    const errorData = await serverResponse.text();  
    errorData === 'Невалидный URL' ? document.getElementById('URL').value = 'Вы ввели невалидный URL' : ""
    
  }
});

function getCleanForm() {
  form.reset();
}

async function getSaveForm() {

  const formData = new FormData(form);

  const data = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });

  if(Object.keys(data).length === 0) {
    console.error('Нет данных для сохранения');
    return;
  }

  try {
    const response = await fetch("/save", {
      method: "post",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if(response.ok) {
    loadSavedForms();
    } else {console.error(response.statusText)}
  } catch (err) {
    console.error(err);
  }
}

async function loadSavedForms() {
  try{
    const response = await fetch('/data');
    const savedForms = await response.json();

    savedFormsContainer.innerHTML = '';

    savedForms.forEach( (formData, index) => {
      
      const container = document.createElement('div');
      container.className = 'saved-form-container';

      const radioBt = document.createElement('input');
      radioBt.type = 'radio';
      radioBt.name = 'reqForm'
      radioBt.value = index;
      radioBt.id = `form-${index}`;

      const label = document.createElement('label');
      label.htmlFor = `form-${index}`;
      label.textContent = `Метод: ${formData.method}
      URL ${formData.URL}`;

      container.appendChild(radioBt);
      container.appendChild(label);
      savedFormsContainer.appendChild(container);

    })
  } catch(err){
    console.error(err);
  }
}

async function getFillForm() {
  const checkedForm = savedFormsContainer.querySelector('input[type="radio"]:checked');
  if(!checkedForm) {
    alert('Пожалуйста, выберите данные для заполнения.');
    return;
  }
  const index = checkedForm.value;

  try {
    const response = await fetch (`/data/${index}`);
    const data = await response.json();

    for (let k in data) {
      if (form[k]) {
        form[k].value = data[k];
      }
    }
  } catch(err) {
    console.error(err);
  }

}

async function getCleanData() {
  savedFormsContainer.innerHTML = '';
  const response = fetch ('/cleanData');
}

loadSavedForms();