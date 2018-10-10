module.exports={ // 
  ownerSecword: 'clever journey cave maze luxury juice trigger discover bamboo net shoot put', // ownerSecword: 应当在 ConfigSecret.js 中覆盖，或在命令行参数中设置。测试网的第一个节点应当使用测试网初始账户。
  // 如果使用 https 协议，必须在 ConfigSecret.js 中覆盖，或在命令行参数中设置。不同网的第一个节点都应当用该网的初始账户。默认为devnet的初始账户。
  sslKey: '/etc/letsencrypt/live/.../privkey.pem', // ssl key file,
  sslCert: '/etc/letsencrypt/live/.../cert.pem', // ssl cert file,
  sslCA: '/etc/letsencrypt/live/.../fullchain.pem', // ssl ca file,
  seedSet: [], // 节点主人设置的种子节点
}
