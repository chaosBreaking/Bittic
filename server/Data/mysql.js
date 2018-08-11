const mysql=require('promise-mysql');

var db;

module.exports={
  _init:async function(dbName){
    // 经过测试，无法通过sql调用来建立数据库，必须预先在mysql里建立
    // create the db if not exists
    // const dbName=mysqlConfig.database
    // mysqlConfig.database=undefined
    // await mysql.createConnection(mysqlConfig).then(async function(conn){
    //   let sql='CREATE DATABASE IF NOT EXISTS `'+dbName+'` DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_general_ci'
    //   return await conn.query(sql)
    //     .then(function(result){ mylog.info('database '+dbName+' is created successfully'); mylog.info(result) })
    //     .catch(console.log)
    // }).catch(console.log)
    // create pool
    // mysqlConfig.database=dbName
    wo.Config.mysql.database=dbName||wo.Config.mysql.database||'database.mysql'
    db = mysql.createPool(wo.Config.mysql); // createPool并非Promise的，可以同步返回，不需要await
    return this
  }
  ,
  createTable: async function(option){
    let sql='create table if not exists '+db.escapeId(option._table)+' (';
    for (let key in option.set){
      sql = sql+key+' '+option.set[key]+' , '
    }
    sql = sql.replace(/,\s*$/,')')
    return await db.query(sql).catch(console.log)
  }
  ,
  getNumber: async function(option) {
//mylog.info('【Mysql】 getCount( '+JSON.stringify(option)+' )');
    if (option && option._table && option.where && option.field && option.func && ['sum','avg','max','min','count'].indexOf(option.func)) {
      let sql='select '+option.func+'('+(option.field!=='*'?db.escapeId(option.field):'*')+') as '+option.func+' from '+db.escapeId(option._table)+' where '+where2sql(option.where)
//mylog.info('【Mysql】 getCount: sql= '+sql);
      return await db.query(sql).then(function(rowList){
        if (rowList && rowList[0] && rowList[0].hasOwnProperty(option.func)) {
//mylog.info('【Mysql】 getCount 》 '+JSON.stringify(rowList[0])+' >>');
          return rowList[0]; // 返回一个对象。如果只返回数字，必须先转换成string，不然result.send(数字) 会被误解为http状态码。
        }
//mylog.info('【Mysql】 getCount 》 null >>');
        return null;
      }).catch(console.log);
    }
    return null;
  }
  ,
  getData: async function(option) {
//mylog.info('【Mysql】 getData( '+JSON.stringify(option)+' )');
//    mylog.info('Data.getData: '); mylog.info(option)
    if (option && option._table && option.where) {
      let sql='select * from '+db.escapeId(option._table)+' where '+where2sql(option.where)+config2sql(option.config);
//mylog.info('【Mysql】 getData: sql= '+sql);
      try {
        let rowList=await db.query(sql);
        if (rowList) {
          wo.Tool.json2obj(rowList, 'database');
//mylog.info('【Mysql】 getData 》 '+JSON.stringify(rowList)+' >>');
          return rowList;
        }
//mylog.info('【Mysql】getData 》 null >>');
        return null;
      }catch(err){
        console.log(err)
      }
    }
    return null;
  }
  ,
  setData: async function(option) {
//mylog.info('【Mysql】 setData( '+JSON.stringify(option)+' )');
    if (option && option._table && option.where && option.set) {
      var self=this;
      var sql='update '+db.escapeId(option._table)+' set '+set2sql(option.set)+' where '+where2sql(option.where)+config2sql(option.config);
//mylog.info('【Mysql】 setData: sql= '+sql);
      return await db.query(sql).then(async function(report){
//mylog.info('【Mysql】 setData: report='+JSON.stringify(report));
        if (report && report.affectedRows>0) { // report.affectedRows/changedRows
          for (var key in option.set){
            if (key!=='whenInserted' && key!=='whenUpdated') { // 万一Ling传来的 option.set 包含 whenInserted/Updated，在 set2sql 里会被过滤掉，但在set对象里仍然存在，要过滤掉。
              option.where[key]=option.set[key]; // 把新设的值合并到原来的条件里。
            }
          }
          option.config=option.config||{};
          option.config.limit=report.affectedRows;
          var result=await self.getData(option); // todo: 万一update后，where能找到更多条目了，怎么办？
//mylog.info('【Mysql】 setData 》 '+JSON.stringify(result)+' >>');
          return result;
        }
//mylog.info('【Mysql】 setData 》 null >>');
        return null;
      }).catch(console.log);
    }
    return null;
  }
  ,
  addData: async function(option) {
//mylog.info('【Mysql】 addData( '+JSON.stringify(option)+' )');
    if (option && option._table && option.set) {
      var self=this;
      var sql='insert '+db.escapeId(option._table)+' set '+set2sql(option.set);
//mylog.info('【Mysql】 addData: sql= '+sql);
      return await db.query(sql).then(async function(report){
//mylog.info('【Mysql】 addData: report='+JSON.stringify(report));
        if (report && report.affectedRows>0) { // report.fieldCount/affectedRows/insertId/changedRows/message
          var result = await self.getData({_table:option._table,where:{aiid:report.insertId},config:{limit:1}}); // 返回数据对象
          //或者 option.set.aiid=report.insertId; return option.set; // 这样是否就不能把date/datetime/timestamp字段自动转成Date对象了？
//mylog.info('【Mysql】 addData 》 '+JSON.stringify(result)+' >>');
          return result;
        }
//mylog.info('【Mysql】 addData 》 null >>');
        return null;
      }).catch(console.log);
    }
    return null;
  }
  ,
  hideData: async function(option) { // 或者叫做 delete, remove, erase, cut, drop
//mylog.info('【Mysql】 hideData( '+JSON.stringify(option)+' )');
    if (option && option._table && option.where && option.set) {
      var self=this;
      var sql='update '+db.escapeId(option._table)+' set `mark`='+db.escape(wo.Config.MARK_DELETED)+' where '+where2sql(option.where)+config2sql(option.config);
//mylog.info('【Mysql】 hideData: sql= '+sql);
      return await db.query(sql).then(async function(report){
        if (report) { // report.affectedRows/changedRows
          option.where.mark=wo.Config.MARK_DELETED;
          option.config=option.config||{};
          option.config.limit=report.affectedRows;
          return await self.getData({_table:option._table, where:option.where, config:option.config}); // todo: 万一update后，where能找到更多条目了，怎么办？
        }
        return null;
      }).catch(console.log);
    }
    return null;
  }
  ,
  callProc: async function(option) {
// http://localhost:6327/Person_getAllCall?person[aiid]=100000000019&param=[100000000019]&_func=getAllFriends
    function param2sql(param){
      var sqlParam=''
      if (param && Array.isArray(param)) {
        for (var v of param){
          sqlParam+= db.escape(v) + ' , '
        }
      }
      return sqlParam.replace(/,\s*$/,'')
    }
    if (option && typeof option._proc==='string') {
      var sql='call '+db.escapeId(option._proc)+' ( ' + param2sql(option.param) + ' ) '; 
      return await db.query(sql).then(function(resultList){
        if (resultList && Array.isArray(resultList[0])) { // 存储过程返回一个数组 [ rows, report ]
          wo.Tool.json2obj(resultList[0], 'database')
//mylog.info('【Mysql】 getData 》 '+JSON.stringify(rowList)+' >>');
          return resultList[0]
        }
//mylog.info('【Mysql】getData 》 null >>');
        return null
      }).catch(console.log)
    }
    return null
  }

}

