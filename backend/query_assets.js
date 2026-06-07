const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/digital_wealth');
const Asset = mongoose.model('Asset', new mongoose.Schema({}, { strict: false }));
Asset.find().then(docs => {
  console.log(JSON.stringify(docs.map(d => ({ symbol: d.symbol, qr: d.qrCodeImage })), null, 2));
  process.exit();
});
