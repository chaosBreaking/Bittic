<template>
    <div>
        <el-row style="height:70px;">
            <div style="margin:20px 0 0 20px;font-size:20px;">
                <span>当前高度：104345</span> &emsp;&emsp;
                <span>创世时间：2018-01-09 06:06:00</span>    
            </div>
        </el-row>
        <el-row style="height:50px;">
            <div style="margin:5px 20px 0 20px;display:flex;align-items:center;justify-content:space-between" >
                    <p style="font-weight:bold;margin:0">区块链信息</p>  
                    <el-input style="width:40%" placeholder="可输入账户地址、交易ID、区块ID" v-model="input5" class="input-with-select">
                        <el-button slot="append" icon="el-icon-search"></el-button>
                    </el-input>
                </div>
        </el-row>
        <el-row>
            <el-table :data="tableData" border style="width: 100%">
                <el-table-column prop="height" label="高度" width="56">
                </el-table-column>
                <el-table-column prop="timeStamp" label="时间戳" width="70">
                </el-table-column>
                <el-table-column prop="blockType" label="区块类型" width="80">
                </el-table-column>
                <el-table-column prop="blockID" label="区块ID" width="70">
                </el-table-column>
                <el-table-column prop="date" label="获胜的记账节点" width="120">
                </el-table-column>
                <el-table-column prop="amount" label="获胜的抽签用户" width="120">
                </el-table-column>
                <el-table-column prop="commissionCharge" label="获胜用户签名" width="110">
                </el-table-column>
                <el-table-column prop="rewardForWinner" label="获胜用户奖励(TIC)" width="140">
                </el-table-column>
                <el-table-column prop="rewardForNode" label="获胜节点奖励(TIC)" width="140">
                </el-table-column>
                <el-table-column prop="innerBizNumber" label="内涵事物数" width="100">
                </el-table-column>
                <el-table-column prop="totalBizAmount" label="事务总金额(TIC)" width="130">
                </el-table-column>
                <el-table-column prop="BizTransFee" label="事务手续费(TIC)" width="130">
                </el-table-column>
            </el-table>
        </el-row>
        <div class="block" style="float:right;margin-top:20px;">
            <el-pagination
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
                :current-page.sync="currentPage4"
                :page-sizes="[10, 20, 30, 40]"
                :page-size="10"
                :total="90"
                layout="sizes, prev, pager, next, jumper"
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



</style>