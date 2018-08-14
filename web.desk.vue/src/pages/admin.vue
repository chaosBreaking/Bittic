<template>
    <div >
        <el-container style="height: 759.2px">
            <el-header style="height:8%;text-align:right;font-size:12px;background-color:#303133;line-height:60px;">
                <h1 style="font-size:20px;color:rgb(255, 255, 255);position:absolute;margin-top:0px;left:20px">TICNode 全节点管理中心</h1>
                <el-button type="info" icon="el-icon-bell" circle  @click="viewSysInfo"></el-button>
                <el-button type="primary" @click="logOut">退出登陆</el-button>
            </el-header>
            <el-container>
                <el-aside style="width:15%; background-color:#545c64;">
                    <el-menu  style="border:0px;" background-color="#545c64" text-color="#fff" active-text-color="#ffd04b"  default-active='1'>
                        <el-menu-item @click="turnOwner" index='1'><i class="el-icon-info"></i>主人信息</el-menu-item>
                        <el-menu-item @click="turnChain" index='2'><i class="el-icon-share"></i>区块链信息</el-menu-item>
                        <el-menu-item @click="turnNode" index='3'><i class="el-icon-rank"></i>节点信息</el-menu-item>
                        <el-menu-item @click="turnWeb" index='4'><i class="el-icon-sort"></i>网络信息</el-menu-item>
                    </el-menu>
                </el-aside>
                <el-main style="background-color:#f4f4f5">
                    <router-view></router-view>
                </el-main>
            </el-container>
        </el-container>
    </div>
  
</template>

<script>
export default {
    name:'login',
    data(){
        return{

        }

    },
    methods:{
        logOut: function(){
            this.$router.push({path:'/'})
        },
        turnOwner: function(){
            this.$router.push({path:'/owner'})
        },
        turnChain: function(){
            this.$router.push({path:'/chain'})
        },turnNode: function(){
            this.$router.push({path:'/node'})
        },turnWeb: function(){
            this.$router.push({path:'/web'})
        },viewSysInfo: function(){
            this.$router.push({path:'/notification'})
        }
        

    }
   
}
</script>


<style>

</style>
