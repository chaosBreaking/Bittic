//const Bluebird=require('bluebird'); // http://bluebirdjs.com/
const util=require('util')
const RequestPromise=require('request-promise-native') // request-promise/-native。https://www.npmjs.com/package/request-promise. 还看到一个方法：Bluebird.promisifyAll(require("request"));
const NodeMailer=require('nodemailer') // 或者 const smtpTransporter=require('nodemailer').createTransport({host:'', port:25, auth:{user:'',pass:''}})
const SMSClient = require('@alicloud/sms-sdk')
var smtpTransporter

// ACCESS_KEY_ID/ACCESS_KEY_SECRET 根据实际申请的账号信息进行替换
const accessKeyId = 'LTAII9jEbhlTY2wn'
const secretAccessKey = 'WYqZmfcn2YQAgIBsdqUTQABL8azUJk'

let smsClient = new SMSClient({accessKeyId, secretAccessKey})

module.exports={
  sendMail: async function(option){ // 或者如果smtp参数已经确定，就可以直接定义 sendMail: Bluebird.promisify(Smtp.sendMail).bind(Smtp)
    smtpTransporter=smtpTransporter||NodeMailer.createTransport(wo.Config.SMTP);
    return await util.promisify(smtpTransporter.sendMail).call(smtpTransporter, option);
  }
  ,
  sendSms: async function(phone, msg){
/* 短信接口错误代码：
http://www.dxton.com/help_detail/2.html
100 发送成功 （表示已和我们接口连通）
101 验证失败（账号、密码可能错误）
102 手机号码格式不正确
103 会员级别不够
104 内容未审核 （试用或小批量应用，只能用系统后台公共模板格式，标点符号都要一致！）
105 内容过多或无合适匹配通道
106 账户余额不足
107 Ip受限
108 手机号码发送太频繁（一天5个），请换号或隔天再发
109 帐号被锁定
110 手机号发送频率持续过高，黑名单屏蔽数日
120 系统升级
*/
//    if (wo.Tool.typeofUid(phone)==='phone'){
      var matches=phone.match(/\d+/g)
      var smsNumber, smsUrl
      if (matches[0]==='86'){
        smsUrl = wo.Config.SMS.urlChina
        smsNumber=matches[1]
      }else{
        smsUrl = wo.Config.SMS.urlWorld
        smsNumber=matches[0]+matches[1]
      }
//      return Bluebird.promisify(Http.get)(smsUrl+'&mobile='+smsNumber+"&content="+encodeURIComponent(msg));
      return await RequestPromise.get(smsUrl+'&mobile='+smsNumber+"&content="+encodeURIComponent(msg));
//    }
  },
  sendSmsByAli: function(phone,code,TemplateCode,SignName){
    var matches=phone.match(/\d+/g)
    var smsNumber
    if (matches[0]==='86'){
      smsNumber=matches[1]
    }else{
      smsNumber='00'+matches[0]+matches[1]
    }
    smsClient.sendSMS({
      PhoneNumbers: smsNumber,//必填:待发送手机号。支持以逗号分隔的形式进行批量调用，批量上限为1000个手机号码,批量调用相对于单条调用及时性稍有延迟,验证码类型的短信推荐使用单条调用的方式；发送国际/港澳台消息时，接收号码格式为00+国际区号+号码，如“0085200000000”
      SignName: SignName,//必填:短信签名-可在短信控制台中找到
      TemplateCode: TemplateCode,//必填:短信模板-可在短信控制台中找到，发送国际/港澳台消息时，请使用国际/港澳台短信模版
      TemplateParam: '{"code":'+code+'}'//可选:模板中的变量替换JSON串,如模板内容为"亲爱的${name},您的验证码为${code}"时。
  }).then(function (res) {
      let {Code}=res
      if (Code === 'OK') {
          //处理返回参数
          console.log(res)
      }
  }, function (err) {
      console.log(err)
  })
  }

}