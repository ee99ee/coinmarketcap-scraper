let request = require('request');
let cheerio = require('cheerio');
let async = require('async');
let currencies = [];
let data = [];

let json2csv = require('json2csv');
let fs = require('fs');
let csvFields = ['currency','date','open','chigh','low','close','volume','marketcap'];

let app = {
  run: function () {
    app.loadCurrencies();
  },

  // step 1: fetch currencies page
  loadCurrencies: function() {
    let data = {
      method: 'GET',
      url: 'https://coinmarketcap.com/all/views/all/'
    };

    request(data, app.parseCurrencies);
  },

  // step 2: parse that page to extract currency names and URLs
  parseCurrencies: function(err, response, body) {
    if (err) return console.error(err);

    let $ = cheerio.load(body);
    
    //$('table#currencies-all').find('tbody>tr').first().find('td.currency-name').text().trim()
    $('table#currencies-all').find('tbody>tr').each( (i, elm) => {

      let currency = {
        name: $(elm).find('td.currency-name').text().trim(),
        url: $(elm).find('td.currency-name>a').attr('href')
      }

      currencies.push(currency);
    });

    app.loadHistoricals()
  },

  loadHistoricals: function() {
    async.mapLimit(currencies, 12, (item, cb) => {
      let requestData = {
        method: 'GET',
        url: 'https://coinmarketcap.com' + item.url + 'historical-data/?start=20000101&end=20170706'
      };

      request(requestData, (err, response, body) => {
        app.parseHistorical(err, response, body);
        cb();
      });
    }, (err, results) => {
      app.writeCsv();
    });
  },

  // step 4: parse that page to extract currency names and URLs
  parseHistorical: (err, response, body) => {
    if (err) return console.error(err);

    let $ = cheerio.load(body);

    let currencyName = $('body > div.container > div > div.col-xs-12.col-sm-12.col-md-12.col-lg-10 > div:nth-child(5) > div.col-xs-6.col-sm-4.col-md-4 > h1').text().split('(')[0].trim()

    $('#historical-data > div > table > tbody > tr').each( (i, elm) => {
      let elmChildren = $(elm).children();

      let rowData = {
        currency: currencyName,
        date: $(elmChildren).eq(0).text(),
        open: $(elmChildren).eq(1).text(),
        high: $(elmChildren).eq(2).text(),
        low: $(elmChildren).eq(3).text(),
        close: $(elmChildren).eq(4).text(),
        volume: $(elmChildren).eq(5).text(),
        marketcap: $(elmChildren).eq(6).text(),
      }

      data.push(rowData);
    });

    console.log('Fetched and parsed currency: ' + currencyName);
  },

  writeCsv: () => {
    let csv = json2csv({ data: data, fields: csvFields });
 
    fs.writeFile('output.csv', csv, function(err) {
      if (err) throw err;
      console.log('Data saved to output.csv');
    });
  }
}

app.run();