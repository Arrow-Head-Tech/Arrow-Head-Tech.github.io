const express = require('express')
var cors = require('cors')
const fs = require("fs");
var bodyParser = require('body-parser');
const app = express();
const port = 3000;

app.use(cors());

// create application/json parser
var jsonParser = bodyParser.json();
 
// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

base_folder = "C:/DADOS/3.CURRENT_REPOSITORY/1.PROJETOS"

app.get('/', (req, res) => {
  res.status(200).send('Hello World!');
})

app.post('/readme', jsonParser, async (req,res) => {
  //  res.send('profile with id' + req.params.params)
  console.log('body', req.body);
  let path = "";
  if(req.body && req.body.path)
    path = req.body.path;
  console.log('path', path);
  try {
    console.log(`Reading ... ${base_folder}/${path}/README.md`);
		// const readData = fs.readFileSync(`${base_folder}/${path}/README.md`, 'utf8', (err,data) => {
		const readData = fs.readFileSync(`${base_folder}/${path}/INFO.md`, 'utf8', (err,data) => {
      if (err) throw new Error('Whoops!');
      console.log('data', data);
      // res.status(200).send(data);
    });
    console.log('readData', readData);
		if (readData) {
			res.status(200).send(readData);
		}
	} catch (error) {
    console.error("Error!");
    console.log(error);
		res.status(500).send(error);
	}
});

// app.use(express.static('public'));
app.use(express.static('.'));

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
})