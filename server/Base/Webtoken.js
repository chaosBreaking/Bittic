const JsonWebToken = require('jsonwebtoken')

module.exports={
  createToken: function(content) {
    if (content){ // 注意，jwt.sign(null|'') 会出错。但 sign(0)可以的。
      return JsonWebToken.sign(content, wo.Config.TOKEN_KEY)
    }
    return null
  }
  ,
  verifyToken: function(token) {
    if (token && typeof token==='string') {
try{  token=JsonWebToken.verify(token, wo.Config.TOKEN_KEY)  }catch(exp){}
      if (Date.now() - Date.parse(token.whenStamp) > 2*60*60*1000) { // 每过2小时，核对一遍密码

      }
      if (typeof token==='object')
        return token
    }
    return null
  }
}