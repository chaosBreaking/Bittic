const JsonWebToken = require('jsonwebtoken')

const Tool = new (require('./Egg.js'))()

module.exports={
  createToken: function(content, key) { // content 可以是字符串或对象，不可以是数组。
    key=key||Tool.readPath('wo.Config.TOKEN_KEY') // key或wo.Config.TOKEN_KEY其中之一必须存在
    if (content && typeof(key)==='string' && key.length>0){ // 注意，jwt.sign(null|'') 会出错。但 sign(0)可以的。
      return JsonWebToken.sign(content, key)
    }
    return null
  }
  ,
  verifyToken: function(token, key) {
    key=key||Tool.readPath('wo.Config.TOKEN_KEY') // key或wo.Config.TOKEN_KEY其中之一必须存在
    if (token && typeof token==='string' && typeof(key)==='string' && key.length>0) {
try{  token=JsonWebToken.verify(token, key)  }catch(exp){ return null }
      if (Date.now() - Date.parse(token.whenStamp) > 2*60*60*1000) { // 每过2小时，核对一遍密码

      }
      if (typeof token==='object')
        return token
    }
    return null
  }
}
