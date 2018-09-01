const JsonWebToken = require('jsonwebtoken')

const Tool = new (require('./Egg.js'))()
const Crypto = require('./Crypto.js')

module.exports={
  createToken: function(content, key) { // content 可以是数字，字符串或对象，不可以是数组。
    key=key||Tool.readPath('wo.Config.tokenKey') // key或wo.Config.tokenKey其中之一必须存在
    if (content && !Array.isArray(content) && typeof(key)==='string' && key.length>0){ // 注意，jwt.sign(null|'') 会出错。但 sign(0)可以的。
      try{
        return JsonWebToken.sign(content, Crypto.hash(key))
      }catch(exp){
        return null
      }
    }
    return null
  }
  ,
  verifyToken: function(token, key) {
    key=key||Tool.readPath('wo.Config.tokenKey') // key或wo.Config.tokenKey其中之一必须存在
    if (token && typeof token==='string' && typeof(key)==='string' && key.length>0) {
      try{
        token=JsonWebToken.verify(token, Crypto.hash(key))
      }catch(exp){
        return null
      }
      if (Date.now() - Date.parse(token.whenStamp) > 2*60*60*1000) { // 每过2小时，核对一遍密码

      }
      return token
    }
    return null
  }
}
