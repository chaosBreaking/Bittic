<template>
  <div id="ap">
    <el-container style="height: 590px;">
          <el-header style="text-align: right; font-size: 12px">
            <el-dropdown @command="handleCommand">
              <el-button class="share-button" icon="el-icon-info" type="primary"></el-button>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="balance">查看余额</el-dropdown-item>
                <el-dropdown-item command="myinfo">个人信息</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
            <el-button type="primary" @click="login">{{state}}<i class="el-icon-loading el-icon--right"></i></el-button>
          </el-header>
      <el-container>
        
      <el-aside width="201px">
        <el-menu class="el-menu-vertical-demo" unique-opened router>
          <el-menu-item index="index">
            <template slot="title"><i class="el-icon-news"></i>首页</template>
          </el-menu-item> 
          <el-menu-item index="exchange">
            <template slot="title"><i class="el-icon-sort"></i>交易中心</template>
          </el-menu-item>
          <el-menu-item index="blocksinfo">
            <template slot="title"><i class="el-icon-setting"></i>区块信息</template>
          </el-menu-item>
          <el-menu-item index="token">
            <template slot="title"><i class="el-icon-edit-outline"></i>资产发行</template>
          </el-menu-item>
        </el-menu>
      </el-aside>
        
      <el-main style="background-color:#fff">
        <router-view></router-view>
      </el-main>

      </el-container>
    </el-container>
  </div>
</template>

<script>

  export default {
    name: 'app',
    data: function (){
      return {
        active:true,
        isCollapse: false,
        state:"登录",
        balance:''
      }
    },
    watch:{
      "$route" : 'checkLogin'
    },
    created() {
      this.checkLogin();
    },
    mounted(){
  //组件开始挂载时获取用户信息
      this.getUserInfo();
      // console.log( this.$router.app._route.path)   //获取当前页面路径
      if (this.$router.app._route.path === "index"||this.$router.app._route.path === "/")
        this.$router.push('/index');
  },
  methods:{
      checkLogin(){
      //检查是否存在session
      if(!sessionStorage.getItem('seckey')){
        //如果没有登录状态则跳转到登录页
        this.$router.push('/login');
        this.$data.state = "登录"
      }
      else
       {
         this.$data.state = "注销"
        }
    },
      login() {
        if (this.$data.state == "注销"){      
          this.$confirm('此操作将注销当前账号', 'TicHub', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        }).then(() => {
          this.$data.state = "登录"
          sessionStorage.removeItem("password")
          sessionStorage.removeItem("pubkey")
          sessionStorage.removeItem("seckey")
          sessionStorage.removeItem("address")
          sessionStorage.removeItem("state")
          this.$router.push('/login');
          this.$message({
            type: 'success',
            message: '已注销'
          });
        }).catch(() => {
          this.$message({
            type: 'info',
            message: '已取消操作'
          });          
        });
      }
      else
      this.$prompt('请输入密钥来登录TicHub', 'TicHub', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputErrorMessage: '输入的密钥不正确',
        inputValidator:this.CheckSeckey(),
        center: true
      }).then(({ value }) => {
        if(!tic.Crypto.secword2keypair(value)){
            this.$message({
            type: 'error',
            message: '登录失败：错误的密钥'
          });
        }else{
          sessionStorage.setItem("password",value)
          sessionStorage.setItem("pubkey",tic.Crypto.secword2keypair(value).pubkey);
          sessionStorage.setItem("seckey",tic.Crypto.secword2keypair(value).seckey);
          sessionStorage.setItem("address",tic.Crypto.secword2address(value));
          sessionStorage.setItem("state","user")
          this.$data.state = "注销"
          this.$router.push('/index');
          this.$message({
            type: 'success',
            message: '登陆成功'
          });
        }
      }).catch(() => {
          this.$message({
            type: 'info',
            message: '登录失败'
          });
      });
    },
      getUserInfo(){
      return this.userInfo = {
          pubkey:sessionStorage.getItem('pubkey'),
          seckey:sessionStorage.getItem('seckey')
        }
      },
      CheckSeckey(){
        // console.log(prompt.value)
        // // if(tic.Crypto.secword2keypair(value)=="null")
        //   return "false"

      }
      ,
      handleCommand(command) {
      if(sessionStorage.getItem("state")==="user")
    {        //console.log(command)
         var title=""
         var info={}
         if(command === "balance")
          {        
            var self = this
            $.ajax({
                    type : "GET",
                    url : "http://node1.bittic.net:6842/api/accounts/getbalance?address="+sessionStorage.getItem("address"),
                    success : function(data) {
                      self.balance = data.balance/100000000
                                self.$notify({
                                title: '当前余额:',
                                message: data.balance/100000000+' TIC',
                                duration: 0,
                                type: 'success',
                                dangerouslyUseHTMLString:true,
                                offset: 100
                              });
                    },
                    error : function(){
                        // console.log("retry")
                       
                    }
                });
            // title = '当前余额:'
            // info = self.$data.balance
            
          }
         else
         {
            title = '账号信息:'
            info = '<font color="red">PublicKey</font><div style="width:100%;word-wrap:break-word;word-break:break-all;"><a>'+ sessionStorage.getItem("pubkey")+"<br>"+"</div><font color='red'>ID</font>"+'<div style="width:100%;word-wrap:break-word;word-break:break-all;">'+tic.Crypto.pubkey2address(sessionStorage.getItem("pubkey")+'</div>')
          this.$notify({
          title: title,
          message: info,
          duration: 0,
          // type: 'success',
          dangerouslyUseHTMLString:true,
          offset: 100
        });
         }
        }
        else
        {
          this.$notify({
          title: '非法操作',
          message: '请登录！',
          duration: 0,
          type: 'error',
          offset: 100
        });
        }
      }
    
  }
}
</script>

<style>
  .el-menu-vertical-demo:not(.el-menu--collapse) {
    width: 200px;
    min-height: 400px;
  }
      .el-header {
        background-color: #583e7e;
        color: #333;
        line-height: 60px;
      }
      
      .el-aside {
        color: #333;
      }

    </style>
