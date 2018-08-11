<template>
  <div class="main">
    <el-row type="flex">
      <el-col :span="24">    
        <div style="width:100%">
          <el-form :model="queryinfo" ref="queryinfo" status-icon class="demo-ruleForm" label-position="top">
            <el-input placeholder="查询交易或者区块信息" clearable v-model="queryinfo.info">
                <el-button slot="append" icon="el-icon-search" @click="query_transaction"></el-button>
            </el-input>
          </el-form>
        </div>
      </el-col>   
    </el-row>
    
    <h1>{{ msg }}</h1>
    <el-row type="flex" justify="center" :gutter="0">
      <el-col :xs="24" :sm="20" :md="10" :lg="10" :xl="10">
          <el-card :body-style="{ padding: '0px' }">
              <div style="padding: 24x;">
                  <div style="width:80%;padding:5%">
                      <el-form :model="ruleForm2" status-icon :rules="rules2" ref="ruleForm2" class="demo-ruleForm" label-position="top">
                        <el-form-item label="发送目的地址" prop="address">
                            <el-input type="text" v-model="ruleForm2.address" auto-complete="off"></el-input>
                        </el-form-item>
                        <el-form-item label="发送金额" prop="amount">
                            <el-input v-model.number="ruleForm2.amount"></el-input>
                        </el-form-item>
                        <el-form-item>
                          <el-row :gutter="100">
                            <el-col :xs="{span: 2, offset: 0}" :sm="{span: 2, offset: 0}" :md="{span: 2, offset: 0}" :lg="3" :xl="3">
                              <el-button type="primary" @click="submitForm('ruleForm2')">提交</el-button>
                            </el-col>
                            <el-col :xs="{span: 1, offset: 0}" :sm="{span: 1, offset: 0}" :md="{span: 2, offset: 2}" :lg="{span: 2, offset: 2}" :xl="{span: 2, offset: 2}">
                            <el-button @click="resetForm('ruleForm2')">重置</el-button>
                            </el-col>
                          </el-row>
                        </el-form-item>
                      </el-form>
                  </div>
              </div>
          </el-card>
      </el-col>
      <el-col :xs="{span: 26, offset:0}" :sm="{span: 20, offset:0}" :md="{span: 11, offset: 1}" :lg="{span: 12, offset: 2}" :xl="10">
          <el-card :body-style="{ padding: '0px' }">
              <div style="padding: 20px;">
                <div style="width:100%;padding:0px;height:100%">
                  <el-table
                    :data="recentTrans"
                    style="width: 100%"
                    :row-class-name="tableRowClassName"
                    max-height="290"
                    :default-sort = "{prop: 'timestamp', order: 'descending'}"
                    >
                    <el-table-column type="expand">
                      <template slot-scope="props">
                        <el-form label-position="left" inline class="demo-table-expand">
                          <el-form-item label="交易ID">
                            <span>{{ props.row.id }}</span>
                          </el-form-item>
                          <el-form-item label="区块高度">
                            <span>{{ props.row.height }}</span>
                          </el-form-item>
                          <el-form-item label="区块ID">
                            <span>{{ props.row.blockId }}</span>
                          </el-form-item>
                          <el-form-item label="交易类型">
                            <span>{{ props.row.type }}</span>
                          </el-form-item>
                          <el-form-item label="发送方ID">
                            <span>{{ props.row.senderId }}</span>
                          </el-form-item>
                          <el-form-item label="时间戳">
                            <span>{{ props.row.timestamp }}</span>
                          </el-form-item>
                          <el-form-item label="接受方ID">
                            <span>{{ props.row.recipientId }}</span>
                          </el-form-item>
                        </el-form>
                      </template>
                    </el-table-column>

                    <el-table-column
                      prop="type"
                      label="交易类型"
                      width="100">
                    </el-table-column>
                    <el-table-column
                      prop="height"
                      label="区块高度"
                      width="100">
                    </el-table-column>
                    <el-table-column
                      prop="timestamp"
                      label="时间戳"
                      width="110">
                    </el-table-column>
                    <el-table-column
                      prop="amount"
                      label="金额"
                      width="130">
                    </el-table-column>
                  </el-table>
                </div>
              </div>
          </el-card>
      </el-col>
    </el-row>

  </div>
  
</template>

