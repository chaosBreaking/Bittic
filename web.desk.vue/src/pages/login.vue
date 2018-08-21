<template>
    
    <div class="mainLogin">
        <div  class="card">
            <div class="divStyle" >
                <img  style="margin-top:10px" src="../assets/login/u4.png">
                <p style="font-size:20px;font-weight:bold;margin:10px">TICNode 全节点管理中心</p>
            </div>
            <div class="divStyle">
                <el-input v-model="secword" placeholder="请输入密语，例如：skill loyal dove price spirit illegal bulk rose tattoo congress few amount">
                <i slot="prefix" class="el-input__icon el-icon-search"></i>
                </el-input>
            </div>
            <div class="divStyle" id="divstyle1">
                <label><input style="vertical-align: middle;" type="radio" name="language"><img style="vertical-align: middle;" src="../assets/login/u2.png"></label>
                <label><input style="vertical-align: middle;" type="radio" name="language"><img style="vertical-align: middle;" src="../assets/login/u3.png"><br></label>
                <label style="color:#5757cb"><input  type="checkbox" style="margin-top:10px" name="loging">保持登陆</label>
            </div>
            <div class="divStyle" style="display:flex;justify-content:space-between">
                <el-button style="margin-right:10%" type="primary" class="button" @click="logIn">登陆</el-button>
                <el-button style="margin-left:10%" type="primary" class="button" plain @click="buildNewlang">创建新密语</el-button>
            </div>
            <div class="divStyle" id="divstyle2">
                <p style="font-family:微软">© 2017 Emake Tech Co.Ltd All Rights Reserved&emsp;&emsp;&emsp; 苏ICP备17015123号</p>

                
            </div>
        </div>
        <div v-if="show" style="height:100%;width:100%;background-color:rgba(16,123,67,0.6)">
            <div  class="card">
                <div style="margin:15px 0 15px 10%">
                    <p>创建新密语</p>
                </div>
                <div style="margin:15px 0 15px 10%;height:100px">
                    <p style="border-style: solid;float:left;height:100px;width:80%;border-color:#d5ccbd;margin:0px"  >{{secword}}</p>  
                </div>
                <div style="margin:15px 0 15px 10%;height:40px">
                    <p style="border-style: solid;float:left;height:50px;width:80%;border-color:rgba(239,153,10,0.61);margin:0px;background-color: cornsilk;color:#aea188;"  >
                        <span><i class="el-icon-warning"></i> 系统为您生成了足够安全的新密语，请保持在安全，私密的地方。</span><br>
                        <span><i class="el-icon-warning"></i> 新密语已自动添加到输入框，点击确认返回后可直接登陆。</span>
                    </p>
                 
                </div>
                <div class="divStyle">
                    <el-button style="margin:15px 10% 0 0" type="primary" class="button" plain @click="backLogin">确认</el-button>
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
            show:false,
            secword:"",
            

        }

    },
    methods:{
        logIn(){
            var self = this;
            self.$ajax({
                url:'http://localhost:6842/api/Account/getAccount',
                method:'post',
                data:{Account:{address:wo.Crypto.secword2address(self.secword)}}
            }).then(function (response) {
                if(response.data || wo.Crypto.isSecword(self.secword)){
                    self.$router.push('/owner');
                    var userEntity = {
                        secword: self.secword,
                        pubkey: wo.Crypto.secword2keypair(self.secword).pubkey,
                        seckey: wo.Crypto.secword2keypair(self.secword).seckey,
                        address: wo.Crypto.secword2address(self.secword)
                    };
                    
                    sessionStorage.setItem("user",JSON.stringify(userEntity));
                }
                else{
                     alert("登陆异常");
                }
            })
        },

        buildNewlang(){
         this.show = true,
         this.secword=wo.Crypto.randomSecword()

          
        },
        backLogin(){
         this.show = false
          
        }
    }
   
}
</script>


<style>
.mainLogin{
  height: 100vh;
  width: 100vw;
  background:url('../assets/login/u1.png');
  background-size: cover;
  background-repeat: no-repeat;
}

.card{
  width: 80%;
    height: 40%;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    margin: auto;
    position: absolute;
    background-color: white;
}

.divStyle{
    text-align: center;
    margin: 10px 10% 10px 10%;

}


.button{
    width: 30%;
}

#divstyle1{
    text-align: left;
    margin-left: 10%;
    margin-right: 10%;
}

#divstyle2{
    text-align: center;
    margin: 10px 10% 10px 10%;
    bottom: 0;
    left: 10%;
    right: 10%;
    color: #f2f6fc;
    position: fixed;
}


</style>
