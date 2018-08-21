<template>
    <div>
        <div>
            <el-row type="flex">
            <el-col :span="24">
                <div >
                    <img style="vertical-align: middle; margin: 20px;" src='../assets/owner/o1.png'>地址: {{address}}
                    <el-button type="primary" @click="changeOwner">更换主人</el-button>
                </div>

            </el-col>
            </el-row>
            <el-row style="height:150px;">
                <el-col :span="24">
               <el-card class="box-card">
                    <div slot="header">
                        <span>我的账户</span>
                     </div>
                     <div >
                        <el-col :span="8" class="grid" ><div class="grid-content">
                             <img style="vertical-align: middle;" src="../assets/owner/o2.png"> 账号余额
                             <p style="height:50px;color:aquamarine;margin:auto;font-size:25px;">89090TIC
                                 <span>&thinsp;
                                 <el-button style="vertical-align: middle;" size="mini" type="primary" @click="transCoin">转账</el-button>
                                 </span>
                                 </p>
                             </div>
                             </el-col>
                             
                        <el-col :span="8"><div>
                             <img style="vertical-align: middle;" src="../assets/owner/o3.png"> 记账奖励
                             <p style="height:50px;color:aquamarine;margin:auto;font-size:25px;">3600TIC</p>
                             </div>
                             </el-col>
                        <el-col :span="8"><div>
                             <img style="vertical-align: middle;" src="../assets/owner/o4.png"> 坏账惩罚
                             <p style="height:50px;color:red;margin:auto;font-size:25px;">-600TIC</p>
                             </div>
                             </el-col>                              
                    </div>
                </el-card> 
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
                <el-table  border style="width: 100%">
                    <el-table-column prop="transID" label="交易ID" width="180">
                    </el-table-column>
                    <el-table-column prop="type" label="类型" width="124">
                    </el-table-column>
                    <el-table-column prop="sender" label="发送者" width="180">
                    </el-table-column>
                    <el-table-column prop="recepter" label="接受者" width="180">
                    </el-table-column>
                    <el-table-column prop="date" label="日期" width="180">
                    </el-table-column>
                    <el-table-column prop="amount" label="金额(TIC)" width="120">
                    </el-table-column>
                    <el-table-column prop="commissionCharge" label="手续费(TIC)" width="120">
                    </el-table-column>
                    <el-table-column prop="remarks" label="备注" width="180">
                    </el-table-column>
                </el-table>
            </el-row>
            <div class="block" style="float:right;margin-top:20px">
                <el-pagination
                    
                    
                    :page-size="13"
                    layout="total, prev, pager, next"
                    :total="85"
                    style="padding:2px 0 2px 0">
                </el-pagination>
            </div>
        </div>
    
        <div v-if="view" class="layel">
            <div  class="card" style="width:75%;margin:5%;">
                <div style="margin:2% 10% 2% 5%">
                    <p style="float:left;margin:0;width:90px">原主人密语:</p><p style="border-style:solid;width:80%;border-color:#d5ccbd;margin-left:90px">{{preSecword}}</p>
                </div>
                <div style="margin:2% 10% 2% 5%">
                    <p style="float:left;margin:0 0 0 30px;width:60px">新密语:</p><input v-model="newSecword" placeholder="请输入新密语，例如：skill loyal dove price spirit illegal bulk rose tattoo congress few amount" style="border-style:solid;height:25px;width:80%;border-color:#d5ccbd">
                </div>
                <div style="margin:2% 10% 2% 5%;height:40px">
                    <p style="border-style: solid;width:80%;border-color:rgba(253,124,176,0.61);margin:0 0 0 90px;background-color:#e3987c40;color:#aea188;"  ><span><i class="el-icon-error"></i></span>系统为您生成了足够安全的新密语，请保持在安全，私密的地方。</p>  
                 
                </div>
                <div class="divStyle">
                    <el-button style="margin-right:10%" type="primary" class="button" plain @click="backOwner">更换主人</el-button>
                </div>
            
            </div>
        
        </div>
    
    </div>
</template>

<script>
export default {
    name:'login',
    
    data(){
        return{
            view:false,
            address:'',
            preSecword:'',
            newSecword:''
            

        }

    },
    
    mounted() {
         this.address = JSON.parse(sessionStorage.getItem('user')).address
    },
    methods:{
       
        changeOwner(){
         this.view = true;
         this.preSecword = JSON.parse(sessionStorage.getItem('user')).secword
        },

        backOwner(){
         var self = this;
         if(wo.Crypto.isSecword(self.newSecword)){
             sessionStorage.removeItem("user");
             var userEntity = {
                        secword: self.newSecword,
                        pubkey: wo.Crypto.secword2keypair(self.newSecword).pubkey,
                        seckey: wo.Crypto.secword2keypair(self.newSecword).seckey,
                        address: wo.Crypto.secword2address(self.newSecword)
                    };
                    sessionStorage.setItem("user",JSON.stringify(userEntity));
                    this.address = JSON.parse(sessionStorage.getItem('user')).address;
                    self.newSecword = '';
                    

         }
         else{
             alert("您输入的密语不正确");
             self.newSecword = '';
         };
         self.view = false;
         
       
          
        },

        transCoin: function(){
            this.$router.push({path:'/transfer'})
        },

    }
   
}
</script>

<style>
.el-row {
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
    margin-bottom: 20px;
    background-color: white;
    height: 100px;
    
}
.layel {
    width: 100%;
    height: 100%;
    background-color: rgba(117,119,118,0.6);
    position: fixed;
    left: 15%;
    top: 8%;

}





</style>