function value2sql(value){ // value 有可能是 Date 类型！Number(一个Date) 会返回毫秒数，造成比较错误。
  if (typeof value==='string' && Number(value)===Number(value)) return Number(value); // 注意在json字段内部作比较时，数字和字符不能通用，5 和 '5' 无法相等。太奇怪了，等mysql改进。
  else return db.escape(value); // undefined 和 null 会被 escape 成 'NULL' 字符串。而 'null' 字符串会被escape成'\'null\'' 字符串。https://github.com/mysqljs/mysql#escaping-query-values
}

function where2sql(where){ // todo: 注意，mysql 无法比较整个json字段！不能 where json='{}'！！！
  var sqlWhere='true';
  var matches, value;
  where=where||{};
  if (where.aiid){ // 这是特别为了防止，setData 内的再次 getData 时从set转化成的where 里有 json 字段。
    sqlWhere = db.escapeId('aiid') + ' = ' + db.escape(where.aiid);
    if (where.mark===('!='+wo.Config.MARK_DELETED)) {
      sqlWhere += ' AND (mark is null or mark != '+db.escape(wo.Config.MARK_DELETED)+') ';
    }
  }else{
    for (var key in where){
  //    if (typeof key==='string' && key.match(/^_/)) continue; // 避免express3的query/body发来奇怪的 {..., __proto__:{}}，并且过滤掉_class, _data等（假如前端没有过滤掉这些）。

      value=where[key];
      if (value===undefined || value!==value || value===Infinity) continue; // 把undefined/NaN/Infinity值认为是不需要处理的。undefined会被escape成'NULL'，NaN/Infinity会导致mysql出错。
      else if (typeof value==='object' && value!==null && !(value instanceof Date)) value=JSON.stringify(value); // 不要修改 Date，让 db.escape 去转化成 'YYYY-mm-dd HH:ii:ss'，否则 MySQL 无法识别 'YYYY-mm-ddTHH:ii:ss.mmmZ' 格式。
      else if (typeof value==='boolean') value=value.toString();
    
      key=db.escapeId(key);
      sqlWhere += ' AND ';
      if (value===null){ // 问题：前端直接ajax发送对象，null会被变成空字符串''（即xxx:null 被翻译成 xxx=&)，所以不能送来null。解决方案1：在前端发送前JSON.stringify。 2. 在这里允许 value==='=null'
        sqlWhere += key+' is null ';
      }else if (value==='!=null'){
        sqlWhere += key+' is not null ';
      }else if (typeof value==='string' && (matches=value.match(/^!=\s*(.*)$/))){ // 注意，\w* 不能接受 - . 这种数字里的符号。
        sqlWhere += ' ('+key+' is null or '+key+' != '+value2sql(matches[1])+') ';
      }else if (typeof value==='string' && (matches=value.match(/^([<>]=?)\s*(.*)\s*([<>]=?)\s*(.*)$/))){ // 要放在单一的[<>]前面，否则match不到。
        sqlWhere += key+matches[1]+value2sql(matches[2])+' AND '+key+matches[3]+value2sql(matches[4]);
      }else if (typeof value==='string' && (matches=value.match(/^([<>]=?)\s*(.*)$/))){
        sqlWhere +=  key+matches[1]+value2sql(matches[2]); // 注意不要对比较符号去做escape! 否则sql字符串里变成 ...'>'... 就错了。
      }else if (typeof value==='string' && (matches=value.match(/^~\s*(.*)$/))){
        sqlWhere += key+' REGEXP '+value2sql(matches[1]);
      }else if (typeof value==='string' && (matches=value.match(/^(\$[.\[].+)([<>=])(.*)$/))){
        sqlWhere += key+'->"'+matches[1]+'"'+matches[2]+value2sql(matches[3]);
      }else{
        sqlWhere += key+' = '+value2sql(value);
      }
    }
  }
  return sqlWhere;
}

function set2sql(set){ // 把js对象预备存入数据库
  var sqlSet=''
  var value
  set=set||{}
  for (var key in set){
//    if (typeof key==='string' && key.match(/^_/)) continue; // 避免express3的query/body发来奇怪的 {..., __proto__:{}}，并且过滤掉_class, _data等（假如前端没有过滤掉这些）。
    if (key==='whenUpdated' || key==='whenInserted') continue;

    value=set[key];
    if (value===undefined || value!==value || value===Infinity) continue; // 把undefined/NaN/Infinity值认为是不需要处理的。undefined会被escape成'NULL'，NaN/Infinity会导致mysql出错。
    else if (typeof value==='object' && value!==null && !(value instanceof Date)) value=JSON.stringify(value);
    else if (typeof value==='boolean') value=value.toString(); // db.escape(true/false)==='true/false'，而true/false在mysql里被认作1/0，完全不同，所以禁止这样转换，而是强制转换成字符串。
//    else if (value==='=null') value=null;

    sqlSet += db.escapeId(key)+' = '+db.escape(value) + ' , ' 
  }
  return sqlSet.replace(/,\s*$/,'')
}

function config2sql(config){
  var sqlConfig=''
  if (config && typeof config==='object'){
    if (config.group){
      sqlConfig += ' group by '+config.group;
    }
    if (config.order){
      switch (config.order){
        case 'random': sqlConfig += ' order by rand()'; break;
        default: sqlConfig += ' order by '+config.order;
      }
    }
    if (1<=parseInt(config.limit) && parseInt(config.limit)<=wo.Config.LIMIT_MAX){
      sqlConfig += ' limit '+parseInt(config.limit);
    }else if (wo.Config.LIMIT_MAX<parseInt(config.limit)){
      sqlConfig += (' limit '+wo.Config.LIMIT_MAX);
    }else{
      sqlConfig += ' limit '+wo.Config.LIMIT_DEFAULT;
    }
  }else{
    sqlConfig += ' limit '+wo.Config.LIMIT_DEFAULT;
  }
  return sqlConfig;
}
