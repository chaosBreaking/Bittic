<template>
    <div>
        <el-row style="height:70px;">
            <div style="margin:20px 0 0 20px;font-size:20px;">
                <span>IP: 190.168.320.110</span> &emsp;&emsp;
                <span>端口号: 80</span>    
            </div>
        </el-row>   
        <el-row style="background-color:#f4f4f5;" >
            <el-col :span="12" style="margin-right:1%">
                <div style="background-color:white;display:flex;flex-wrap:wrap;height:100px ">
                    <div style="width:100%;margin:5px 0 0 20px"><p style="margin:0">当前全网节点数</p></div>
                    <div style="width:100%;margin-left:20px"><p style="height:50px;color:black;margin:auto;font-size:25px;">989</p></div>             
                </div>
            </el-col>
            <el-col :span="12" style="margin-right:1%">
                <div style="background-color:white;display:flex;flex-wrap:wrap;height:100px ">
                    <div style="width:100%;margin:5px 0 0 20px"><p style="margin:0">当前邻居数</p></div>
                    <div style="width:100%;margin-left:20px"><p style="height:50px;color:black;margin:auto;font-size:25px;">20</p></div>             
                </div>
            </el-col>                                                
        </el-row> 
        <el-row style="height:50px;">
            <div style="margin:5px 20px 0 20px;display:flex;align-items:center;justify-content:space-between" >
                    <p style="font-weight:bold;margin:0">我的交易</p>  
                    <el-input style="width:40%" placeholder="可输入账户地址、交易ID、区块ID"  class="input-with-select">
                        <el-button slot="append" icon="el-icon-search"></el-button>
                    </el-input>
            </div>
        </el-row>
        <el-row>
            <el-table border style="width: 100%">
                    <el-table-column prop="serial" label="序号" width="100">
                    </el-table-column>
                    <el-table-column prop="linkAdress" label="链接地址" width="400">
                    </el-table-column>
                    <el-table-column prop="linkState" label="链接状态" width="264">
                    </el-table-column>
                    <el-table-column prop="neighborAccount" label="邻居主人的账户地" width="500">
                    </el-table-column>
                </el-table>
        </el-row>
        <div class="block" style="float:right;margin-top:20px">
            <el-pagination
               
                
                :page-size="15"
                layout="total, prev, pager, next"
                :total="20"
                style="padding:2px 0 2px 0">
            </el-pagination>
        </div>      
    </div>
    
</template>

<style>
.el-row {
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
    margin-bottom: 20px;
    background-color: white;
    height: 100px;
    
}

.el-col-12{
    width: 49%
}




</style>