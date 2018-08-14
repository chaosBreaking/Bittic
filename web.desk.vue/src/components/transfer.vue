<template>
    <el-card class="box-card" style="height:100%">
        <div slot="header">
            <el-button type="info" icon="el-icon-back" style="padding:9px;background-color:white;color:black" circle  onclick="window.history.go(-1)"></el-button>
            <span>转账</span>
        </div>
        <div>
            <div style="margin-top:2%">
                <p style="float:left;margin:0;width:90px">我的地址:</p>
                <p style="height:10%;width:80%;margin-left:90px">ANMd5o4pAAnv2vuF2u35Bt9KaSfPKSMXfb
                </p>
            </div>
            <div style="margin-top:2%">
                <p style="float:left;margin:0;width:90px">接收地址:</p>
                <input type="text" style="border-style:solid;height:30px;width:80%;border-color:#d5ccbd;padding:0" placeholder="请输入接收地址">
            </div>
            <div style="margin-top:2%">
                <p style="float:left;margin:0;width:90px">转账金额:</p>
                <input type="text" style="border-style:solid;height:30px;width:80%;border-color:#d5ccbd;padding:0" placeholder="请输入转账金额">
            </div>
            <div style="margin-top:2%">
                <p style="float:left;margin:0;width:90px">转账手续费:</p>
                <input type="text" style="border-style:solid;height:30px;width:80%;border-color:#d5ccbd;padding:0" placeholder="请输入转账手续费">
            </div>
            <div style="margin-top:2%">
                <p style="float:left;margin:0;width:90px">备注:</p>
                <textarea type="text" style="border-style:solid;height:100px;width:80%;border-color:#d5ccbd;padding:0"></textarea>
            </div>
            <div style="text-align:center;margin-top:2%">
                <el-button style="margin-right:1%;width:20%;" type="primary" class="button">提交</el-button>
        </div>
        </div>
    </el-card>
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