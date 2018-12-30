module.exports={
  // ownerSecword 必须在用户配置文件中设置，或在命令行参数中设置，否则默认创建一个随机密语。
  // 一个网络的第一个节点总是应当使用该网的初始账户，否则无法出块，无法给其他账户转账。默认为开发网的初始账户。
  ownerSecword: '',
  // 如果使用 https 协议:
  sslKey: '', // ssl key file such as /etc/letsencrypt/live/.../privkey.pem
  sslCert: '', // ssl cert file such as /etc/letsencrypt/live/.../cert.pem
  sslCA: '', // ssl ca file such as /etc/letsencrypt/live/.../fullchain.pem
  // 节点主人设置的种子节点
  seedSet: [],
}
