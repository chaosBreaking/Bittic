const BigNumber=require('bignumber.js') // https://github.com/MikeMcl/bignumber.js  几个库的比较: node-bignum: 使用到openssl，在windows上需要下载二进制包，有时下载失败。bigi: 不错。 bignumber.js：不错。
const crypto=require('crypto')
const nacl = require('tweetnacl')
const bs58check = require('bs58check')
const Secword = require('bitcore-mnemonic') // https://bitcore.io/api/mnemonic/   https://github.com/bitpay/bitcore-mnemonic
// const bip39 = require('bip39') // https://github.com/bitcoinjs/bip39 // 有更多语言，但不方便选择语言，也不能使用 pass
// const HDKey = require('hdkey') // https://github.com/cryptocoinjs/hdkey // 或者用 bitcore-mnemonic 或者 ethers 里的相同功能

// 全部以hex为默认输入输出格式，方便人的阅读，以及方便函数之间统一接口

const Tool = new (require('./Egg.js'))()

var my={}
my.HASHER='sha256' // 默认的哈希算法。could be md5, sha1, sha256, sha512, ripemd160。 可用 Crypto.getHashes/Ciphers/Curves() 查看支持的种类。
my.HASHER_LIST=crypto.getHashes()
my.CIPHER='aes-256-cfb' // 默认的加解密算法
my.CIPHER_LIST=crypto.getCiphers()
my.CURVE='secp256k1' // 默认的ECDH曲线，用于把私钥转成公钥。
my.CURVE_LIST=['secp256k1'] // crypto.getCurves() 引入到浏览器里后出错，不支持 getCurves.
my.OUTPUT='hex' // 默认的哈希或加密的输入格式
my.OUTPUT_LIST=['hex','latin1','base64'] // or 'buf' to Buffer explicitly
my.INPUT='utf8' // 默认的加密方法的明文格式。utf8 能够兼容 latin1, ascii 的情形
my.INPUT_LIST=['utf8', 'ascii', 'latin1'] // ignored for Buffer/TypedArray/DataView
my.COIN='TIC' // 默认的币种
my.COIN_LIST=['TIC','BTC','ETH']

