const Action = require('./Action.js')
const Methods = ["create","transfer","exchange","mount"]
function actValidater(action){
  switch(action.method){
    case "create":
      if( action.name && action.symbol && action.decimals && Number.isSafeInteger(Number(action.decimals)) && !await wo.Tac.getOne({Tac:{name:action.name,symbol:action.symbol}}))    
        return true
    case "transfer":  
      return true
    case "exchange":
      return true
    case "mount":
      return true
    default:
      return null
  }
}

class ActTac extends Action {
  constructor(prop){
    super(prop)
    Object.defineProperty(this,"_class",{
      value:"ActTac",
      enumerable:true,
      writable:false
    })  
  }
  static validater(action){
    return Methods.includes(action.method) && actValidater(action)
  }
  
  static async execute(action){
    if(action && action.method){
      let res
      switch(action.method){
        case "create":
          return await wo.Tac.create(action);
        case "transfer":
          //内部交易，转发到应用链进程来处理
          return wo.Tac.transfer(action)
        case "exchange": 
          //Bancor类型
          return wo.Tac.exchange(action)
        case "mount":
          return wo.Tac.mount(action)
        default:
          return 0
      }
    }
    return 0
  }
}

