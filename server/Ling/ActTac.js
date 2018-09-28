const Action = require('./Action.js')
const Methods = ["create","transfer","exchange","mount"]
class ActTac extends Action {
  constructor(prop){
    super(prop)
  }
  
  static validater(action){
    return Methods.includes(action.method)
  }
  
  static async execute(action){
    if(action && action.method)
      switch(action.method){
        case "create": return wo.Tac.create(action)
        case "transfer": return wo.Tac.transfer(action)
        case "exchange": return wo.Tac.exchange(action)
        case "mount": return wo.Tac.mount(action)
        default:
          return null
      }
    return null
  }

}
