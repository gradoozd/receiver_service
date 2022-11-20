require('dotenv').config()

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
require('body-parser-xml')(bodyParser);
var convert = require('xml-js');
var fetch = require('node-fetch');
// var libxmljs = require('libxmljs')
// const fs = require('fs')

const Contract = require('./db').Contract

app.set('port', process.env.PORT)

app.use(bodyParser.urlencoded( { extended: true }))
app.use(bodyParser.xml({
    xmlParseOptions: {
      explicitArray: false
    },
}));

// Генерирует случайное значение messageId
const generateMessageId = (length) => {
    let result = [];
    const characters = '-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
    for( var i = 0; i < length; i++ ){
      result.push(characters.charAt(Math.floor(Math.random() * characters.length)));
    }
    return result.join('');
}

// function validateXML(xsd_path, data) {
//     let xsd = fs.readFileSync(xsd_path, 'utf8')
//     let xsdDoc = libxmljs.parseXml(xsd);
//     let xmlDocValid = libxmljs.parseXml(data);
//     let xmlResult = xmlDocValid.validate(xsdDoc)
//     if (xmlResult === false) {
//         res.status(400)
//         res.send('Wrong XML')
//     }
//     if (xmlResult === true) console.log('Its OK')
// }


// Запрос на открытие
app.post('/api/v1/open', (req, res, next) => {
    if (req.get('AuthorizationId') !== process.env.AUTHORIZATION) res.status(403).end()
    let data = req.body

    // Неудавшаяся валидация XSD
    // var options = {compact: true, ignoreComment: true, spaces: 4};
    // const body = convert.js2xml(data, options)
    // validateXML('./xsd_xml/open.xsd', body)

    let cdata = convert.xml2js(data.request.openRequest.data, {compact: true, spaces: 4});
    Contract.save(
        {messageId: data.request.header.messageId, correlationId: data.request.header.correlationId, contractId: cdata.mainInformation.contractId._text, offerId: cdata.mainInformation.productData.offerId._text, amount: cdata.mainInformation.productData.amount._text},
        (err, contract) => {
            if (err) return next(err)
            res.status(200)
            res.end()
        }
    )
    setTimeout(function(){
        let date = new Date()
        let confirmationMessage = `<decisionPositive xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <header>
                <messageId>${generateMessageId(24)}</messageId>
                <responseTo>${data.request.header.messageId}</responseTo>
                <correlationId>${data.request.header.correlationId}</correlationId>
                <sended>${date}</sended>
            </header>
            <data>
                <contractId>${cdata.mainInformation.contractId._text}</contractId>
                <amount>${cdata.mainInformation.productData.amount._text}</amount>
            </data>
        </decisionPositive>`
        
        let rejectionMessage = `<decisionNegative xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <header>
                <messageId>${generateMessageId(24)}</messageId>
                <originalMessageId>${data.request.header.messageId}</originalMessageId>
                <correlationId>${data.request.header.correlationId}</correlationId>
                <sended>${date}</sended>
            </header>
            <data>
                <reason>Некорректная сумма вклада</reason>
            </data>
        </decisionNegative>`
        if (cdata.mainInformation.productData.amount._text < 100) {
            fetch(process.env.SENDER + '/decision', {
            method: 'POST',
            body: rejectionMessage,
            headers: { 'Content-Type': 'application/xml' }
            })
        }
        else fetch(process.env.SENDER + '/decision', {
            method: 'POST',
            body: confirmationMessage,
            headers: { 'Content-Type': 'application/xml' }
            })
    }, 30000);
})

// Результат обработки решения
app.post('/api/v1/status', (req, res, next) => {
    if (req.get('AuthorizationId') !== process.env.AUTHORIZATION) res.status(403).end()
    const data = req.body
    const cdata = convert.xml2js(data.report.decisionReport.data, {compact: true, spaces: 4});
    const contractId = cdata.result.contractId._text
    Contract.find(contractId, (err, result) => {
        if (err) return next(err)
        if (result === undefined) {
            res.status(404)
            res.end()
        }
        res.status(200).end()
    })
})

app.listen(app.get('port'), () => {
    console.log(`You are online at ${app.get('port')}`)
})