<script>
export default {
  name: "index",

  data() {
        var checkAmount = (rule, value, callback) => {
          if (!value) {
            return callback(new Error('发送数额不能为空'));
          }
          setTimeout(() => {
            if (!Number.isInteger(value)) {
              callback(new Error('请输入数字值'));
            } else {
                callback();
                this.toAmount = value
            }
          }, 1000);
      };
        var validateAddress = (rule, value, callback) => {
          if (!value) {
            callback(new Error('请输入发送地址'));
          } else {
            var pre = parseInt(value.substring(0,value.split("").length-1))
            var end = value.charAt(value.length - 1)
            if (value.length<33) {
              callback(new Error('不合法的地址'));
            }
            this.toAddress = value
            sessionStorage.setItem("toa",value)
            callback();
          }
        };

    return {
      recentTrans:[],
      toAddress:0,
      toAmount:'',
        queryinfo: {
          info: ''
        },
      ruleForm2: {
            address: '',
            amount: ''
          },
          rules2: {
            address: [
              { validator: validateAddress, trigger: 'blur' }
            ],
            amount: [
              { validator: checkAmount, trigger: 'blur' }
            ]
          },
        msg: "Blockchain BOX",
        // recentTrans : {},
        currentDate:new Date()
    };
  },
  mounted(){
    this.query_transaction()
  },
  methods: {
      submitForm(formName) {
        this.$refs[formName].validate((valid) => {
          if (valid) { 
            // alert('submit!');//验证完成后进行转账
            this.creat_transaction()
            this.$refs[formName].resetFields();
          } else {
            console.log('error submit!');
            return false;
          }
        });
      },
      resetForm(formName) {
        this.$refs[formName].resetFields();
      },
      query_transaction(){
                var self = this
                $.ajax({
                    type : "GET",
                    url : "http://node1.bittic.net:6842/api/transactions?senderId="+sessionStorage.getItem("address")+"&recipientId="+sessionStorage.getItem("address"),
                    success : function(data) {
                      // alert(this.$refs.queryinfo)
                      // self.recentTrans = data.transactions
                      // console.log(data.transactions[0].amount)
                      var count = data.count
                      var i
                      self.recentTrans = data.transactions
                      for (i=0;i<count;i++){                        
                        self.recentTrans[i].amount = self.recentTrans[i].amount/100000000
                        switch (self.recentTrans[i].type)
                        {
                            case 0: self.recentTrans[i].type='主链转账';
                                      break;
                            case 1: self.recentTrans[i].type='设置二级密码';
                                      break;
                            case 2: self.recentTrans[i].type='注册受托人';
                                      break;
                            case 3: self.recentTrans[i].type='受托人投票';
                                      break;
                            case 4: self.recentTrans[i].type='多重签名';
                                      break;
                            case 5: self.recentTrans[i].type='DAPP注册';
                                      break;        
                            case 6: self.recentTrans[i].type='DAPP充值';
                                      break;
                            case 7: self.recentTrans[i].type='DAPP提现';
                                      break;
                            case 8: self.recentTrans[i].type='文件存储';
                                      break;          
                            case 9: self.recentTrans[i].type='发行商注册';
                                      break;      
                            case 10: self.recentTrans[i].type='注册资产';
                                      break;        
                            case 11: self.recentTrans[i].type='资产设置';
                                      break;         
                            case 13: self.recentTrans[i].type='资产发行';
                                      break;                
                            case 14: self.recentTrans[i].type='资产转账';
                                      break;  
                            default: ;

                        }
                      }
                      // self.changetype(data.transactions,count);
                    },
                    error : function(){
                        console.log("retry")
                       
                    }
                });
              },
        changetype(rawdata,count){
          var i
          for (i=0;i<count;i++)
            {
              rawdata[i].amount = rawdata[i].amount/100000000
              switch (rawdata[i].type)
              {
                case 0: rawdata[i].type='主链转账';
                          break;
                case 6: rawdata[i].type='DAPP充值';
                          break;
                case 7: rawdata[i].type='DAPP提现';
                          break;
                case 8: rawdata[i].type='文件存储';
                          break;          
                case 9: rawdata[i].type='发行商注册';
                          break;      
                case 10: rawdata[i].type='资产存储';
                          break;                
                case 13: rawdata[i].type='资产发行';
                          break;                
                case 14: rawdata[i].type='UIA转账';
                          break;  
                default: rawdata[i].type='其他';

              }
            }
            this.recentTrans = rawdata
        },
       tableRowClassName({row,type}) {
        if (type === 0) {
          return 'warning-row';
        } else if (type === 2) {
          return 'success-row';
        }
        return '';     
        },
      creat_transaction(){
                var self = this
                // console.log(self.toAmount)
                // console.log(self.toAddress)
                var trs =  {}
                trs.secret = sessionStorage.getItem('password')
                trs.amount = parseInt(self.toAmount+'00000000')
                trs.recipientId = self.toAddress
                trs.publicKey = sessionStorage.getItem('pubkey')
                console.log(trs.recipientId)
                var xmlhttp;
                if (window.XMLHttpRequest)
                      {
                      // IE7+, Firefox, Chrome, Opera, Safari 浏览器执行代码
                      xmlhttp=new XMLHttpRequest();
                      }
                      else
                      {
                      // IE6, IE5 浏览器执行代码
                        xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
                      }
                        xmlhttp.onreadystatechange=function()
                      {
                      if (xmlhttp.readyState==4 && xmlhttp.status==200)
                      {
                        var res = JSON.parse(xmlhttp.responseText);
                        if (res['success'])
                        {
                          alert('交易成功：\n'+'交易编号: '+res['transactionId']);
                          self.query_transaction()
                          return false;	
                        }
                        else
                        {
                          alert('交易失败：\n'+res["error"].replace('LSK','CBCoin'));
                          return false;
                        }
                      }
                      }
                      xmlhttp.open("PUT","http://node1.bittic.net:6842/api/transactions",false);
                      xmlhttp.setRequestHeader("Content-type","application/json");
                      xmlhttp.send(JSON.stringify(trs));
                      return false;
                                // console.log(this.$refs.queryinfo.model.info)
                      self.query_transaction()
                              },                  
                  }
                };
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.el-row {
   flex-wrap:wrap
}
h1,
h2 {
  font-weight: normal;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
  .el-table .warning-row {
    background: oldlace;
  }

  .el-table .success-row {
    background: #f0f9eb;
  }
    .demo-table-expand {
    font-size: 0;
  }
  .demo-table-expand span {
    width: 20px;
    color: #2d62ac;
  }
  .demo-table-expand .el-form-item {
    margin-right: 0;
    margin-bottom: 0;
    width: 90%;
    color:rgb(5, 7, 15);
    word-break: break-all;
  }

</style>
