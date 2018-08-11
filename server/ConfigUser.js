module.exports={ // 全节点主人的个性化配置。做成 module.exports 的 js，而不是 json文件，这样就可以写得更自由，可以添加注释
  root:"./",
  netType:"mainnet",
  protocol:'http',
//  host:'', // IP or Hostname
//  port:6842,
//  "seedSet":["http://localhost:6842"],

  // 如果使用 https 协议，必须填写以下内容，或在命令行参数中设置：
  sslKey: null, // ssl key file,
  sslCert: null, // ssl cert file,
  sslCA: null, // ssl ca file,

  //  secword: 'rate host once knife smoke mirror quarter sad sheriff forest error manage',
//  pubkey: '163958db909ba3d5e32ddc5a660e2881979861b29830ad29e9771bd6b714edcb',
//  seckey: '964185b720986ab934f843d127fcb1233271017234bae363a8f906b1ca64cbbd163958db909ba3d5e32ddc5a660e2881979861b29830ad29e9771bd6b714edcb'
//  address: 'Tom6DjLDo9TQk9yGH3KiBXyV8byzEohNBP'
  
  //  secword: 'wagon stock borrow episode laundry kitten salute link globe zero feed marble',
//  pubkey: 'af8b40bcb7c7b91ec95874249e69daf2ca42c27e4e87093382d161bfb641642d',
//  seckey: '38738caeafbad69d66cddb7b11cb6600d8323a4f19950ca5d2e771a88528ec9baf8b40bcb7c7b91ec95874249e69daf2ca42c27e4e87093382d161bfb641642d'
//  address: 'Tt9hwM5ydwPK52sjts58PsgZXTdBMe5hCY'

  // 每个全节点有一个主人，和终端用户一样有密钥
  ownerSecword:'window air repeat sense bring smoke legend shed accuse loan spy fringe' // 默认为和INITIAL_ACCOUNT一样
  ,
  consensus:null  // 共识机制。默认为单机出块模式。可选设为 ConsPot, ConsPotHard。
  ,
  mysql:{
    host:'localhost',
    port:3306,
    database:'ticdata',
    user:'yuanjin',
    charset: 'UTF8MB4_GENERAL_CI'
/*
  charset：连接字符集（默认：'UTF8_GENERAL_CI'，注意字符集的字母都要大写）
  localAddress：此IP用于TCP连接（可选）
  socketPath：连接到unix域路径，当使用 host 和 port 时会被忽略
　　timezone：时区（默认：'local'）
　　connectTimeout：连接超时（默认：不限制；单位：毫秒）
　　stringifyObjects：是否序列化对象（默认：'false' ；与安全相关https://github.com/felixge/node-mysql/issues/501）
　　typeCast：是否将列值转化为本地JavaScript类型值 （默认：true）
　　queryFormat：自定义query语句格式化方法 https://github.com/felixge/node-mysql#custom-format
　　supportBigNumbers：数据库支持bigint或decimal类型列时，需要设此option为true （默认：false）
　　bigNumberStrings：supportBigNumbers和bigNumberStrings启用 强制bigint或decimal列以JavaScript字符串类型返回（默认：false）
　　dateStrings：强制timestamp,datetime,data类型以字符串类型返回，而不是JavaScript Date类型（默认：false）
　　debug：开启调试（默认：false）
　　multipleStatements：是否许一个query中有多个MySQL语句 （默认：false）
　　flags：用于修改连接标志，更多详情：https://github.com/felixge/node-mysql#connection-flags
　　ssl：使用ssl参数（与crypto.createCredenitals参数格式一至）或一个包含ssl配置文件名称的字符串，目前只捆绑Amazon RDS的配置文件
　　其它：可以使用URL形式的加接字符串，不多介绍了，不太喜欢那种格式，觉得可读性差，也易出错，想了解的可以去主页上看。
*/
  }
  ,
  SMTP:{
    host:'mail.faronear.org',
    port:25,
//    secure:true, // use tls
    auth:{
      user:'postmaster@localhost',
      pass:''
    }
  }
  ,
  SMS:{
    urlChina:'',
    urlWorld:''
  }
}