module.exports = {
  hash:function(data, option){ // data can be anything, but converts to string or remains be Buffer/TypedArray/DataView
    if (this.isHashable(data)) { // 即使 data 是 null, false, '', 等等，也返回哈希。
      option=option||{}
      if (typeof(data)!=='string' && !(data instanceof Buffer) && !(data instanceof DataView)) 
        data=JSON.stringify(data)
      var inputEncoding=my.INPUT_LIST.indexOf(option.input)>=0?option.input:my.INPUT // 'utf8', 'ascii' or 'latin1' for string data, default to utf8 if not specified; ignored for Buffer, TypedArray, or DataView.
      var outputEncoding= (option.output==='buf')?undefined:(my.OUTPUT_LIST.indexOf(option.output)>=0?option.output:my.OUTPUT)  // option.output: 留空=》默认输出hex格式；或者手动指定 'buf', hex', 'latin1' or 'base64'
      var hasher= my.HASHER_LIST.indexOf(option.hasher)>=0?option.hasher:my.HASHER // 默认为 sha256. 
      return crypto.createHash(hasher).update(data, inputEncoding).digest(outputEncoding)
    }
    return null
  }
  ,
  isHashable:function(data, option){
    option=option||{}
    if (option.strict) {
      return data && typeof(data)!=='boolean' && data!==Infinity // 允许大多数数据，除了空值、布尔值、无限数
    }
    return typeof(data)!=='undefined' // 允许一切数据，除非 undefined
  }
  ,
  isHash:function(hash, option){
    option=option||{}
    option.hasher=my.HASHER_LIST.indexOf(option.hasher)>=0?option.hasher:my.HASHER
    switch(option.hasher){
      case 'sha256': return /^[a-fA-F0-9]{64}$/.test(hash)
      case 'md5': return /^[a-fA-F0-9]{32}$/.test(hash)
      case 'ripemd160': case 'sha1': return /^[a-fA-F0-9]{40}$/.test(hash)
      case 'sha512': return /^[a-fA-F0-9]{128}$/.test(hash)
    }
    return false
  }
  ,
  encrypt: function(data, pwd, option){
    if (this.isHashable(data) && this.isPwd(pwd)) {
      option=option||{}
      let inputEncoding=my.INPUT_LIST.indexOf(option.input)>=0?option.input:my.INPUT // 'utf8' by default, 'ascii', 'latin1' for string  or ignored for Buffer/TypedArray/DataView
      let outputEncoding=(option.output==='buf')?undefined:(my.OUTPUT_LIST.indexOf(option.output)>=0?option.output:my.OUTPUT) // 'latin1', 'base64', 'hex' by default or 'buf' to Buffer explicitly
      let cipher=crypto.createCipher(
        my.CIPHER_LIST.indexOf(option.cipher)>=0?option.cipher:my.CIPHER, 
        this.hash(pwd))
      if (typeof(data)!=='string' && !(data instanceof Buffer) && !(data instanceof DataView)) 
        data=JSON.stringify(data)
      let encrypted = cipher.update(data, inputEncoding, outputEncoding)
      encrypted += cipher.final(outputEncoding) // 但是 Buffer + Buffer 还是会变成string
      return encrypted
    }
    return null
  }
  ,
  decrypt: function(data, pwd, option){ // data 应当是 encrypt 输出的数据类型
    if (data && (typeof(data)==='string' || data instanceof Buffer) && this.isPwd(pwd)) {
      option=option||{}
      let inputEncoding=my.OUTPUT_LIST.indexOf(option.input)>=0?option.input:my.OUTPUT  // input (=output of encrypt) could be 'latin1', 'base64', 'hex' by default for string or ignored for Buffer
      let outputEncoding=(option.output==='buf')?undefined:(my.INPUT_LIST.indexOf(option.output)>=0?option.output:my.INPUT) // output (=input of encrypt) could be 'latin1', 'ascii', 'utf8' by default or  'buf' to Buffer explicitly
      let decipher=crypto.createDecipher(
        my.CIPHER_LIST.indexOf(option.cipher)>=0?option.cipher:my.CIPHER, 
        this.hash(pwd))
      let decrypted = decipher.update(data, inputEncoding, outputEncoding)
      decrypted += decipher.final(outputEncoding) // 但是 Buffer + Buffer 还是会变成string
      if (option.format==='json') { // 如果用户输入错误密码，deciper也能返回结果。为了判断是否正确结果，对应当是 json 格式的原文做解析来验证。
        try{
          JSON.parse(decrypted)
        }catch(exception){
          return null
        }
      }
      return decrypted
    }
    return null
  }
  ,
  sign: function(data, seckey, option) { // data can be string or buffer or object, results are the same
    if (this.isHashable(data) && this.isSeckey(seckey)) {
      option=option||{}

      // 使用nacl的签名算法。注意，nacl.sign需要的seckey是64字节=512位，而比特币/以太坊的seckey是32字节。因此本方法只能用于 TIC 币的 keypair。
      option.output='buf' // 哈希必须输出为 buffer
      var hashBuf = this.hash(data, option)
      var signature = nacl.sign.detached(hashBuf, Buffer.from(seckey, 'hex'))
      return Buffer.from(signature).toString('hex') // 返回128个hex字符，64字节

      // 方案2：尚未彻底实现。
      // let hasher=my.HASHER_LIST.indexOf(option.hasher)>=0?option.hasher:my.HASHER
      // let inputEncoding=my.INPUT_LIST.indexOf(option.input)>=0?option.input:my.INPUT // 'utf8', 'ascii' or 'latin1' for string data, default to utf8 if not specified; ignored for Buffer, TypedArray, or DataView.
      // let outputEncoding=(option.output==='buf')?undefined:(my.OUTPUT_LIST.indexOf(option.output)>=0?option.output:my.OUTPUT)
      // let signer=crypto.createSign(hasher)
      // return signer.update(data, inputEncoding).sign(seckey, outputEncoding) // todo: crypto的sign要求的seckey必须是PEM格式，因此这样写是不能用的。
    }
    return null
  }
  ,
  isSignature:function(signature){
    return /^[a-fA-F0-9]{128}$/.test(signature)
  }
  ,
  verify: function (data, signature, pubkey, option) { // data could be anything, but converts to string or remains be Buffer/TypedArray/DataView
    if (this.isHashable(data) && this.isSignature(signature) && this.isPubkey(pubkey)){
      option=option||{}
      option.output='buf' // 哈希必须输出为 buffer
      var bufHash=this.hash(data, option)
      var bufSignature = Buffer.from(signature, 'hex')
      var bufPubkey = Buffer.from(pubkey, 'hex')
      var res = nacl.sign.detached.verify(bufHash, bufSignature, bufPubkey)
      return res
    }
    return null
  }
  ,
  pass2keypair:function(pass, option){ // 如果使用其他机制，例如密码、随机数，不使用secword，也可生成keypair
    if (this.isHashable(pass)){
      option=option||{}
      option.hasher=my.HASHER_LIST.indexOf(option.hasher)>=0?option.hasher:my.HASHER
      var hashBuf = crypto.createHash(option.hasher).update(pass).digest()
      var keypair = nacl.sign.keyPair.fromSeed(hashBuf)
      return {
        hash: hashBuf.toString('hex'),
        pubkey: Buffer.from(keypair.publicKey).toString('hex'), // 测试过 不能直接keypair.publicKey.toString('hex')，不是buffer类型
        seckey: Buffer.from(keypair.secretKey).toString('hex')
      }
    }
    return null
  }
  ,
  secword2keypair: function(secword, option){ // option.coin 币种；option.passphase 密码，默认为空；option.path==='master' 生成 HD master key，不定义则默认为相应币种的第一对公私钥。
    if (Secword.isValid(secword)){
      option=option||{}
      option.coin=my.COIN_LIST.indexOf(option.coin)>=0?option.coin:my.COIN

      if(option.coin==='TIC') {
        // 采用自己的算法：bip39算法从secword到种子，hash后用 nacl.sign.keyPair.fromSeed()方法。结果和方案1的不一致！
        option=option||{}
        option.hasher=my.HASHER_LIST.indexOf(option.hasher)>=0?option.hasher:my.HASHER
        var hashBuf=crypto.createHash(option.hasher).update(this.secword2seed(secword)).digest()
        var keypair = nacl.sign.keyPair.fromSeed(hashBuf) // nacl.sign.keyPair.fromSeed 要求32字节的种子，而 this.secword2seed生成的是64字节种子，所以要先做一次sha256
        return {
          coin: option.coin,
          pubkey: Buffer.from(keypair.publicKey).toString('hex'), // 测试过 不能直接keypair.publicKey.toString('hex')，不是buffer类型
          seckey: Buffer.from(keypair.secretKey).toString('hex') // nacl.sign.keyPair.fromSeed 得到的 seckey 是64字节的，不同于比特币/以太坊的32字节密钥。
        }
      }else {
        // 用 bip39 算法从 secword 到种子，再用 bip32 算法从种子到根私钥。这是比特币、以太坊的标准方式，结果一致。
//        let hdmaster=HDKey.fromMasterSeed(new Buffer(this.secword2seed(secword, option.pass), 'hex')) // 和 new Secword(secword).toHDPrivateKey 求出的公私钥一样！
        let hdmaster=new Secword(secword).toHDPrivateKey(option.pass) // 和 ethers.HDNode.fromMnemonic(secword)的公私钥一样。而 ethers.HDNode.fromMnemonic(secword).derivePath("m/44'/60'/0'/0/0")的公私钥===ethers.Wallet.fromMnemonic(secword [,"m/44'/60'/0'/0/0"])
        let key=hdmaster
        if (option.path==='master'){
          key=hdmaster
        }else if (!option.path) {
         switch(option.coin){
           case 'BTC': key=hdmaster.derive("m/44'/0'/0'/0/0"); break
           case 'ETH': key=hdmaster.derive("m/44'/60'/0'/0/0"); break
           default: key=hdmaster.derive("m/44'/99'/0'/0/0"); break
         }
        }else { // 指定了路径 option.path，例如 "m/44'/0'/0'/0/6" 或 "m/0/2147483647'/1"
          key=hdmaster.derive(option.path)
        }
        return {
          coin: option.coin,
          seckey: key.privateKey.toString('hex'), // 或者 key.toJSON().privateKey。或者 key.privateKey.slice(2) 删除开头的'0x'如果是ethers.HDNode.fromMnemonic(secword)的结果
          pubkey: key.publicKey.toString('hex')
        }
      }
    }
    return null
  }
  ,
  seckey2pubkey:function(seckey, option){
    if (this.isSeckey(seckey) && seckey.length===64){ // 只能用于32字节的私钥。也就是不能用于 TIC 的私钥。
      option=option||{}
      let curve = my.CURVE_LIST.indexOf(option.curve)>=0?option.curve:my.CURVE // 默认为 secp256k1
      let compress = ['compressed', 'uncompressed'].indexOf(option.compress)>=0?option.compress:'compressed' // 默认为压缩格式的公钥
      return new crypto.ECDH(curve).setPrivateKey(seckey,'hex').getPublicKey('hex',compress).toString('hex') // ecdh.getPublicKey(不加参数) 默认为 'uncompressed'
      // 从 nodejs 10.0 开始，还有 crypto.ECDH.convertKey 方法，更直接。
      // 或者 require('secp256k1').publicKeyCreate(Buffer.from(seckey, 'hex'),compress).toString('hex')
      // 或者 require('bitcore-lib').PublicKey.fromPrivateKey(new Btc.PrivateKey(seckey)).toString('hex')
      // 注意，Buffer.from(nacl.box.keyPair.fromSecretKey(Buffer.from(seckey,'hex')).publicKey).toString('hex') 得到的公钥与上面的不同
    }
    return null
  }
  ,
  secword2account:function(secword, option){
    let kp=this.secword2keypair(secword, option)
    if (kp) {
      switch (kp.coin){
        case 'TIC': kp.address=this.pubkey2address(kp.pubkey); break;
        case 'ETH': // 目前不支持 ETH 地址转换，因为这会大量增加前端打包的js。
        case 'BTC': 
        default: return null
      }
      return kp 
    }
    return null
  }
  ,
  secword2address:function(secword, option){
    let kp=this.secword2keypair(secword, option)
    if (kp) {
      switch (kp.coin){
        case 'TIC': address=this.pubkey2address(kp.pubkey); break;
        case 'ETH': // 目前不支持 ETH 地址转换，因为这会大量增加前端打包的js。
        case 'BTC': 
        default: return null
      }
      return address
    }
    return null
  }
  ,
  isSeckey:function(seckey){
    // 比特币、以太坊的私钥：64 hex
    // nacl.sign 的私钥 128 hex, nacl.box 的私钥 64 hex
    return /^([a-fA-F0-9]{128}|[a-fA-F0-9]{64})$/.test(seckey)
  }
  ,
  isPubkey:function(pubkey){
    // 比特币的公钥：压缩型 '02|03' + 64 hex 或 无压缩型 '04' + 128 hex
    // 以太坊的公钥：'02|03' + 64 hex
    // nacl.sign 的公钥：64 hex
    return /^((02|03)?[a-fA-F0-9]{64}|04[a-fA-F0-9]{128})$/.test(pubkey) // "d2f186a630f5558ba3ede10a4dd0549da5854eab3ed28ee8534350c2535d38b0"
  }
  ,
  isAddress: function (address) {
    return /^[m|t|d|T][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{33}$/.test(address)  // && address.length>25 && bs58check.decode(address.slice(1)) && ['A'].indexOf(address[0]>=0)) {
  }
  ,
  pubkey2address:function (pubkey, netType='mainnet') { // pubkey 应当是string或Buffer类型。
    if (this.isPubkey(pubkey)) {
      pubkey = Buffer.from(pubkey, 'hex')
      var h256 = crypto.createHash('sha256').update(pubkey).digest()
      var h160 = crypto.createHash('ripemd160').update(h256).digest('hex')
      var prefix='42' // 前缀使得b58check后变成某个特定字符开头。 '53' =》 a开头，代表address。'42'=>T
  /*    var wo=wo||{}
      netType=netType||((wo && wo.Config && wo.Config.netType)?wo.Config.netType:'mainnet') // 参数>配置>默认值
      switch (netType){
        case 'mainnet': prefix='6E'; break; // =》 m 开头wif地址
        case 'testnet': prefix='7F'; break; // =》 t 开头wif地址
        case 'devnet': prefix='5A'; break; // =》 d 开头wif地址
        default: return null
      } */
      var wifAddress=bs58check.encode(Buffer.from(prefix+h160,'hex')) // wallet import format
      return wifAddress
    }
    return null
  }
  ,
  secword2address:function(secword, net){
    var kp=this.secword2keypair(secword)
    if (kp && this.isPubkey(kp.pubkey)) {
      return this.pubkey2address(kp.pubkey, net)
    }
    return null
  }
  ,
  secword2seed:function(secword, pass) { // 遵循bip39的算法。和 ether.HDNode.mnemonic2Seed 结果一样，是64字节的种子。
    if (Secword.isValid(secword)) { //  bip39.validateMnemonic(secword)) {
      return new Secword(secword).toSeed(pass).toString('hex') // 结果一致于 bip39.mnemonicToSeedHex(secword) 或 ethers.HDNode.mnemonic2Seed(secword)
    }
    return null
  }
  ,
  randomSecword:function(lang){ // Object.keys(Secword.Words) => [ 'CHINESE', 'ENGLISH', 'FRENCH', 'ITALIAN', 'JAPANESE', 'SPANISH' ]
    lang = (lang && Secword.Words.hasOwnProperty(lang.toUpperCase())) ? lang.toUpperCase() : 'ENGLISH'
    return new Secword(Secword.Words[lang]).phrase
  }
  ,
  randomSeckey:function(option){
    option=option||{}
    option.coin=my.COIN_LIST.indexOf(option.coin)>=0?option.coin:my.COIN
    if (option.coin==='TIC'){
      return Buffer.from(nacl.sign.keyPair().secretKey).toString('hex') // 64字节
    }else{
      return Buffer.from(nacl.box.keyPair().secretKey).toString('hex') // 32字节
    }
  }
  ,
  randomKeypair:function(option){
    option=option||{}
    option.coin=my.COIN_LIST.indexOf(option.coin)>=0?option.coin:my.COIN
    let kp
    if (option.coin==='TIC'){
      kp=nacl.sign.keyPair()
    }else{
      kp=nacl.box.keyPair()
    }
    return {
      seckey:Buffer.from(kp.secretKey).toString('hex'),
      pubkey:Buffer.from(kp.publicKey).toString('hex')
    }
  }
  ,
  randomString:function (length=6, alphabet) { // 长度为 length，字母表为 alphabet 的随机字符串
    alphabet = alphabet||"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%^&*@"
    var text = ''
    for (var i = 0; i < length; i++) {
      text += alphabet.charAt(Math.floor(Math.random() * alphabet.length))
    }
    return text
  }
  ,
  randomNumber:function(option){ // 长度为 option.length 的随机数字，或者 (option.min||0) <= num < option.max
    option=option||{}
    var num=0
    if (option.length>0){
      num=parseInt(Math.random()*Math.pow(10,option.length))
      let l = new String(num).length
      while(l < option.length) {
        num = '0' + num // 注意，这时返回的是字符串！
        l++
      }
    }else if (option.max>0){
      option.min = (option.min>=0)?option.min:0
      num=parseInt(Math.random()*(option.max-option.min))+option.min
    }else{ // 如果 option 为空
      num=Math.random()
    }
    return num
  }
  ,
  getMerkleRoot:function(hashList, option){
    // merkle算法略有难度，暂时用最简单的hash代替
    if(Array.isArray(hashList)){
      option=option||{}
      let output=(option.output==='buf')?undefined:(option.output||my.OUTPUT)
      let hasher=crypto.createHash(my.HASHER_LIST.indexOf(option.hasher)>=0?option.hasher:my.HASHER)
      for (var hash of hashList){
        hasher.update(hash)
      }
      return hasher.digest(output)
    }
    return null
  }
  ,
  distanceSig:function(hash, sig){ // hash为64hex字符，sig为128hex字符。返回用hex表达的距离。
    if (this.isSignature(sig) && this.isHash(hash)){
      var hashSig=this.hash(sig) // 把签名也转成32字节的哈希，同样长度方便比较
      return new BigNumber(hash,16).minus(new BigNumber(hashSig,16)).abs().toString(16)
    }
    return null
  }
  ,
  compareSig:function(hash, sig1, sig2){ // 返回距离hash更近的sig
    if (this.isHash(hash)) {
      if (this.isSignature(sig2) && this.isSignature(sig1)) {
        var dis1=this.distanceSig(hash,sig1)
        var dis2=this.distanceSig(hash,sig2)
        if (dis1<dis2) {
          return sig1
        }else if (dis1>dis2) {
          return sig2
        }else if (dis1===dis2) { // 如果极其巧合的距离相等，也可能是一个在左、一个在右，那就按 signature 本身的字符串排序来比较。
          return sig1<sig2 ? sig1 : sig1===sig2 ? sig1 : sig2
        }
      }else if (this.isSignature(sig2)){ // 允许其中一个signature是非法的，例如undefined
        return sig2
      }else if (this.isSignature(sig1)){
        return sig1
      }
    }
    return null
  }
  ,
  sortSigList:function(hash, sigList) {
    if (Array.isArray(sigList) && this.isHash(hash)){
      sigList.sort(function(sig1, sig2){
        if (this.isSignature(sig1) && this.isSignature(sig2)) {
          var winner=this.compareSig(hash, sig1, sig2)
          if (sig1===sig2) return 0
          else if (winner===sig1) return -1
          else if (winner===sig2) return 1
        }else { // 如果 sig1 或 sig2 不是 signature 格式
          throw 'Not a signature!'
        }
      })
      return sigList
    }
    return null
  }
  ,
    /** 用于支付宝的接口
   * 把数组所有元素，按照“参数=参数值”的模式用“&”字符拼接成字符串
   * @param $para 需要拼接的数组
   * return 拼接完成以后的字符串
   */
  getString2Sign: function (paramSet, converter, delimiter) {
    if (paramSet && typeof paramSet==='object') {
      var string2Sign = ''
      var converter = converter || ''
      var delimiter = delimiter || ''
      for (var key of Object.keys(paramSet).sort()) {
        var value=paramSet[key]
        if (value && typeof value==='object'){ // 万一 bis_content 等对象直接送了进来。
          value=JSON.stringify(value)
        }
        if ((typeof value==='string' && value!=='') || typeof value==='number') {
          if (converter==='urlencode') value=encodeURIComponent(value)
          string2Sign += (key + '=' + delimiter + value + delimiter + '&')  // 根据产品、版本、请求或响应的不同，有的需要key="vlaue"，有的只要key=value。
        }
      }
      string2Sign=string2Sign.replace(/&$/, '') // 删除末尾的 &
  //    if (get_magic_quotes_gpc()) { $string2Sign = stripslashes($string2Sign); } 
  //    string2Sign=string2Sign.replace(/\\/g, ''); // 去除转义符 \ (似乎其实不去除，也完全不会影响，因为编程语言内部就会处理掉\)
  //    string2Sign=string2Sign.replace(/\//g, '\\/'); // 为了verify：把正斜杠进行转义 /  参见 https://openclub.alipay.com/read.php?tid=559&fid=2
      return string2Sign
    }
    return ''
  }
  ,
  rsaSign: function(string2Sign, prikey, signType){
    signType=signType||'RSA-SHA1' // could be RSA-SHA256, RSA-SHA1 or more
    let signer=crypto.createSign(signType)
    return encodeURIComponent(signer.update(string2Sign).sign(prikey, 'base64'))
  }
  ,
  rsaVerify: function(string2Verify, sign, pubkey, signType){
    signType=signType||'RSA-SHA1' // could be RSA-SHA256, RSA-SHA1 or more
    let verifier=crypto.createVerify(signType)
    return verifier.update(string2Verify).verify(pubkey, sign, 'base64')
  }
  ,
  /* 用户登录所需的 UID 和 PWD 方法 */
  typeofUid : function(uid) { // 越底层，越通用、基础、广泛。例如，逻辑层允许各种电话格式，但本应用中，只允许中国11位手机号。
    if (/^[_\w\-\.]+@[\w\-]+(\.[\w\-]+)*\.[a-zA-Z]{2,4}$/.test(uid))
      return 'email'
    else if (/^\+\d{1,3}-\d{11}$/.test(uid))
      return 'phone'
    else if (/^\*\d{1,12}$/.test(uid)) // 注意，在前端的sid包含开头的 * 符号，以和省略了国家码的手机号区分。送到后台前，要删除该 * 符号。
      return 'aiid'
    else if (/^\d{11}$/.test(uid))
    	return 'callNumber'
    else
      return null
  }
  ,
  isPwd: function(pwd){
    return /^[^\s]{6,}$/.test(pwd) // 非空格，6个字符及以上
  }
  ,
  hash4Server:function(source, salt) {
    salt=salt||Tool.readPath('wo.Config.HASH_SALT')||''
    if (source && typeof(source)==='string' && typeof(salt)==='string')
      return crypto.createHash('md5').update(source+salt).digest('hex')
    return null
  }
}
