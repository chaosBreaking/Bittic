<template>
<div>
<el-table
    ref="singleTable"
    stripe
    :data="tableData"
    highlight-current-row
    style="width: 100%"
    border
    height="490"
    >
    <el-table-column
      type="index"
      label=" "
      width="50">
    </el-table-column>
    <el-table-column
      prop="type"
      label="Type "
      width="60">
    </el-table-column>
    <el-table-column
      prop="id"
      label="Transaction ID"
      width="190">
    </el-table-column>
    <el-table-column
      prop="senderId"
      label="SenderID"
      width="195"
      >
    </el-table-column>
    <el-table-column
      prop="recipientId"
      label="RecipientId"
      width="195"
      >
    </el-table-column>
    <el-table-column
      prop="timestamp"
      label="Timestamp"
      sortable
      width="130"
      >
    </el-table-column>
    <el-table-column
      prop="amount"
      sortable
      label="Amount"
      width="115"
      >
    </el-table-column>    
    <el-table-column
      prop="fee"
      label="Fee"
      width="50">
    </el-table-column>
  </el-table>  
</div>
</template>
<script>
  export default {
    data() {
      return {
        tableData: []
      }
    },
    mounted(){
        var self = this;

        setTimeout(() => {
                            $.ajax({
                                type : "GET",
                                url : "http://node1.bittic.net:6842/api/transactions?orderBy=t_timestamp:desc",
                                success : function(data) {
                                    self.tableData = data.transactions
                                    var i;
                                    for (i=0;i<100;i++)
                                      {
                                        self.tableData[i]['amount'] = self.tableData[i]['amount']/100000000
                                        self.tableData[i]['fee'] = self.tableData[i]['fee']/100000000
                                        switch (self.tableData[i].type)
                                          {
                                              case 0: self.tableData[i].type='主链转账';
                                                        break;
                                              case 1: self.tableData[i].type='设置二级密码';
                                                        break;
                                              case 2: self.tableData[i].type='注册受托人';
                                                        break;
                                              case 3: self.tableData[i].type='受托人投票';
                                                        break;
                                              case 4: self.tableData[i].type='多重签名';
                                                        break;
                                              case 5: self.tableData[i].type='DAPP注册';
                                                        break;        
                                              case 6: self.tableData[i].type='DAPP充值';
                                                        break;
                                              case 7: self.tableData[i].type='DAPP提现';
                                                        break;
                                              case 8: self.tableData[i].type='文件存储';
                                                        break;          
                                              case 9: self.tableData[i].type='发行商注册';
                                                        break;      
                                              case 10: self.tableData[i].type='注册资产';
                                                        break;        
                                              case 11: self.tableData[i].type='资产设置';
                                                        break;         
                                              case 13: self.tableData[i].type='资产发行';
                                                        break;                
                                              case 14: self.tableData[i].type='资产转账';
                                                        break;  
                                              default: ;

                                          }
                                      }
                                },
                                error : function(){
                                }
                            });
                        }, 20);
       
    },
        methods: {

    }
  }
</script>