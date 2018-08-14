<template>
    <div>
        <el-row style="height:70px;">
            <div style="margin:20px 0 0 20px;font-size:20px;">
                <span>版本号：1.0.0</span> &emsp;&emsp;
                <span>启动时间：2018-03-09 21:30:00</span>    
            </div>
        </el-row>   
        <el-row style="background-color:#f4f4f5;" >                   
            <el-col :span="12" style="margin-right:1%">
                <div style="background-color:white;display:flex;flex-wrap:wrap;height:100px ">
                    <div style="width:100%;margin:5px 0 0 20px"><p style="margin:0">用户数量</p></div>
                    <div style="width:100%;margin-left:20px"><p style="height:50px;color:aquamarine;margin:auto;font-size:25px;">800在线<span style="color:black;">/20490</span></p></div>             
                </div>
            </el-col>
            <el-col :span="12" style="margin-right:1%">
                <div style="background-color:white;display:flex;flex-wrap:wrap;height:100px ">
                    <div style="width:100%;margin:5px 0 0 20px"><p style="margin:0">获胜数量/竞选数量</p></div>
                    <div style="width:100%;margin-left:20px"><p style="height:50px;color:aquamarine;margin:auto;font-size:25px;">65次<span style="color:black;">/3080</span></p></div>             
                </div>
            </el-col>                              
        </el-row> 
        <div style="text-align: center;">
                <el-button style="margin-right:1%;width:20%;" type="primary" class="button">启动</el-button>
                <el-button style="margin-left:1%;width:20%;" type="primary" class="button" plain>停止</el-button>
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