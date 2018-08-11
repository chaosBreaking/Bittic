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
      prop="height"
      label="Height"
      sortable
      width="120">
    </el-table-column>
    <el-table-column
      prop="id"
      label="ID"
      width="250">
    </el-table-column>
    <el-table-column
      prop="age"
      label="Age"
      width="125">
    </el-table-column>
    <el-table-column
      prop="numberOfTransactions"
      label="Transactions"
      sortable
      width="135"
      >
    </el-table-column>
    <el-table-column
      prop="timestamp"
      label="Timestamp (utc)"
      width="190"
      >
    </el-table-column>
    <el-table-column
      prop="reward"
      sortable
      label="Reward">
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
        this.open()
        setTimeout(() => {
                            $.ajax({
                                type : "GET",
                                url : "http://node1.bittic.net:6842/api/blocks",
                                success : function(data) {
                                    self.tableData = data.block
                                    var i;
                                    for (i=0;i<100;i++)
                                      self.tableData[i]['age'] = (self.tableData[0]['timestamp']-self.tableData[i]['timestamp'])+" s"
                                },
                                error : function(){
                                    console.log("retry")
                                    setTimeout();
                                }
                            });
                        }, 20);
            setInterval(() => { 
            $.ajax({
                                type : "GET",
                                url : "http://node1.bittic.net:6842/api/blocks?orderBy=height:desc",
                                success : function(data) {
                                    self.tableData = data.blocks
                                    var i;
                                    for (i=0;i<100;i++)
                                      self.tableData[i]['age'] = (self.tableData[0]['timestamp']-self.tableData[i]['timestamp'])+" s"
                                  
                                },
                                error : function(){
                                    console.log("请检查网络连接是否正常");
                                    return false;
                                }
                            });
                        }, 1000);
       
    },
    methods: {
      open() {
        this.$message({showClose: true,message:'区块数据实时更新',duration:2000});
      },
      setCurrent(row) {
        this.$refs.singleTable.setCurrentRow(row);
      },
      handleCurrentChange(val) {
        this.currentRow = val;
      },
    },
    
  }
</script>