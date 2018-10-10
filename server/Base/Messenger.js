//const Bluebird=require('bluebird'); // http://bluebirdjs.com/
const util=require('util')
const RequestPromise=require('request-promise-native') // request-promise/-native。https://www.npmjs.com/package/request-promise. 还看到一个方法：Bluebird.promisifyAll(require("request"));
const NodeMailer=require('nodemailer') // 或者 const smtpTransporter=require('nodemailer').createTransport({host:'', port:25, auth:{user:'',pass:''}})
let smtpTransporter = null

let smsClient = null  // 在调用时，才创建 smsClient，防止 wo.Config 还没有建立好。

module.exports={
  sendMail: async function(option){ // 或者如果smtp参数已经确定，就可以直接定义 sendMail: Bluebird.promisify(Smtp.sendMail).bind(Smtp)
    smtpTransporter=smtpTransporter||NodeMailer.createTransport(wo.Config.SMTP)
    return await util.promisify(smtpTransporter.sendMail).call(smtpTransporter, option)
  }
  ,
  sendSms: async function(phone, option){ // 通过option对象，对外提供统一的调用参数格式
    if (/^\+\d+-\d+$/.test(phone)){
      option=option||{}
      if (option.vendor==='dxton' && option.msg){
        return await this.sendSmsDxton(phone, option.msg)
      }else if (option.vendor==='aliyun' && option.msgParam && option.templateCode && option.signName){
        return await this.sendSmsAliyun(phone, option.msgParam, option.templateCode, option.signName)
      }
    }
    return null // 手机号格式错误，或者 option.vendor 错误。
  }
  ,
  sendSmsDxton: async function(phone, msg){ // 使用 dxton.com 的短信接口。
    var matches=phone.match(/\d+/g)
    var smsNumber, smsUrl
    if (matches[0]==='86'){
      smsUrl = wo.Config.SMS.urlChina
      smsNumber=matches[1]
    }else{
      smsUrl = wo.Config.SMS.urlWorld // 国际短信不需要签名、模板，可发送任意内容。
      smsNumber=matches[0]+matches[1]
    }
//    return Bluebird.promisify(Http.get)(smsUrl+'&mobile='+smsNumber+"&content="+encodeURIComponent(msg));
    let returnValue = await RequestPromise.get(smsUrl+'&mobile='+smsNumber+"&content="+encodeURIComponent(msg))
    let result = { state:'FAIL', code:returnValue }
    switch (parseInt(returnValue)) {
      // 短信接口代码：http://www.dxton.com/help_detail/2.html
      case 100: return { state:'DONE', code:'100', msg:'sendSms: 发送成功 （表示已和我们接口连通）' }
      case 101: result.msg='sendSms: 验证失败（账号、密码可能错误）'
      case 102: result.msg='sendSms: 手机号码格式不正确'
      case 103: result.msg='sendSms: 会员级别不够'
      case 104: result.msg='sendSms: 内容未审核 （试用或小批量应用，只能用系统后台公共模板格式，标点符号都要一致！）'
      case 105: result.msg='sendSms: 内容过多或无合适匹配通道'
      case 106: result.msg='sendSms: 账户余额不足'
      case 107: result.msg='sendSms: Ip受限'
      case 108: result.msg='sendSms: 手机号码发送太频繁（一天5个），请换号或隔天再发'
      case 109: result.msg='sendSms: 帐号被锁定'
      case 110: result.msg='sendSms: 手机号发送频率持续过高，黑名单屏蔽数日'
      case 120: result.msg='sendSms: 系统升级'
      default: console.error(result); return result
    }
  },
  sendSmsAliyun: async function(phone, msgParam, templateCode, signName){ // msgParam 是消息模板参数对象，例如 { code: "890353" }
    smsClient = smsClient || new (require('@alicloud/sms-sdk'))({ // 在调用时，才创建 smsClient，防止 wo.Config 还没有建立好。
        accessKeyId:wo.Config.SMS_ALI.accessKeyId, 
        secretAccessKey:wo.Config.SMS_ALI.secretAccessKey
      })

    var matches=phone.match(/\d+/g)
    var smsNumber
    if (matches[0]==='86'){
      smsNumber=matches[1]
    }else{
      smsNumber='00'+matches[0]+matches[1]
    }
    return await smsClient.sendSMS({
      PhoneNumbers: smsNumber,//必填:待发送手机号。支持以逗号分隔的形式进行批量调用，批量上限为1000个手机号码,批量调用相对于单条调用及时性稍有延迟,验证码类型的短信推荐使用单条调用的方式；发送国际/港澳台消息时，接收号码格式为00+国际区号+号码，如“0085200000000”
      SignName: signName,//必填:短信签名-可在短信控制台中找到
      TemplateCode: templateCode,//必填:短信模板-可在短信控制台中找到，发送国际/港澳台消息时，请使用国际/港澳台短信模版
      TemplateParam: JSON.stringify(msgParam) //可选:模板中的变量替换JSON串,如模板内容为"亲爱的${name},您的验证码为${code}"时。
    }).then(
      function (res) {
        let {Code}=res
        if (Code === 'OK') {
          return { state:'DONE' }
        }else{
          return { state:'FAIL', result:res }
        }
      }, 
      function (err) {
        return { state:'ERROR', error:err }
      }
    )
  }

}