/* 处理文件上传
*/

const Multer=require('multer'); // https://www.npmjs.com/package/multer
//const FileSystem=require('fs');
const Bluebird=require('bluebird'); // http://bluebirdjs.com/
//const PromisedFS=Bluebird.promisifyAll(FileSystem);  // 或者：https://www.npmjs.com/package/fs-bluebird
const FileRoot='../file/';
const UserFileRoot='_User/';

const File={}
module.exports=File

const Uploader = Bluebird.promisify(Multer({
  //dest:'./File/', // 这样，不能自定义文件名。
  storage:Multer.diskStorage({
    destination: function (req, file, cb) { // 如果直接提供字符串，Multer会负责创建该目录。如果提供函数，你要负责确保该目录存在。
      var folder=FileRoot+UserFileRoot; // 目录是相对于本应用的入口js的，即相对于 server.js 的位置。
//      try{ FileSystem.accessSync(folder); }catch(e){ FileSystem.mkdirSync(folder);  }  // 我已确保它存在。或者用 exists 方法。
      cb(null, folder)
    },
    filename: function (req, file, cb) { // 注意，req.body 也许还没有信息，因为这取决于客户端发送body和file的顺序。
      var ext=file.originalname.replace(/^.*\.(\w+)$/,'$1');
      cb(null, wo.Tool.json2obj(decodeURIComponent(req.body.usage))+'-'+Date.now()+'.'+ext); // 这时还没有用 json2obj 和 decodeURIComponent 过滤，所以要专门过滤一次。
    }
  }),
  //fileFilter:function(req, file, cb) {},
  //limits:{fileSize:10485760}
}).single('fileData'))

File.upload=async function(option){
  return await Uploader(option._req, option._req.res).then(function(){ // 不要让multer做全局中间件，而只是在必要的路由上使用.

    // 2017-04-03 折腾了一下午才发现，前端发来的参数，是在 Multer 过滤后才出现！所以必须在此设置 option:
    for (var key in option._req.body){ // POST 方法传来的参数
      option[key]=wo.Tool.json2obj(decodeURIComponent(option._req.body[key]))
    }
    /////////// authentication ///////////////////
    option._token=wo.Tool.verifyToken(option._token)||{} // aiid, pwdClient, whenTokenCreated
    option._token.isOnline=function(){
      return this.onlineUser?true:false // =0或null时，代表没有登录，是匿名用户。
    }

    if (option._token.isOnline()){

      var savedFile=option._req.file

      /* 上传成功 && 存储成功 ==> 更新数据库 */
      switch (option.usage) {
        case 'PERSON_ICON':
          new wo.Person().setMe({ Person : {icon:UserFileRoot+savedFile.filename}, cond:{aiid:option._token.onlineSid}})
          break
        case 'PERSON_BGIMAGE':
          new wo.Person().setMe({ Person : {bgimage:UserFileRoot+savedFile.filename}, cond:{aiid:option._token.onlineSid}})
          break
        case 'MESSAGE_IMAGE_INOBJ': // 新建消息里的文件上传时，message还不存在，需要过滤掉这种情况。
          if (option.Message && option.Message.aiid) {
            option.Message.content.image=UserFileRoot+savedFile.filename // 这个实现，是假设/要求前端送来完整的content
            new wo.Message().setMe(option)
          }
          break
        case 'MESSAGE_IMAGE_INARRAY':
          if (option.Message && option.Message.aiid) {
            if (option.contentIndex >= coption.Message.content.length){
              option.Message.content.push({image:UserFileRoot+savedFile.filename})
            }else{
              option.Message.content[option.contentIndex]={image:UserFileRoot+savedFile.filename}
            }
            new wo.Message().setMe(option)
          }
          break
      }

      savedFile.filepath=UserFileRoot+savedFile.filename
      return savedFile
    }

    return new wo.Event().addMe({ Event : {model:'FILE', action:'UPLOAD', result:'UploaderFailed', info:{err:'offline user'} }})

  }).catch(function(err){
    return new wo.Event().addMe({ Event : {model:'FILE', action:'UPLOAD', result:'UploaderFailed', info:err }})
  })

}
