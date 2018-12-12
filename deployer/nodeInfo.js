
const os = require('os')
module.exports = { // 全大写字母的，代表系统常量，不要在 userConfig 或命令行参数里覆盖。小写驼峰的，是用户可以覆盖的。
  id:"CSM1001",
  LEVEL: 'middle',
  HOST: null, // 本节点的从外部可访问的 IP or Hostname，不能是 127.0.0.1 或 localhost
  CORE: os.cpus().length,
  RAM: os.totalmem()/(1024 * 1024 * 1024), //GB
  BOUND: 10, //MB
  MAXCAP: 10,
}
