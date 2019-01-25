module.exports = {
  // ownerSecword 必须在用户配置文件中设置，或在命令行参数中设置，否则默认创建一个随机密语。
  // 一个网络的第一个节点总是应当使用该网的初始账户，否则无法出块，无法给其他账户转账。默认为开发网的初始账户。
  ownerSecword: '',
  // 如果使用 https 协议:
  /* 注意，浏览器认识，但我们自己的后台，比如 钱包后台wallet.server，不认识我们使用的 letsencrypt 提供的 ssl证书。
  解决办法：  https://stackoverflow.com/questions/31673587/error-unable-to-verify-the-first-certificate-in-nodejs
  简单的解法：  https://www.npmjs.com/package/ssl-root-cas
  sslCert 不要使用 cert.pem，而使用 fullchain.pem, 把所有中间证书都带上，即可！
  */
  sslKey: '', // ssl key file such as /etc/letsencrypt/live/.../privkey.pem
  sslCert: '', // ssl cert file such as /etc/letsencrypt/live/.../cert.pem
  sslCA: '', // ssl ca file such as /etc/letsencrypt/live/.../client-cert.pem  // only for self-signed certificate: https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
  // 节点主人设置的种子节点
  seedSet: []
}
