const express = require("express");
const webserver = express();
const path = require("path");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const fs = require("fs");
const os = require("os");
const validator = require("validator");
const port = 7880;
const logFN = path.resolve(__dirname, "../server.log");
const formsJSON = path.resolve(__dirname, "forms.json");

webserver.use(express.static(path.resolve(__dirname, "../front")));
webserver.use(express.json());
webserver.use(express.urlencoded({ extended: true }));
webserver.use(
  bodyParser.urlencoded({ extended: true })
); 
webserver.use(bodyParser.json());

webserver.post("/run", async (req, res) => {
  const data = req.body;

  const url = data.url;
  const method = data.method;
  const params = new URLSearchParams(Object.entries(data.params));
  const body = data.body;
  const titles = data.titles;
  const fullUrl =  !params.toString() ? url.trim() :`${url}?${params.toString()}`;
 
  try {
    if (
      !validator.isURL(fullUrl, { require_protocol: true })
    ) {
      return res.status(400).send("Невалидный URL");
    }

    if (params && typeof params !== "object") {
      return res.status(400).send("Параметры должны быть объектом");
    }

    if (body && typeof body !== "string") {
      return res.status(400).send("Тело запроса должно быть строкой");
    }

    if (titles && typeof titles !== "object") {
      return res.status(400).send("Заголовки должны быть объектом");
    }
  } catch (err) {
    console.error("Ошибка выполнения запроса", err);
    return res.status(500).send("Ошибка выполнения запроса");
  }

  try {
    const response = await fetch(url === "get" ? fullUrl : url, {
      method: method,
      headers: Object.keys(titles).length === 0 ? {} : titles,
      redirect: "manal",
      body: method === "get" ? null : body,
    });

       const headersArr = [...response.headers.entries()];
    const headersObj = headersArr.reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});

    let responseBody;
    
    if (headersObj["content-type"].startsWith("image/")) {
      const responseBodyData = await response.buffer();
      responseBody = responseBodyData.toString("base64");
    } else if (headersObj["content-type"] === "application/json") {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }
    
    const responseData = {
      status: response.status,
      headers: headersObj,
      body: responseBody,
    };

    return res.json(responseData);
   
  } catch (err) {
    console.error("Ошибка выполнения запроса", err);
    return res.status(500).send("Ошибка выполнения запроса");
  }
});

webserver.post("/save", (req, res) => {
  const newForm = req.body;

  if (!newForm || Object.keys(newForm).length === 0) {
    return res.status(400).send("Нет данных для сохранения");
  }

  let forms = [];

  const data = fs.readFileSync(formsJSON);
 
  if (data) {
    forms = JSON.parse(data);
  }
  forms.push(newForm);

  fs.writeFileSync(formsJSON, JSON.stringify(forms));
  res.status(200).send("Форма схранена"); 
});

webserver.get("/data", (req, res) => {
  const data = fs.readFileSync(formsJSON);
  if (!data || data.length === 0) {
    return res.json([]);
  }
  res.json(JSON.parse(data));  
});

webserver.get("/data/:index", (req, res) => {
  const index = req.params.index;

  const data = fs.readFileSync(formsJSON);
  const allForms = data ? JSON.parse(data) : [];

 if (index < 0 || index >= allForms.length) {
    return res.status(404).send("Форма не найдена");
  }

  res.json(allForms[index]);
});

webserver.get("/cleanData", (req, res) => {
  fs.writeFileSync(formsJSON, [JSON.stringify([])]);
  res.send('Файл очищен')
})

function logLineSync(logFilePath, logLine) {
  const logDT = new Date();
  let time = logDT.toLocaleDateString() + " " + logDT.toLocaleTimeString();
  let fullLogLine = time + " " + logLine;

  console.log(fullLogLine);

  const logFD = fs.openSync(logFilePath, "a+");
  fs.writeSync(logFD, fullLogLine + os.EOL);
  fs.closeSync(logFD);
}

webserver.listen(port, () => {
  logLineSync(logFN, `Webserver is running on port [${port}]`);
});
