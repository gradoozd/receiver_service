const sqlite3 = require('sqlite3').verbose()
const dbName = 'mock_service.sqlite'
const db = new sqlite3.Database(dbName)

// Создать таблицу КОНТРАКТ
db.serialize(() => {
    const sql = `
        CREATE TABLE IF NOT EXISTS contract (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            messageId TEXT,
            correlationId TEXT,
            contractId TEXT,
            offerId TEXT,
            amount REAL
        )
    `
    db.run(sql)
})

// Создать таблицу ПРОДУКТ
db.serialize(() => {
    const sql = `
        CREATE TABLE IF NOT EXISTS product (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            active INTEGER
        )
    `
    db.run(sql)
})

// Создать таблицу ОФФЕР
db.serialize(() => {
    const sql = `
        CREATE TABLE IF NOT EXISTS offer (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            productId INTEGER,
            name TEXT,
            active INTEGER
        )
    `
    db.run(sql)
})

// Вставка записи
// db.serialize(() => {
//     const sql = "DELETE FROM contract WHERE amount = 60999.39"
//     db.run(sql)
// })

// Контракт
class Contract {
    static save(data, cb) {
        const sql = 'INSERT INTO contract (messageId, correlationId, contractId, offerId, amount) VALUES (?, ?, ?, ?, ?)'
        db.run(sql, data.messageId, data.correlationId, data.contractId, data.offerId, data.amount, cb)
    }
    static find(contractId, cb) {
        db.get('SELECT * FROM contract WHERE contractId = ?', contractId, cb)
    }
}

// Продуктовый каталог
class Catalog {
    static upload(cb) {
        db.all('SELECT * FROM offer LEFT JOIN product ON offer.productId = product.id', cb)
    }
    static saveReport(data, cb) {}
    static requestReport(data, cb) {}
}

module.exports = db
module.exports.Contract = Contract
module.exports.Catalog = Catalog