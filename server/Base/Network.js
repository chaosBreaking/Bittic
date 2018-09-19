const os=require('os');
const dns=require('dns');
const util=require('util');

module.exports = {
  dn2ip: async function (host){ // domain name 2 ip
    if (typeof host==='string' && host) {
      var ip=await util.promisify(dns.resolve)(host, 'A').catch(function(err){ 
        mylog.warn('WARNING : host cannot resolve to ip: '+host)
        return null
      })
      if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip[0])) {
        return ip[0]
      }
    }
    return null
  }
  ,
  isPrivateIp:function(addr){
    return /^(::f{4}:)?10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i
      .test(addr) ||
    /^(::f{4}:)?192\.168\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
    /^(::f{4}:)?172\.(1[6-9]|2\d|30|31)\.([0-9]{1,3})\.([0-9]{1,3})$/i
      .test(addr) ||
    /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
    /^(::f{4}:)?169\.254\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
    /^f[cd][0-9a-f]{2}:/i.test(addr) ||
    /^fe80:/i.test(addr) ||
    /^::1$/.test(addr) ||
    /^::$/.test(addr)
  }
  ,
  getMyIp: function() {
    var publicIp=null
    var privateIp=null
    var self=this
    try {
      var ifaces = os.networkInterfaces()
      Object.keys(ifaces).forEach(function (ifname) {
        ifaces[ifname].forEach(function (iface) {
          if ('IPv4' === iface.family && iface.internal === false) {
//            console.log('ip='+iface.address)
            if (self.isPrivateIp(iface.address)){
              privateIp=iface.address
//              console.log('privateIp='+privateIp)
            }else{
              publicIp = iface.address
//              console.log('publicIp='+publicIp)
            }
          }
        })
      })
    } catch (e) {
      console.log('ERROR in getMyIP(): '+e.message)
    }
    return publicIp||privateIp
  }
}